//! Knowledge packs — the grounding material injected into generation.
//!
//! A pack is a directory of Markdown holding one DSL's grammar and worked
//! examples. Packs carry EXAMPLES AND GRAMMAR, not domain facts: this module
//! writes code, and what it needs to know is how the language is spelled,
//! not what the science means. Grounding it in the meaning of the values its
//! code touches would be handing it a semantic role it is not entitled to.
//!
//! Layout:
//!   knowledge-packs/<pack-id>/
//!     manifest.json
//!     <files listed in manifest>
//!
//! The packs are NOT duplicated for Rust. Both implementations read the same
//! files on disk, because a pack is the prompt: two copies would drift, and
//! the drift would show up as an unexplained quality gap between the Rust and
//! TS generators rather than as an obvious missing file. `ZANGALEWA_PACKS`
//! overrides the location; otherwise we walk up from the working directory
//! looking for `knowledge-packs`, then for `zoom-climb/knowledge-packs`,
//! which is where they live today.

use once_cell::sync::OnceCell;
use serde::Deserialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Deserialize)]
struct PackFile {
    path: String,
    #[allow(dead_code)]
    #[serde(default)]
    description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct PackManifest {
    id: String,
    #[allow(dead_code)]
    name: String,
    #[serde(default)]
    summary: Option<String>,
    #[serde(default)]
    files: Vec<PackFile>,
    #[serde(skip)]
    dir: PathBuf,
}

static REGISTRY: OnceCell<HashMap<String, PackManifest>> = OnceCell::new();

/// Locate the packs directory. Checked in order so an explicit override always
/// wins over discovery.
fn packs_root() -> Option<PathBuf> {
    if let Ok(explicit) = std::env::var("ZANGALEWA_PACKS") {
        let p = PathBuf::from(explicit);
        return p.is_dir().then_some(p);
    }

    let mut dir: PathBuf = std::env::current_dir().ok()?;
    loop {
        for candidate in ["knowledge-packs", "zoom-climb/knowledge-packs"] {
            let p = dir.join(candidate);
            if p.is_dir() {
                return Some(p);
            }
        }
        if !dir.pop() {
            return None;
        }
    }
}

fn registry() -> &'static HashMap<String, PackManifest> {
    REGISTRY.get_or_init(|| {
        let mut out = HashMap::new();
        let Some(root) = packs_root() else {
            return out;
        };
        let Ok(entries) = std::fs::read_dir(&root) else {
            return out;
        };

        for entry in entries.flatten() {
            if !entry.path().is_dir() {
                continue;
            }
            let manifest_path = entry.path().join("manifest.json");
            if !manifest_path.is_file() {
                continue;
            }
            match std::fs::read_to_string(&manifest_path)
                .ok()
                .and_then(|s| serde_json::from_str::<PackManifest>(&s).ok())
            {
                Some(mut manifest) => {
                    manifest.dir = entry.path();
                    out.insert(manifest.id.clone(), manifest);
                }
                None => {
                    // A malformed pack is worth saying out loud: it degrades
                    // generation quality silently otherwise, since a missing
                    // pack just yields an ungrounded prompt that still runs.
                    eprintln!("failed to load knowledge pack at {}", manifest_path.display());
                }
            }
        }
        out
    })
}

/// Concatenated Markdown for one pack, or None if it does not exist.
pub fn load_pack_content(pack_id: &str) -> Option<String> {
    let pack = registry().get(pack_id)?;

    let mut sections: Vec<String> = Vec::new();
    if let Some(summary) = &pack.summary {
        sections.push(summary.clone());
    }
    for file in &pack.files {
        let file_path: PathBuf = Path::new(&pack.dir).join(&file.path);
        match std::fs::read_to_string(&file_path) {
            Ok(content) => sections.push(content),
            // Mirrors the TS: a missing file is noted inline rather than
            // failing the whole pack, so partial grounding still works.
            Err(_) => sections.push(format!("<!-- missing file: {} -->", file.path)),
        }
    }
    Some(sections.join("\n\n"))
}

/// Grounding block for the system prompt, or "" when the pack is missing.
pub fn build_pack_context(pack_id: &str) -> String {
    match load_pack_content(pack_id) {
        Some(content) => format!("# Language Reference\n\n{}", content),
        None => String::new(),
    }
}

pub fn pack_exists(pack_id: &str) -> bool {
    registry().contains_key(pack_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Both implementations must read the SAME pack bytes. If this fails, the
    /// packs were not found from the crate's working directory and the Rust
    /// generator would silently run ungrounded.
    #[test]
    fn finds_the_shared_vahera_pack() {
        assert!(pack_exists("vahera"), "vahera pack not discoverable — check packs_root()");
        let ctx = build_pack_context("vahera");
        assert!(ctx.starts_with("# Language Reference"));
        assert!(ctx.len() > 1000, "pack suspiciously small: {} bytes", ctx.len());
    }

    #[test]
    fn missing_pack_yields_empty_context_not_panic() {
        assert!(!pack_exists("no-such-pack"));
        assert_eq!(build_pack_context("no-such-pack"), "");
    }
}
