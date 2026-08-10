//! vaHera parser — ported from `zoom-climb/src/lib/dsl/vahera.ts`, which was
//! itself ported verbatim from long-grass `src/lib/vahera.js`.
//!
//! ONLY the parser is ported, deliberately. The interpreter needs a live
//! kernel; parsing is pure, so it can serve as a validator here without
//! dragging execution into the module.
//!
//! This is the empty-dictionary ground truth for vaHera generation: we ship
//! no opinion about what good vaHera looks like, we only ask the module's
//! own grammar whether it parses. Keep this file in exact sync with the TS
//! and with long-grass — a divergence here is a divergence in what counts
//! as valid, which silently corrupts every measurement made against it.
//!
//! Two porting details that are easy to get wrong, both load-bearing:
//!
//!   1. Error strings are byte-identical to the TS (`line N: unknown
//!      vaHera: ...`), because the repair prompt feeds them straight back to
//!      the model. A reworded message is a different prompt, and the two
//!      implementations would stop being comparable.
//!   2. Line numbering counts every physical line including blanks and
//!      comments, so `line N` points at the real source line.

use once_cell::sync::Lazy;
use regex::Regex;

/// One parsed vaHera statement. Kept as a faithful mirror of the TS union
/// even though nothing here consumes the payloads — the parser's job is to
/// accept or reject, and carrying the shape keeps the port honest.
#[derive(Debug, Clone, PartialEq)]
pub enum VaheraStatement {
    Describe { target: String, text: String },
    Resolve { target: String },
    Spawn { program: String, target: String },
    Navigate,
    Complete,
    MemoryCreate { k: f64, t: f64, e: f64 },
    MemoryStore { name: String, text: String },
    MemoryFind { query: String, k: u32 },
    MemoryList,
    MemoryDump { name: String },
    DemonSort,
    ControllerVerify,
    KernelStats,
    KernelTrace,
    ProcessList,
}

/// Rejection carries the same "line N: ..." text the TS throws, and the line
/// separately so a caller need not re-parse its own message.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VaheraError {
    pub message: String,
    pub line: u32,
}

macro_rules! re {
    ($name:ident, $pat:expr) => {
        static $name: Lazy<Regex> = Lazy::new(|| Regex::new($pat).unwrap());
    };
}

re!(S_COORD, r"S\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)");
re!(DESCRIBE, r#"^describe\s+(\S+)\s+with\s+"([^"]*)"$"#);
re!(RESOLVE, r"^resolve\s+(\S+)$");
re!(SPAWN, r"^spawn\s+(\S+)\s+from\s+(\S+)$");
re!(MEM_STORE, r#"^memory\s+store\s+"([^"]*)"\s*=\s*"([^"]*)"$"#);
re!(MEM_FIND, r#"^memory\s+find\s+nearest\s+"([^"]*)"(?:\s+k=(\d+))?$"#);
re!(MEM_DUMP, r"^memory\s+dump\s+(\S+)$");

/// Parse vaHera source into statements. Returns the first invalid line as an
/// error, matching the TS parser, which throws on first failure rather than
/// collecting. One anchored error is what the repair prompt wants; a list of
/// cascading ones after the first mistake is noise.
pub fn parse_vahera(src: &str) -> Result<Vec<VaheraStatement>, VaheraError> {
    let mut out = Vec::new();

    for (idx, raw) in src.split('\n').enumerate() {
        let line_no = (idx + 1) as u32;
        let line = raw.trim();

        if line.is_empty() {
            continue;
        }
        // "# aspect: NAME" registers a retrieval aspect; other # lines are comments.
        if line.starts_with("# aspect:") || line.starts_with('#') {
            continue;
        }

        if let Some(m) = DESCRIBE.captures(line) {
            out.push(VaheraStatement::Describe {
                target: m[1].to_string(),
                text: m[2].to_string(),
            });
        } else if let Some(m) = RESOLVE.captures(line) {
            out.push(VaheraStatement::Resolve { target: m[1].to_string() });
        } else if let Some(m) = SPAWN.captures(line) {
            out.push(VaheraStatement::Spawn {
                program: m[1].to_string(),
                target: m[2].to_string(),
            });
        } else if line == "navigate to penultimate" {
            out.push(VaheraStatement::Navigate);
        } else if line == "complete trajectory" {
            out.push(VaheraStatement::Complete);
        } else if line.starts_with("memory create at") {
            // Ordered before the other memory forms exactly as in the TS: this
            // arm is claimed by prefix, so a malformed coordinate is a
            // coordinate error, never "unknown vaHera".
            let m = S_COORD.captures(line).ok_or_else(|| VaheraError {
                message: format!("line {}: expected S(k,t,e): {}", line_no, line),
                line: line_no,
            })?;
            out.push(VaheraStatement::MemoryCreate {
                k: parse_f64(&m[1]),
                t: parse_f64(&m[2]),
                e: parse_f64(&m[3]),
            });
        } else if let Some(m) = MEM_STORE.captures(line) {
            out.push(VaheraStatement::MemoryStore {
                name: m[1].to_string(),
                text: m[2].to_string(),
            });
        } else if let Some(m) = MEM_FIND.captures(line) {
            out.push(VaheraStatement::MemoryFind {
                query: m[1].to_string(),
                // Default k=3, matching the TS.
                k: m.get(2).map_or(3, |g| g.as_str().parse().unwrap_or(3)),
            });
        } else if line == "memory list" {
            out.push(VaheraStatement::MemoryList);
        } else if let Some(m) = MEM_DUMP.captures(line) {
            out.push(VaheraStatement::MemoryDump { name: m[1].to_string() });
        } else if line == "demon sort" {
            out.push(VaheraStatement::DemonSort);
        } else if line == "controller verify" {
            out.push(VaheraStatement::ControllerVerify);
        } else if line == "kernel stats" {
            out.push(VaheraStatement::KernelStats);
        } else if line == "kernel trace" {
            out.push(VaheraStatement::KernelTrace);
        } else if line == "process list" {
            out.push(VaheraStatement::ProcessList);
        } else {
            return Err(VaheraError {
                message: format!("line {}: unknown vaHera: {}", line_no, line),
                line: line_no,
            });
        }
    }

    Ok(out)
}

/// JS `parseFloat` never fails here — the regex already constrained the shape.
/// A Rust parse failure on the same text would be a divergence, so fall back
/// to NaN rather than rejecting a line the TS would have accepted.
fn parse_f64(s: &str) -> f64 {
    s.parse().unwrap_or(f64::NAN)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_every_documented_form() {
        let src = r#"
# a comment
# aspect: retrieval
describe target with "some text"
resolve target
spawn prog from target
navigate to penultimate
complete trajectory
memory create at S(0.5, 0.5, 0.5)
memory store "a" = "one"
memory find nearest "q"
memory find nearest "q" k=5
memory list
memory dump name
demon sort
controller verify
kernel stats
kernel trace
process list
"#;
        // 16 lines, not 15 forms: `memory find nearest` appears twice, with
        // and without an explicit k. Comments and blanks contribute nothing.
        let stmts = parse_vahera(src).expect("should parse");
        assert_eq!(stmts.len(), 16);

        // Every documented form must actually be exercised above — asserting
        // only the count would still pass if a line were duplicated and
        // another dropped.
        let kinds: std::collections::HashSet<_> =
            stmts.iter().map(std::mem::discriminant).collect();
        assert_eq!(kinds.len(), 15, "every statement form should appear at least once");
    }

    #[test]
    fn memory_find_defaults_k_to_three() {
        let stmts = parse_vahera(r#"memory find nearest "q""#).unwrap();
        assert_eq!(stmts[0], VaheraStatement::MemoryFind { query: "q".into(), k: 3 });
    }

    /// The exact string the repair prompt feeds back. If this message ever
    /// drifts from the TS, the two implementations are no longer comparable.
    #[test]
    fn rejects_with_ts_identical_message() {
        let err = parse_vahera("memory list\nmemory store \"a\" == \"b\"").unwrap_err();
        assert_eq!(err.line, 2);
        assert_eq!(err.message, r#"line 2: unknown vaHera: memory store "a" == "b""#);
    }

    #[test]
    fn malformed_coordinate_is_a_coordinate_error_not_unknown() {
        let err = parse_vahera("memory create at S(1, 2)").unwrap_err();
        assert_eq!(err.message, "line 1: expected S(k,t,e): memory create at S(1, 2)");
    }

    /// Blank and comment lines still advance the counter, so a reported line
    /// number points at the real source line.
    #[test]
    fn line_numbers_count_blanks_and_comments() {
        let err = parse_vahera("\n# note\n\nbogus statement").unwrap_err();
        assert_eq!(err.line, 4);
    }

    #[test]
    fn empty_source_is_valid() {
        assert!(parse_vahera("").unwrap().is_empty());
        assert!(parse_vahera("\n\n# only comments\n").unwrap().is_empty());
    }
}
