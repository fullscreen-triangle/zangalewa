//! The contract between Zangalewa and everything else.
//!
//! Zangalewa is the OS's only AI module: it turns instructions into DSL code
//! and does nothing else. It does not execute, does not schedule, does not
//! decide where the code belongs, and does not judge whether the code is
//! semantically right — that verdict belongs to consumers downstream, never
//! to the writer. The single judgement it IS entitled to make is syntactic:
//! did the module's own compiler accept this?
//!
//! This mirrors `zoom-climb/src/lib/dsl/types.ts` field for field. The two
//! implementations must satisfy the same shapes and pass the same fixtures;
//! a change here is a change to both. Serde renames keep the JSON identical
//! to the TypeScript surface, so a Rust service and a TS caller can talk
//! without a translation layer in between.

use serde::{Deserialize, Serialize};

/// A compiler's verdict on one candidate. Normalized across every DSL.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ValidationResult {
    pub ok: bool,
    pub errors: Vec<ValidationError>,
}

impl ValidationResult {
    pub fn accepted() -> Self {
        Self { ok: true, errors: Vec::new() }
    }

    pub fn rejected(errors: Vec<ValidationError>) -> Self {
        Self { ok: false, errors }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ValidationError {
    pub message: String,
    /// 1-based, when the compiler reports one.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,
}

/// How much code to write. Same competence, different extent — the
/// instructions decide which, and the compiler judges either identically.
///
///  - `Script` : a complete standalone program for one module, the thing an
///               informed user would have hand-written.
///  - `Chunk`  : one subtask's share, a fragment destined for a node that
///               may carry several chunks in several DSLs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Extent {
    Script,
    Chunk,
}

impl Default for Extent {
    fn default() -> Self {
        Extent::Script
    }
}

/// Which side of the pipeline failed. A caller acts on these differently:
/// `Provider` is worth retrying once the environment is fixed, `Compiler`
/// is not — retrying identical instructions will fail identically.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Stage {
    Provider,
    Compiler,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateRequest {
    pub dsl_id: String,
    pub instructions: String,
    #[serde(default)]
    pub extent: Option<Extent>,
    /// Repair attempts after the first try. Default 3.
    #[serde(default)]
    pub max_repairs: Option<u32>,
    /// How many independent drafts to attempt. Every one that compiles is kept.
    #[serde(default)]
    pub drafts: Option<u32>,
    /// Explicit provider/model override; otherwise selection is automatic.
    #[serde(default)]
    pub model: Option<String>,
    /// Wall-clock budget for the whole request, across drafts and repairs.
    #[serde(default)]
    pub timeout_ms: Option<u64>,
}

/// One candidate that survived its compiler.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Chunk {
    pub code: String,
    /// Which provider/model wrote it.
    pub model: String,
    /// Repair rounds needed before it compiled. 0 = first try.
    pub repairs: u32,
    /// Wall-clock ms to produce, including repairs.
    pub elapsed_ms: u64,
}

/// One candidate the compiler refused, kept for diagnostics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RejectedChunk {
    pub code: String,
    pub model: String,
    pub repairs: u32,
    pub errors: Vec<ValidationError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderError {
    pub model: String,
    pub message: String,
}

/// Every draft the compiler accepted — not a winner.
///
/// The runtime executes every chunk on a node and judges nothing, so
/// collapsing accepted drafts to a single "best" one would be this module
/// making exactly the semantic call it is not entitled to make. Two chunks
/// that both compile are two valid realisations; which one mattered is
/// settled downstream by whether the node's values propagated.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateResult {
    pub ok: bool,
    pub dsl_id: String,
    pub extent: Extent,
    pub chunks: Vec<Chunk>,
    pub rejected: Vec<RejectedChunk>,
    /// Present when generation failed outright (no provider, all drafts dead).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Distinguishes "no provider" from "compiler refused everything".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stage: Option<Stage>,
    /// Providers that died before the compiler ever saw their output — a dead
    /// key, an unreachable host, a timeout. Reported even on success, because
    /// a partial bag looks identical to a full one otherwise, and "one of your
    /// two models has a revoked key" is exactly the thing that stays invisible
    /// for weeks if it is only surfaced on total failure.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_errors: Option<Vec<ProviderError>>,
}

impl GenerateResult {
    /// A failure that never reached a model, or never got past one.
    pub fn failed(dsl_id: &str, extent: Extent, error: impl Into<String>, stage: Stage) -> Self {
        Self {
            ok: false,
            dsl_id: dsl_id.to_string(),
            extent,
            chunks: Vec::new(),
            rejected: Vec::new(),
            error: Some(error.into()),
            stage: Some(stage),
            provider_errors: None,
        }
    }
}
