//! Zangalewa: `(dslId, instructions)` -> DSL chunks that compile.
//!
//! This is the OS's ONLY AI module. Every other module in Buhera OS is
//! deterministic; this one calls a model. That boundary is the whole design,
//! and it is why this crate is deliberately small:
//!
//!   - it does not execute code
//!   - it does not plan, order, schedule, or route
//!   - it does not know what the code means, or where it belongs
//!   - it does not pick a winner among drafts that compile
//!
//! The single judgement it makes is syntactic: did the owning module's own
//! compiler accept this? Everything else is settled downstream, by whether a
//! node's emitted values propagate to consumers.
//!
//! This is the Rust implementation — the final version. `zoom-climb/src/lib/dsl`
//! is the TypeScript playground. Both must satisfy the same contract and read
//! the same knowledge packs; a divergence between them is a bug in whichever
//! one drifted.
//!
//! ```no_run
//! # use zangalewa_dsl::{generate, GenerateRequest};
//! # async fn ex() {
//! let result = generate(GenerateRequest {
//!     dsl_id: "vahera".into(),
//!     instructions: "list all memories, then sort".into(),
//!     ..Default::default()
//! }).await;
//! // Every accepted draft, never a winner.
//! for chunk in &result.chunks {
//!     println!("{}", chunk.code);
//! }
//! # }
//! ```

pub mod generate;
pub mod packs;
pub mod providers;
pub mod registry;
pub mod types;
pub mod vahera;

pub use generate::{build_system_prompt, generate};
pub use packs::{build_pack_context, load_pack_content, pack_exists};
pub use providers::{available_providers, get_provider, provider_status, Provider};
pub use registry::{get_dsl, list_dsls, DslEntry};
pub use types::{
    Chunk, Extent, GenerateRequest, GenerateResult, ProviderError, RejectedChunk, Stage,
    ValidationError, ValidationResult,
};
pub use vahera::{parse_vahera, VaheraError, VaheraStatement};

impl Default for GenerateRequest {
    fn default() -> Self {
        Self {
            dsl_id: String::new(),
            instructions: String::new(),
            extent: None,
            max_repairs: None,
            drafts: None,
            model: None,
            timeout_ms: None,
        }
    }
}
