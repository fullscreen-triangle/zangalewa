//! The generation loop: (dslId, instructions) -> chunks that compile.
//!
//! Mirrors `zoom-climb/src/lib/dsl/generate.ts`. Four steps, and nothing else:
//!
//!   ground   — inject the DSL's grammar pack into the system prompt
//!   generate — ask a model for a draft
//!   validate — hand the draft to the module's own compiler
//!   repair   — feed the compiler's error back, verbatim, and try again
//!
//! The loop terminates on a compiler verdict, never on a judgement about
//! meaning. Every draft that compiles is returned; none is preferred.

use crate::packs::build_pack_context;
use crate::providers::{available_providers, get_provider, GenerateArgs, Provider};
use crate::registry::get_dsl;
use crate::types::*;
use std::time::{Duration, Instant};

/// Base unit for the whole-request budget (used as `DEFAULT_TIMEOUT_MS * 4`
/// below), NOT a per-call ceiling — see the note in `produce_draft`.
///
/// The budget has to be generous because the first call against an uncached
/// grounding pack legitimately takes ~124s; see the keep_alive note in
/// `providers.rs`. A caller that has warmed the right extent can pass a much
/// tighter `timeout_ms`.
const DEFAULT_TIMEOUT_MS: u64 = 50_000;
const DEFAULT_MAX_REPAIRS: u32 = 3;
const DEFAULT_DRAFTS: u32 = 1;

/// The system prompt. Extent branches BEFORE the grounding pack, which means
/// script and chunk prompts share only their opening clause — a script-warmed
/// prefix cache does nothing for a chunk request and vice versa. That is
/// measured, not theoretical: a first chunk generation against a script-warmed
/// prefix took 91.7s; against a chunk-warmed prefix, 14.9s. Any warming path
/// must warm the extent it will actually use.
pub fn build_system_prompt(label: &str, extent: Extent, grounding: &str) -> String {
    let mut parts = vec![
        format!(
            "You write {} DSL code. Given natural-language instructions, produce",
            label
        ),
        match extent {
            Extent::Chunk => format!(
                "the {} statements that carry them out. This is a CHUNK — one part of a larger subtask, not a standalone program. Write only the statements the instructions call for; do not add setup or teardown that was not asked for.",
                label
            ),
            Extent::Script => format!(
                "a single complete {} script that carries them out.",
                label
            ),
        },
        String::new(),
        "Rules:".to_string(),
        format!(
            "- Output ONLY {} source code. No prose, no explanation, no markdown fences.",
            label
        ),
        "- Follow the grammar in the reference exactly. Invalid syntax is rejected by the compiler."
            .to_string(),
        "- Do not invent statement forms. Only the documented forms are valid.".to_string(),
        "- If the instructions are ambiguous, choose the simplest faithful reading.".to_string(),
    ];
    if !grounding.is_empty() {
        parts.push(String::new());
        parts.push(grounding.to_string());
    }
    parts.join("\n")
}

/// The repair prompt. The compiler's message goes back UNCHANGED — it is the
/// only signal in the loop that is authoritative, and paraphrasing it would
/// substitute this module's reading of the error for the compiler's.
fn build_repair_prompt(instructions: &str, code: &str, errors: &[ValidationError]) -> String {
    let rendered: Vec<String> = errors
        .iter()
        .map(|e| match e.line {
            Some(l) => format!("- line {}: {}", l, e.message),
            None => format!("- {}", e.message),
        })
        .collect();
    format!(
        "Instructions:\n{}\n\nYour previous attempt was rejected by the compiler:\n\n{}\n\nCompiler errors:\n{}\n\nRewrite it so it compiles. Output only the corrected code.",
        instructions,
        code,
        rendered.join("\n")
    )
}

fn build_user_prompt(instructions: &str) -> String {
    format!("Instructions:\n{}", instructions)
}

/// One draft: generate, validate, repair until the compiler accepts or the
/// budget runs out.
async fn produce_draft(
    provider: &dyn Provider,
    label: &str,
    validate: fn(&str) -> ValidationResult,
    system: &str,
    instructions: &str,
    max_repairs: u32,
    temperature: f32,
    deadline: Instant,
) -> Result<(Chunk, ()), DraftFailure> {
    let started = Instant::now();
    let mut user = build_user_prompt(instructions);
    let mut last_code = String::new();
    let mut last_errors: Vec<ValidationError> = Vec::new();

    for attempt in 0..=max_repairs {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(DraftFailure::Provider(format!(
                "{}: out of time after {} attempt(s)",
                provider.id(),
                attempt
            )));
        }

        // The remaining budget IS the per-call limit — deliberately not
        // `min(remaining, DEFAULT_TIMEOUT_MS)`. Capping each call at the
        // default made a cold prefix impossible to serve by construction: the
        // first evaluation of a grounding pack takes ~124s, so every call
        // died at 50s no matter how large a budget the caller granted.
        // Measured: with the cap, two drafts both timed out; without it, the
        // first draft returned valid vaHera in 11.3s once warm.
        let code = provider
            .generate(GenerateArgs {
                system,
                user: &user,
                temperature,
                timeout: remaining,
            })
            .await
            .map_err(|e| DraftFailure::Provider(e.to_string()))?;

        let verdict = validate(&code);
        if verdict.ok {
            return Ok((
                Chunk {
                    code,
                    model: provider.id().to_string(),
                    repairs: attempt,
                    elapsed_ms: started.elapsed().as_millis() as u64,
                },
                (),
            ));
        }

        user = build_repair_prompt(instructions, &code, &verdict.errors);
        last_code = code;
        last_errors = verdict.errors;
    }

    let _ = label;
    Err(DraftFailure::Rejected(RejectedChunk {
        code: last_code,
        model: provider.id().to_string(),
        repairs: max_repairs,
        errors: last_errors,
    }))
}

enum DraftFailure {
    /// Never reached the compiler.
    Provider(String),
    /// Reached it and was refused, repeatedly.
    Rejected(RejectedChunk),
}

/// Generate DSL code. Returns every draft the compiler accepted.
pub async fn generate(req: GenerateRequest) -> GenerateResult {
    let extent = req.extent.unwrap_or_default();

    let Some(dsl) = get_dsl(&req.dsl_id) else {
        return GenerateResult::failed(
            &req.dsl_id,
            extent,
            format!("unknown dsl: {}", req.dsl_id),
            Stage::Compiler,
        );
    };

    // A DSL whose compiler cannot judge a fragment must not be asked for one:
    // the verdict would be meaningless, and a meaningless "accepted" is worse
    // than a refusal because it puts uncheckable code into a node's bag.
    if extent == Extent::Chunk && !dsl.accepts_fragment {
        return GenerateResult::failed(
            &req.dsl_id,
            extent,
            format!("{} does not accept fragments; use script extent", dsl.label),
            Stage::Compiler,
        );
    }

    // An explicit model is honoured even if unavailable — reporting "openai is
    // not configured" beats silently substituting a different model, which
    // would quietly invalidate any comparison the caller was making.
    let providers: Vec<Box<dyn Provider>> = match &req.model {
        Some(id) => match get_provider(id) {
            Some(p) if p.available() => vec![p],
            Some(_) => {
                return GenerateResult::failed(
                    &req.dsl_id,
                    extent,
                    format!("provider {} is not configured", id),
                    Stage::Provider,
                )
            }
            None => {
                return GenerateResult::failed(
                    &req.dsl_id,
                    extent,
                    format!("unknown provider: {}", id),
                    Stage::Provider,
                )
            }
        },
        None => available_providers(),
    };

    if providers.is_empty() {
        return GenerateResult::failed(
            &req.dsl_id,
            extent,
            "no provider configured — set OLLAMA_URL or an API key",
            Stage::Provider,
        );
    }

    let system = build_system_prompt(dsl.label, extent, &build_pack_context(dsl.pack_id));
    let max_repairs = req.max_repairs.unwrap_or(DEFAULT_MAX_REPAIRS);
    let drafts = req.drafts.unwrap_or(DEFAULT_DRAFTS).max(1);
    let deadline = Instant::now()
        + Duration::from_millis(req.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS * 4));

    let mut chunks: Vec<Chunk> = Vec::new();
    let mut rejected: Vec<RejectedChunk> = Vec::new();
    let mut provider_errors: Vec<ProviderError> = Vec::new();

    // Drafts are spread across providers round-robin rather than all taken
    // from the cheapest one. Two drafts from two models is the diversity the
    // chunk bag actually wants; two from one model at the same temperature is
    // close to one draft billed twice.
    for i in 0..drafts {
        if Instant::now() >= deadline {
            break;
        }
        let provider = &providers[(i as usize) % providers.len()];
        // Nudge temperature up on repeat drafts from the same model so a
        // second draft is a genuinely different realisation.
        let temperature = 0.2 + 0.15 * ((i as usize / providers.len()) as f32);

        match produce_draft(
            provider.as_ref(),
            dsl.label,
            dsl.validate,
            &system,
            &req.instructions,
            max_repairs,
            temperature,
            deadline,
        )
        .await
        {
            Ok((chunk, _)) => chunks.push(chunk),
            Err(DraftFailure::Rejected(r)) => rejected.push(r),
            Err(DraftFailure::Provider(message)) => provider_errors.push(ProviderError {
                model: provider.id().to_string(),
                message,
            }),
        }
    }

    let ok = !chunks.is_empty();
    GenerateResult {
        ok,
        dsl_id: req.dsl_id,
        extent,
        chunks,
        rejected,
        error: if ok {
            None
        } else {
            Some("no draft compiled".to_string())
        },
        stage: if ok {
            None
        } else if provider_errors.is_empty() {
            Some(Stage::Compiler)
        } else {
            Some(Stage::Provider)
        },
        // Reported even on success: a partial bag looks identical to a full one
        // otherwise, and a revoked key stays invisible for weeks.
        provider_errors: (!provider_errors.is_empty()).then_some(provider_errors),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The extent branch sits before the grounding pack, so the two prompts
    /// diverge almost immediately. This is the property that made a
    /// script-only warm useless for chunk requests, and it is worth pinning:
    /// if a refactor ever moves the grounding ahead of the branch, warming
    /// gets dramatically cheaper and this test should be updated deliberately
    /// rather than discovered by accident.
    #[test]
    fn script_and_chunk_prompts_share_almost_no_prefix() {
        let grounding = "# Language Reference\n\n".to_string() + &"x".repeat(4000);
        let s = build_system_prompt("vaHera", Extent::Script, &grounding);
        let c = build_system_prompt("vaHera", Extent::Chunk, &grounding);

        let shared = s
            .as_bytes()
            .iter()
            .zip(c.as_bytes())
            .take_while(|(a, b)| a == b)
            .count();
        assert!(shared < 100, "expected early divergence, shared {} bytes", shared);
        assert!(s.len() > 4000 && c.len() > 4000);
    }

    #[test]
    fn chunk_prompt_says_chunk_and_script_prompt_does_not() {
        let c = build_system_prompt("vaHera", Extent::Chunk, "");
        assert!(c.contains("This is a CHUNK"));
        let s = build_system_prompt("vaHera", Extent::Script, "");
        assert!(s.contains("single complete vaHera script"));
        assert!(!s.contains("CHUNK"));
    }

    #[test]
    fn grounding_is_appended_when_present_and_omitted_when_not() {
        assert!(build_system_prompt("vaHera", Extent::Script, "# Language Reference\n\nfoo")
            .ends_with("# Language Reference\n\nfoo"));
        assert!(build_system_prompt("vaHera", Extent::Script, "")
            .ends_with("choose the simplest faithful reading."));
    }

    /// The compiler's message must survive into the repair prompt unchanged.
    #[test]
    fn repair_prompt_quotes_compiler_errors_verbatim() {
        let p = build_repair_prompt(
            "list memories",
            "memory lst",
            &[ValidationError {
                message: "line 1: unknown vaHera: memory lst".into(),
                line: Some(1),
            }],
        );
        assert!(p.contains("line 1: unknown vaHera: memory lst"));
        assert!(p.contains("memory lst"));
        assert!(p.contains("list memories"));
    }

    #[tokio::test]
    async fn unknown_dsl_fails_at_the_compiler_stage() {
        let r = generate(GenerateRequest {
            dsl_id: "nope".into(),
            instructions: "x".into(),
            extent: None,
            max_repairs: None,
            drafts: None,
            model: None,
            timeout_ms: None,
        })
        .await;
        assert!(!r.ok);
        assert_eq!(r.stage, Some(Stage::Compiler));
        assert!(r.error.unwrap().contains("unknown dsl"));
    }

    #[tokio::test]
    async fn unknown_provider_fails_at_the_provider_stage() {
        let r = generate(GenerateRequest {
            dsl_id: "vahera".into(),
            instructions: "x".into(),
            extent: None,
            max_repairs: None,
            drafts: None,
            model: Some("not-a-provider".into()),
            timeout_ms: None,
        })
        .await;
        assert!(!r.ok);
        assert_eq!(r.stage, Some(Stage::Provider));
    }
}
