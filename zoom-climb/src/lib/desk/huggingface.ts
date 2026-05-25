/**
 * HuggingFace Inference API client for the desk-index pipeline.
 *
 * v0 uses one model: BAAI/bge-large-en-v1.5 (1024-dim sentence
 * embeddings, instruction-tuned for retrieval). Per the HNC paper +
 * Federation Inequality we'll add specialists per-language later only
 * with evidence; one general text encoder is sufficient to demonstrate
 * the cascade clustering at v0.
 *
 * Free serverless inference characteristics:
 * - First request after idle may cold-start (20-40s while loaded).
 *   We pass `options.wait_for_model: true` so the API blocks rather
 *   than 503-ing.
 * - Sustained throughput ~1 req/s. The caller throttles.
 * - Returns a 1024-element f32 array per input.
 */

// HF migrated from `api-inference.huggingface.co` to a router-based
// scheme: `router.huggingface.co/{provider}/models/{model_id}/pipeline/{task}`.
// `hf-inference` is the provider slug for the free serverless backend.
const HF_ROUTER = "https://router.huggingface.co/hf-inference/models";

export const EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5";

function authHeaders(): HeadersInit {
  const token = process.env.HUGGINGFACEHUB_API_TOKEN;
  if (!token) {
    throw new Error(
      "HUGGINGFACEHUB_API_TOKEN not set — add it to .env.local"
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Embed a single text into a 1024-dim vector via BAAI/bge-large-en-v1.5.
 * Throws on network failure, model error, or unexpected response shape
 * — the caller decides whether to retry or skip.
 *
 * BGE convention: prepend "Represent this sentence for searching
 * relevant passages: " when embedding a query; pass content directly
 * when embedding a document. Set `isQuery` accordingly.
 */
export async function embedText(
  text: string,
  isQuery = false
): Promise<number[]> {
  const url = `${HF_ROUTER}/${EMBEDDING_MODEL}/pipeline/feature-extraction`;
  const prepared = isQuery
    ? `Represent this sentence for searching relevant passages: ${text}`
    : text;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        inputs: prepared,
        options: { wait_for_model: true },
      }),
    });
  } catch (e) {
    const cause = (e as { cause?: unknown }).cause;
    const detail = cause instanceof Error ? cause.message : String(cause ?? e);
    throw new Error(`network error embedding text: ${detail}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HF embed failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as unknown;
  return normaliseEmbedding(data);
}

/**
 * HF feature-extraction endpoints return one of:
 * - number[]                — sentence-level embedding (pooled)
 * - number[][]              — token-level embeddings (need mean-pool)
 * - number[][][]            — batched token-level (need slice + mean)
 *
 * BGE returns sentence-level directly when the model has a pooling
 * head registered, but we mean-pool as a safety net if we receive
 * token-level output.
 */
function normaliseEmbedding(data: unknown): number[] {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("HF embed returned empty or non-array response");
  }
  // Case 1: sentence-level (number[])
  if (typeof data[0] === "number") {
    return data as number[];
  }
  // Case 2: token-level (number[][]) — mean-pool
  if (Array.isArray(data[0]) && typeof (data[0] as unknown[])[0] === "number") {
    const tokens = data as number[][];
    const dim = tokens[0].length;
    const pooled = new Array<number>(dim).fill(0);
    for (const tok of tokens) {
      for (let i = 0; i < dim; i++) pooled[i] += tok[i];
    }
    for (let i = 0; i < dim; i++) pooled[i] /= tokens.length;
    return pooled;
  }
  // Case 3: batched (number[][][]) — take first batch, then mean-pool
  if (Array.isArray(data[0]) && Array.isArray((data[0] as unknown[])[0])) {
    return normaliseEmbedding((data as unknown[][])[0]);
  }
  throw new Error("HF embed returned unrecognised shape");
}

/**
 * Embed many texts with a throttle to respect free-tier rate limits.
 * Returns embeddings in input order; on per-item failure, returns null
 * for that slot so the caller can decide how to recover.
 */
export async function embedBatch(
  texts: string[],
  delayMs = 1100,
  onProgress?: (done: number, total: number, label: string) => void
): Promise<(number[] | null)[]> {
  const out: (number[] | null)[] = [];
  for (let i = 0; i < texts.length; i++) {
    try {
      const vec = await embedText(texts[i], false);
      out.push(vec);
    } catch {
      out.push(null);
    }
    onProgress?.(i + 1, texts.length, `embedded ${i + 1}/${texts.length}`);
    if (i < texts.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return out;
}
