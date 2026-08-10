//! The DSL registry — which languages Zangalewa can write, and whose compiler
//! judges each one.
//!
//! `validate` is the module's REAL compiler, normalized to a common verdict
//! shape. Nothing here approximates a grammar or second-guesses a compiler:
//! the whole design rests on asking the owning module whether the code parses,
//! because that is the only judgement this module is entitled to make.
//!
//! Adding a DSL is one entry plus a normalizer. Mirrors
//! `zoom-climb/src/lib/dsl/registry.ts`.

use crate::types::{ValidationError, ValidationResult};
use crate::vahera::parse_vahera;

/// One DSL the generator can target.
pub struct DslEntry {
    pub id: &'static str,
    pub label: &'static str,
    /// Who executes the code once it reaches the OS. Recorded here, never
    /// acted on by this module.
    pub module_id: &'static str,
    /// Names the grounding material.
    pub pack_id: &'static str,
    /// Whether this DSL's compiler accepts a fragment as well as a whole
    /// program. Line-oriented DSLs (vaHera) do; DSLs with program structure
    /// or accumulating REPL semantics (SCOPE) may not, in which case chunk
    /// extent needs a different validation call than script extent.
    pub accepts_fragment: bool,
    pub validate: fn(&str) -> ValidationResult,
}

pub fn validate_vahera(source: &str) -> ValidationResult {
    match parse_vahera(source) {
        Ok(_) => ValidationResult::accepted(),
        Err(e) => ValidationResult::rejected(vec![ValidationError {
            message: e.message,
            line: Some(e.line),
        }]),
    }
}

static DSLS: &[DslEntry] = &[DslEntry {
    id: "vahera",
    label: "vaHera",
    module_id: "vahera",
    pack_id: "vahera",
    accepts_fragment: true,
    validate: validate_vahera,
}];

pub fn get_dsl(id: &str) -> Option<&'static DslEntry> {
    DSLS.iter().find(|d| d.id == id)
}

pub fn list_dsls() -> &'static [DslEntry] {
    DSLS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_source() {
        let r = validate_vahera("memory list\ndemon sort");
        assert!(r.ok);
        assert!(r.errors.is_empty());
    }

    /// The line anchor is what the repair prompt points the model at. Losing
    /// it turns a targeted correction into a guess.
    #[test]
    fn rejection_carries_the_line_anchor() {
        let r = validate_vahera("memory list\nmemory store \"a\" == \"b\"");
        assert!(!r.ok);
        assert_eq!(r.errors[0].line, Some(2));
        assert!(r.errors[0].message.contains("unknown vaHera"));
    }

    #[test]
    fn vahera_is_registered_and_accepts_fragments() {
        let dsl = get_dsl("vahera").expect("vahera must be registered");
        assert!(dsl.accepts_fragment);
        assert!(get_dsl("nope").is_none());
    }
}
