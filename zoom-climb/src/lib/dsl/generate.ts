/**
 * Zangalewa's one competence: instructions -> DSL code that compiles.
 *
 * The loop, per draft:
 *   1. GROUND    inject the DSL's grammar and worked examples.
 *   2. GENERATE  ask a model for the code.
 *   3. VALIDATE  run it through the module's REAL compiler.
 *   4. REPAIR    on rejection, feed the compiler's verbatim errors back and
 *                ask again, up to maxRepairs. The compiler judges every round.
 *
 * Drafts run in parallel across the available models, and EVERY draft the
 * compiler accepts is returned. This is the part that most often gets
 * designed wrong, so it is worth stating why: the runtime executes every
 * chunk on a node and judges nothing, which means picking a single "best"
 * draft here would be this module making a semantic call it has no standing
 * to make. Two chunks that both parse are two valid realisations. Which one
 * mattered is settled downstream, by whether the node's values propagated —
 * never here.
 *
 * What this does NOT do, by design: execute anything, order chunks, plan a
 * decomposition, consult other nodes, or know which node it is writing for.
 * It is a protocol, not a planner.
 */

import { getDsl } from "./registry";
import { buildPackContext } from "./packs";
import { availableProviders, getProvider, type Provider } from "./providers";
import type {
  Chunk,
  Extent,
  GenerateRequest,
  GenerateResult,
  RejectedChunk,
  ValidationError,
} from "./types";

/**
 * Wall-clock budget for a whole request, across all drafts and repairs.
 * Sits under the API route's own limit so the generator stops itself and
 * reports what it has, rather than being killed with nothing to show.
 *
 * Measured, so the number is not aspirational: llama3.2:3b on this machine
 * takes 145-300s for a four-statement vaHera chunk. A serverless route
 * cannot wait that long, which is the real constraint — a slow local model
 * is usable from a script or the Rust build, but for the web tool it needs
 * either a faster model or a cloud provider. Callers not bound by a route
 * budget should pass their own timeoutMs.
 */
const DEFAULT_TIMEOUT_MS = 50_000;

export async function generate(req: GenerateRequest): Promise<GenerateResult> {
  const { dslId, instructions } = req;
  const extent: Extent = req.extent ?? "script";
  const maxRepairs = req.maxRepairs ?? 3;
  const draftCount = Math.max(1, Math.min(req.drafts ?? 1, 8));

  const dsl = getDsl(dslId);
  if (!dsl) {
    return fail(dslId, extent, `unknown DSL: "${dslId}"`, "compiler");
  }
  if (!instructions || !instructions.trim()) {
    return fail(dslId, extent, "instructions are empty", "compiler");
  }
  if (extent === "chunk" && !dsl.acceptsFragment) {
    return fail(
      dslId,
      extent,
      `${dsl.label} does not accept fragments; generate a full script instead`,
      "compiler"
    );
  }

  // Which models will write. An explicit override wins; otherwise use
  // everything reachable, so the bag gets variety rather than one voice.
  let providers: Provider[];
  if (req.model) {
    const p = getProvider(req.model);
    if (!p) return fail(dslId, extent, `unknown provider: "${req.model}"`, "provider");
    if (!p.available()) {
      return fail(dslId, extent, `${p.label} is not configured`, "provider");
    }
    providers = [p];
  } else {
    providers = availableProviders();
    if (providers.length === 0) {
      return fail(
        dslId,
        extent,
        "no provider configured — set OLLAMA_URL, GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY",
        "provider"
      );
    }
  }

  const system = buildSystemPrompt(dsl.label, extent, buildPackContext(dsl.packId));

  // Round-robin drafts over providers, nudging temperature up on repeats of
  // the same model so a second draft is a genuinely different attempt rather
  // than the same one twice.
  const plan = Array.from({ length: draftCount }, (_, i) => ({
    provider: providers[i % providers.length],
    temperature: 0.2 + 0.3 * Math.floor(i / providers.length),
  }));

  const deadline = Date.now() + (req.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const settled = await Promise.all(
    plan.map(({ provider, temperature }) =>
      draft({ provider, temperature, system, instructions, dsl, maxRepairs, deadline })
    )
  );

  const chunks: Chunk[] = [];
  const rejected: RejectedChunk[] = [];
  const providerErrors: { model: string; message: string }[] = [];

  for (const r of settled) {
    if (r.kind === "ok") chunks.push(r.chunk);
    else if (r.kind === "rejected") rejected.push(r.rejected);
    else providerErrors.push({ model: r.model, message: r.message });
  }

  if (chunks.length > 0) {
    // Surface dead providers even on success — a bag short two drafts
    // because a key was revoked is indistinguishable from a full one
    // unless we say so.
    return {
      ok: true,
      dslId,
      extent,
      chunks,
      rejected,
      ...(providerErrors.length > 0 ? { providerErrors } : {}),
    };
  }

  // Nothing compiled. Distinguish the two failures that matter to a caller:
  // every provider being unreachable is retryable; the compiler refusing
  // every draft means the instructions are underspecified or wrong, and
  // retrying identically will not help.
  const allDied = rejected.length === 0 && providerErrors.length > 0;
  return {
    ok: false,
    dslId,
    extent,
    chunks: [],
    rejected,
    stage: allDied ? "provider" : "compiler",
    error: allDied
      ? `all providers failed: ${providerErrors
          .map((e) => `${e.model}: ${e.message}`)
          .join("; ")}`
      : `compiler rejected every draft after ${maxRepairs} repair rounds`,
    ...(providerErrors.length > 0 ? { providerErrors } : {}),
  };
}

type DraftOutcome =
  | { kind: "ok"; chunk: Chunk }
  | { kind: "rejected"; rejected: RejectedChunk }
  | { kind: "dead"; model: string; message: string };

/**
 * One model's attempt: generate, then repair against the compiler.
 *
 * Bounded by a wall-clock deadline. A local model on modest hardware can
 * take minutes per round, and the caller is a serverless route with a hard
 * budget — better to stop cleanly and report a partial bag than to be
 * killed mid-flight and report nothing.
 */
async function draft(args: {
  provider: Provider;
  temperature: number;
  system: string;
  instructions: string;
  dsl: NonNullable<ReturnType<typeof getDsl>>;
  maxRepairs: number;
  deadline: number;
}): Promise<DraftOutcome> {
  const { provider, temperature, system, instructions, dsl, maxRepairs, deadline } =
    args;
  const started = Date.now();

  let lastCode = "";
  let lastErrors: ValidationError[] = [];
  let rounds = 0;

  for (let round = 0; round <= maxRepairs; round++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      // Out of time. If nothing ever compiled, that is a provider-side
      // failure — the compiler never got to judge.
      if (!lastCode) {
        return {
          kind: "dead",
          model: provider.id,
          message: `timed out after ${Date.now() - started}ms`,
        };
      }
      break;
    }

    const user =
      round === 0
        ? `Instructions:\n${instructions}`
        : buildRepairPrompt(instructions, lastCode, lastErrors);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);

    let code: string;
    try {
      code = await provider.generate({
        system,
        user,
        temperature,
        signal: controller.signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // A provider dying still counts as a provider failure only if it
      // never produced anything the compiler saw.
      if (!lastCode) return { kind: "dead", model: provider.id, message };
      break;
    } finally {
      clearTimeout(timer);
    }

    rounds = round;
    const check = dsl.validate(code);
    lastCode = code;
    lastErrors = check.errors;

    if (check.ok) {
      return {
        kind: "ok",
        chunk: {
          code,
          model: provider.id,
          repairs: round,
          elapsedMs: Date.now() - started,
        },
      };
    }
  }

  return {
    kind: "rejected",
    rejected: { code: lastCode, model: provider.id, repairs: rounds, errors: lastErrors },
  };
}

function buildSystemPrompt(label: string, extent: Extent, grounding: string): string {
  const parts = [
    `You write ${label} DSL code. Given natural-language instructions, produce`,
    extent === "chunk"
      ? `the ${label} statements that carry them out. This is a CHUNK — one part of a larger subtask, not a standalone program. Write only the statements the instructions call for; do not add setup or teardown that was not asked for.`
      : `a single complete ${label} script that carries them out.`,
    "",
    "Rules:",
    `- Output ONLY ${label} source code. No prose, no explanation, no markdown fences.`,
    "- Follow the grammar in the reference exactly. Invalid syntax is rejected by the compiler.",
    "- Do not invent statement forms. Only the documented forms are valid.",
    "- If the instructions are ambiguous, choose the simplest faithful reading.",
  ];
  if (grounding) parts.push("", grounding);
  return parts.join("\n");
}

/**
 * Repair prompt: show the model its own rejected code and the compiler's
 * verbatim errors. Line-anchored errors point it at the offending statement.
 */
function buildRepairPrompt(
  instructions: string,
  code: string,
  errors: ValidationError[]
): string {
  const errorLines = errors
    .map((e) => (e.line != null ? `- line ${e.line}: ${e.message}` : `- ${e.message}`))
    .join("\n");
  return [
    `Instructions:\n${instructions}`,
    "",
    "Your previous attempt was REJECTED by the compiler:",
    "",
    code,
    "",
    "Compiler errors:",
    errorLines,
    "",
    "Return corrected code that fixes these errors and still follows the instructions.",
  ].join("\n");
}

function fail(
  dslId: string,
  extent: Extent,
  error: string,
  stage: "provider" | "compiler"
): GenerateResult {
  return { ok: false, dslId, extent, chunks: [], rejected: [], error, stage };
}
