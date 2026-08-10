//! End-to-end check against a live provider.
//!
//! An example rather than a test, deliberately: it needs a running Ollama (or
//! an API key), and a `cargo test` that fails because a local daemon is down
//! reports an environment problem as a code problem.
//!
//!   cargo run --example generate -- vahera chunk "list all memories"
//!
//! Prints the full result as JSON, which is the same shape the TS
//! implementation returns — so the two can be diffed directly.

use zangalewa_dsl::{generate, Extent, GenerateRequest};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let dsl_id = args.first().cloned().unwrap_or_else(|| "vahera".into());
    let extent = match args.get(1).map(String::as_str) {
        Some("chunk") => Extent::Chunk,
        _ => Extent::Script,
    };
    let instructions = args
        .get(2)
        .cloned()
        .unwrap_or_else(|| "list all memories".into());

    let started = std::time::Instant::now();
    let result = generate(GenerateRequest {
        dsl_id,
        instructions,
        extent: Some(extent),
        // Two drafts, to show the bag holds more than one accepted realisation
        // when more than one provider is configured.
        drafts: Some(2),
        ..Default::default()
    })
    .await;

    println!("{}", serde_json::to_string_pretty(&result).unwrap());
    eprintln!("elapsed: {}ms", started.elapsed().as_millis());

    if !result.ok {
        std::process::exit(1);
    }
}
