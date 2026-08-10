//! Provider layer — the models that can write DSL code.
//!
//! Zangalewa is the OS's only AI module, so this is the only place in the
//! system that talks to a model. Everything downstream is deterministic.
//!
//! Two things this layer deliberately does NOT do:
//!
//!  1. It does not rank models by quality. Which model writes better vaHera
//!     is not knowable here — the compiler answers "does it parse", and
//!     nothing answers "is it right" until the code runs and its values
//!     either propagate or don't. Selection is by availability and cost.
//!
//!  2. It does not collapse to one model when several are available. Model
//!     diversity is a feature: different models write genuinely different
//!     valid realisations of the same subtask, and a node's chunk bag wants
//!     that variety.
//!
//! Providers are ordered cheapest-first. Ollama is local/self-hosted and
//! free, so it leads; cloud providers follow.

use async_trait::async_trait;
use futures::StreamExt;
use once_cell::sync::Lazy;
use regex::Regex;
use std::time::Duration;

#[derive(Debug, thiserror::Error)]
pub enum ProviderFailure {
    #[error("{0}")]
    Message(String),
}

fn fail(msg: impl Into<String>) -> ProviderFailure {
    ProviderFailure::Message(msg.into())
}

pub struct GenerateArgs<'a> {
    pub system: &'a str,
    pub user: &'a str,
    /// Sampling temperature. Raised across drafts to diversify the bag.
    pub temperature: f32,
    /// Hard ceiling for this single call.
    pub timeout: Duration,
}

#[async_trait]
pub trait Provider: Send + Sync {
    fn id(&self) -> &'static str;
    fn label(&self) -> &'static str;
    /// Roughly, cost per generation. 0 = free/local. Ordering only.
    fn cost(&self) -> u8;
    /// Whether the environment has what this provider needs.
    fn available(&self) -> bool;
    async fn generate(&self, args: GenerateArgs<'_>) -> Result<String, ProviderFailure>;
}

static FENCE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?s)^```[a-zA-Z]*\n(.*?)\n?```$").unwrap());

/// Strip markdown fences a model may have wrapped the code in.
pub fn strip_fences(text: &str) -> String {
    let trimmed = text.trim();
    match FENCE.captures(trimmed) {
        Some(c) => c[1].trim().to_string(),
        None => trimmed.to_string(),
    }
}

fn http() -> reqwest::Client {
    // No global timeout: each call sets its own, because a cold local model
    // legitimately takes minutes while a warm one takes a second.
    reqwest::Client::builder()
        .build()
        .expect("failed to build HTTP client")
}

// ── Ollama ────────────────────────────────────────────────────────────────
// Self-hosted, free. OLLAMA_URL may point at localhost or a LAN host.

pub struct Ollama;

#[async_trait]
impl Provider for Ollama {
    fn id(&self) -> &'static str { "ollama" }
    fn label(&self) -> &'static str { "Ollama" }
    fn cost(&self) -> u8 { 0 }
    fn available(&self) -> bool { std::env::var("OLLAMA_URL").is_ok() }

    async fn generate(&self, args: GenerateArgs<'_>) -> Result<String, ProviderFailure> {
        let url = std::env::var("OLLAMA_URL")
            .map_err(|_| fail("ollama: OLLAMA_URL not set"))?
            .trim_end_matches('/')
            .to_string();
        let model = std::env::var("OLLAMA_MODEL").unwrap_or_else(|_| "llama3.2".into());

        // Streamed deliberately, and NOT as an optimisation. With stream:false
        // Ollama withholds response headers until the entire generation is
        // finished, so any client-side header timeout fires on a slow local
        // model regardless of the caller's budget. Streaming makes headers
        // arrive at once and hands timeout control back to us. (In the TS
        // implementation this was forced by undici's non-configurable 300s
        // headers timeout; the same shape is correct here for the same
        // reason, so the two stay comparable.)
        //
        // keep_alive holds the model AND its prompt cache in memory between
        // requests. This is the single biggest cost in the whole module and
        // it is a caching effect, not model speed. Measured with llama3.2:3b
        // and the 1101-token vaHera pack:
        //
        //   cold prefix : prompt eval ~124,000 ms
        //   warm prefix : prompt eval      ~200-500 ms
        //
        // The grounding pack is a fixed prefix on every call, so once cached
        // each generation costs only its own short completion (~1-1.5s end to
        // end). Without keep_alive, default eviction throws that cache away
        // and every request pays the cold price again.
        let keep_alive = std::env::var("OLLAMA_KEEP_ALIVE").unwrap_or_else(|_| "30m".into());

        let body = serde_json::json!({
            "model": model,
            "stream": true,
            "options": { "temperature": args.temperature },
            "keep_alive": keep_alive,
            "messages": [
                { "role": "system", "content": args.system },
                { "role": "user", "content": args.user },
            ],
        });

        let send = http()
            .post(format!("{}/api/chat", url))
            .json(&body)
            .send();

        let res = tokio::time::timeout(args.timeout, send)
            .await
            .map_err(|_| fail(format!("ollama: timed out after {:?}", args.timeout)))?
            .map_err(|e| fail(format!("ollama: {}", e)))?;

        if !res.status().is_success() {
            return Err(fail(format!("ollama HTTP {}", res.status().as_u16())));
        }

        // NDJSON: one JSON object per line, each carrying a content delta.
        let mut stream = res.bytes_stream();
        let mut buffer = String::new();
        let mut content = String::new();

        let deadline = tokio::time::Instant::now() + args.timeout;
        loop {
            let next = tokio::time::timeout_at(deadline, stream.next())
                .await
                .map_err(|_| fail(format!("ollama: timed out after {:?}", args.timeout)))?;
            let Some(chunk) = next else { break };
            let chunk = chunk.map_err(|e| fail(format!("ollama: {}", e)))?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            // Keep the trailing partial line for the next read.
            while let Some(idx) = buffer.find('\n') {
                let line: String = buffer.drain(..=idx).collect();
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }
                let Ok(obj) = serde_json::from_str::<serde_json::Value>(line) else {
                    continue; // partial or non-JSON line
                };
                if let Some(err) = obj.get("error").and_then(|e| e.as_str()) {
                    return Err(fail(format!("ollama: {}", err)));
                }
                if let Some(delta) = obj.pointer("/message/content").and_then(|c| c.as_str()) {
                    content.push_str(delta);
                }
            }
        }

        if content.is_empty() {
            return Err(fail("ollama: no content"));
        }
        Ok(strip_fences(&content))
    }
}

// ── Cloud providers ───────────────────────────────────────────────────────
// One shape each; all non-streaming, since a hosted model returns headers
// promptly and the streaming rationale above does not apply.

macro_rules! cloud_provider {
    (
        $name:ident, $id:literal, $label:literal, $cost:literal, $key_env:literal
    ) => {
        pub struct $name;

        impl $name {
            fn api_key() -> Result<String, ProviderFailure> {
                std::env::var($key_env)
                    .map_err(|_| fail(concat!($id, ": ", $key_env, " not set")))
            }
        }
    };
}

cloud_provider!(OpenAi, "openai", "OpenAI", 2, "OPENAI_API_KEY");
cloud_provider!(Anthropic, "anthropic", "Anthropic", 2, "ANTHROPIC_API_KEY");
cloud_provider!(Gemini, "gemini", "Gemini", 1, "GEMINI_API_KEY");

#[async_trait]
impl Provider for OpenAi {
    fn id(&self) -> &'static str { "openai" }
    fn label(&self) -> &'static str { "OpenAI" }
    fn cost(&self) -> u8 { 2 }
    fn available(&self) -> bool { std::env::var("OPENAI_API_KEY").is_ok() }

    async fn generate(&self, args: GenerateArgs<'_>) -> Result<String, ProviderFailure> {
        let model = std::env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4o-mini".into());
        let body = serde_json::json!({
            "model": model,
            "temperature": args.temperature,
            "messages": [
                { "role": "system", "content": args.system },
                { "role": "user", "content": args.user },
            ],
        });
        let res = tokio::time::timeout(
            args.timeout,
            http()
                .post("https://api.openai.com/v1/chat/completions")
                .bearer_auth(Self::api_key()?)
                .json(&body)
                .send(),
        )
        .await
        .map_err(|_| fail("openai: timed out"))?
        .map_err(|e| fail(format!("openai: {}", e)))?;

        if !res.status().is_success() {
            return Err(fail(format!("openai HTTP {}", res.status().as_u16())));
        }
        let v: serde_json::Value = res.json().await.map_err(|e| fail(format!("openai: {}", e)))?;
        v.pointer("/choices/0/message/content")
            .and_then(|c| c.as_str())
            .map(strip_fences)
            .ok_or_else(|| fail("openai: no content"))
    }
}

#[async_trait]
impl Provider for Anthropic {
    fn id(&self) -> &'static str { "anthropic" }
    fn label(&self) -> &'static str { "Anthropic" }
    fn cost(&self) -> u8 { 2 }
    fn available(&self) -> bool { std::env::var("ANTHROPIC_API_KEY").is_ok() }

    async fn generate(&self, args: GenerateArgs<'_>) -> Result<String, ProviderFailure> {
        let model = std::env::var("ANTHROPIC_MODEL").unwrap_or_else(|_| "claude-sonnet-4-5".into());
        let body = serde_json::json!({
            "model": model,
            "max_tokens": 2048,
            "temperature": args.temperature,
            "system": args.system,
            "messages": [{ "role": "user", "content": args.user }],
        });
        let res = tokio::time::timeout(
            args.timeout,
            http()
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", Self::api_key()?)
                .header("anthropic-version", "2023-06-01")
                .json(&body)
                .send(),
        )
        .await
        .map_err(|_| fail("anthropic: timed out"))?
        .map_err(|e| fail(format!("anthropic: {}", e)))?;

        if !res.status().is_success() {
            return Err(fail(format!("anthropic HTTP {}", res.status().as_u16())));
        }
        let v: serde_json::Value = res.json().await.map_err(|e| fail(format!("anthropic: {}", e)))?;
        v.pointer("/content/0/text")
            .and_then(|c| c.as_str())
            .map(strip_fences)
            .ok_or_else(|| fail("anthropic: no content"))
    }
}

#[async_trait]
impl Provider for Gemini {
    fn id(&self) -> &'static str { "gemini" }
    fn label(&self) -> &'static str { "Gemini" }
    fn cost(&self) -> u8 { 1 }
    fn available(&self) -> bool { std::env::var("GEMINI_API_KEY").is_ok() }

    async fn generate(&self, args: GenerateArgs<'_>) -> Result<String, ProviderFailure> {
        let model = std::env::var("GEMINI_MODEL").unwrap_or_else(|_| "gemini-2.0-flash".into());
        let body = serde_json::json!({
            "systemInstruction": { "parts": [{ "text": args.system }] },
            "contents": [{ "role": "user", "parts": [{ "text": args.user }] }],
            "generationConfig": { "temperature": args.temperature },
        });
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model,
            Self::api_key()?
        );
        let res = tokio::time::timeout(args.timeout, http().post(url).json(&body).send())
            .await
            .map_err(|_| fail("gemini: timed out"))?
            .map_err(|e| fail(format!("gemini: {}", e)))?;

        if !res.status().is_success() {
            return Err(fail(format!("gemini HTTP {}", res.status().as_u16())));
        }
        let v: serde_json::Value = res.json().await.map_err(|e| fail(format!("gemini: {}", e)))?;
        v.pointer("/candidates/0/content/parts/0/text")
            .and_then(|c| c.as_str())
            .map(strip_fences)
            .ok_or_else(|| fail("gemini: no content"))
    }
}

/// Every provider, cheapest first.
pub fn all_providers() -> Vec<Box<dyn Provider>> {
    vec![
        Box::new(Ollama),
        Box::new(Gemini),
        Box::new(OpenAi),
        Box::new(Anthropic),
    ]
}

/// Providers the environment can actually reach, cheapest first.
pub fn available_providers() -> Vec<Box<dyn Provider>> {
    let mut ps: Vec<Box<dyn Provider>> =
        all_providers().into_iter().filter(|p| p.available()).collect();
    ps.sort_by_key(|p| p.cost());
    ps
}

pub fn get_provider(id: &str) -> Option<Box<dyn Provider>> {
    all_providers().into_iter().find(|p| p.id() == id)
}

/// For a UI: what is wired up, without leaking key material.
pub fn provider_status() -> Vec<(&'static str, &'static str, bool, u8)> {
    all_providers()
        .iter()
        .map(|p| (p.id(), p.label(), p.available(), p.cost()))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_fences_and_leaves_bare_code_alone() {
        assert_eq!(strip_fences("```vahera\nmemory list\n```"), "memory list");
        assert_eq!(strip_fences("```\nmemory list\n```"), "memory list");
        assert_eq!(strip_fences("  memory list  "), "memory list");
        // A fence mid-text is not a wrapper and must survive.
        assert_eq!(strip_fences("memory list\n```\nx"), "memory list\n```\nx");
    }

    #[test]
    fn multiline_fenced_block_survives_intact() {
        assert_eq!(
            strip_fences("```\nmemory list\ndemon sort\n```"),
            "memory list\ndemon sort"
        );
    }

    /// Ordering is by cost, never by a guess at quality.
    #[test]
    fn providers_are_ordered_cheapest_first() {
        let costs: Vec<u8> = all_providers().iter().map(|p| p.cost()).collect();
        assert_eq!(costs, vec![0, 1, 2, 2]);
    }
}
