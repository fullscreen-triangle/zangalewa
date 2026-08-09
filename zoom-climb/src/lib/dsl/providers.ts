/**
 * Provider layer — the models that can write DSL code.
 *
 * Zangalewa is the OS's only AI module, so this is the only place in the
 * system that talks to a model. Everything downstream is deterministic.
 *
 * Two things this layer deliberately does NOT do:
 *
 *  1. It does not rank models by quality. Which model writes better vaHera
 *     is not knowable here — the compiler answers "does it parse", and
 *     nothing answers "is it right" until the code runs and its values
 *     either propagate or don't. Selection is by availability and cost.
 *
 *  2. It does not collapse to one model when several are available. Model
 *     diversity is a feature: different models write genuinely different
 *     valid realisations of the same subtask, and a node's chunk bag wants
 *     that variety.
 *
 * Providers are ordered cheapest-first. Ollama is local/self-hosted and
 * free, so it leads; cloud providers follow.
 */

export interface Provider {
  id: string;
  label: string;
  /** Whether the environment has what this provider needs. */
  available: () => boolean;
  /** Roughly, cost per generation. 0 = free/local. Ordering only. */
  cost: number;
  generate: (args: GenerateArgs) => Promise<string>;
}

export interface GenerateArgs {
  system: string;
  user: string;
  /** Sampling temperature. Raised across drafts to diversify the bag. */
  temperature?: number;
  signal?: AbortSignal;
}

/** Strip markdown fences a model may have wrapped the code in. */
export function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```[a-zA-Z]*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}

// ── Ollama ────────────────────────────────────────────────────────────────
// Self-hosted, free. OLLAMA_URL may point at localhost or a LAN host.

const ollama: Provider = {
  id: "ollama",
  label: "Ollama",
  cost: 0,
  available: () => Boolean(process.env.OLLAMA_URL),
  async generate({ system, user, temperature = 0.2, signal }) {
    const url = process.env.OLLAMA_URL!.replace(/\/$/, "");
    const model = process.env.OLLAMA_MODEL || "llama3.2";

    // Streamed deliberately, and NOT as an optimisation.
    //
    // Node's undici enforces a 300s headers timeout that no per-request
    // option can raise. With stream:false, Ollama withholds headers until
    // the entire generation is finished, so a slow local model on modest
    // hardware dies at 300s with "Headers Timeout Error" no matter what
    // budget the caller passed. Streaming makes headers arrive at once and
    // hands timeout control back to our own AbortSignal.
    const res = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model,
        stream: true,
        options: { temperature },
        // Hold the model and its prompt cache in memory between requests.
        //
        // This is the single biggest cost in the whole module, and it is
        // entirely a caching effect rather than model speed. Measured with
        // llama3.2:3b and the 1101-token vaHera pack:
        //
        //   cold prefix : prompt eval 124,026 ms  (~9 tok/s)
        //   warm prefix : prompt eval      167 ms
        //
        // Same model, same prompt, ~740x. The grounding pack is a fixed
        // prefix on every call, so once it is cached each generation costs
        // only its own short completion (~1.5-2.5s end to end). Without
        // keep_alive the default eviction throws that cache away and every
        // request pays the cold price again.
        keep_alive: process.env.OLLAMA_KEEP_ALIVE || "30m",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
    if (!res.body) throw new Error("ollama: no response body");

    // NDJSON: one JSON object per line, each carrying a content delta.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // keep the trailing partial line
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed);
          if (obj?.error) throw new Error(`ollama: ${obj.error}`);
          const delta = obj?.message?.content;
          if (typeof delta === "string") content += delta;
        } catch (e) {
          // Re-throw a real server error; ignore a partial line.
          if (e instanceof Error && e.message.startsWith("ollama:")) throw e;
        }
      }
    }

    if (!content) throw new Error("ollama: no content");
    return stripFences(content);
  },
};

// ── OpenAI ────────────────────────────────────────────────────────────────

const openai: Provider = {
  id: "openai",
  label: "OpenAI",
  cost: 2,
  available: () => Boolean(process.env.OPENAI_API_KEY),
  async generate({ system, user, temperature = 0.2, signal }) {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      signal,
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`openai HTTP ${res.status}`);
    const body = await res.json();
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("openai: no content");
    return stripFences(content);
  },
};

// ── Anthropic ─────────────────────────────────────────────────────────────

const anthropic: Provider = {
  id: "anthropic",
  label: "Anthropic",
  cost: 2,
  available: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async generate({ system, user, temperature = 0.2, signal }) {
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      signal,
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic HTTP ${res.status}`);
    const body = await res.json();
    const content = body?.content?.[0]?.text;
    if (typeof content !== "string") throw new Error("anthropic: no content");
    return stripFences(content);
  },
};

// ── Gemini ────────────────────────────────────────────────────────────────

const gemini: Provider = {
  id: "gemini",
  label: "Gemini",
  cost: 1,
  available: () => Boolean(process.env.GEMINI_API_KEY),
  async generate({ system, user, temperature = 0.2, signal }) {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature },
        }),
      }
    );
    if (!res.ok) throw new Error(`gemini HTTP ${res.status}`);
    const body = await res.json();
    const content = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof content !== "string") throw new Error("gemini: no content");
    return stripFences(content);
  },
};

const ALL: Provider[] = [ollama, gemini, openai, anthropic];

/** Providers the environment can actually reach, cheapest first. */
export function availableProviders(): Provider[] {
  return ALL.filter((p) => p.available()).sort((a, b) => a.cost - b.cost);
}

export function getProvider(id: string): Provider | null {
  return ALL.find((p) => p.id === id) ?? null;
}

/** For the UI: what is wired up, without leaking key material. */
export function providerStatus() {
  return ALL.map((p) => ({
    id: p.id,
    label: p.label,
    available: p.available(),
    cost: p.cost,
  }));
}
