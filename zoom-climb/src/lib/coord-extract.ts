import type { RenderResult } from "@/components/render-leaves/types";

/**
 * Client-side wrapper: ship an utterance to the server-side coord extractor,
 * receive a structured RenderResult ready for BSP dispatch.
 *
 * Swapping the stub extractor for the real OpenAI-backed MSI is a server-side
 * change only — this client interface stays stable.
 */
export async function extractCoord(utterance: string): Promise<RenderResult> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ utterance }),
  });
  if (!res.ok) {
    throw new Error(`coord-extract failed: ${res.status}`);
  }
  return (await res.json()) as RenderResult;
}
