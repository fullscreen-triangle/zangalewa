/**
 * POST /api/zangalewa/generate
 *
 * The module's whole public surface: instructions in, DSL code out.
 *
 * It generates and validates. It does not execute — the validator for each
 * DSL is a pure parser chosen precisely so nothing runs here. What comes back
 * is source text; who runs it, and when, is the OS's business, not this
 * endpoint's.
 *
 * Body:  { dslId, instructions, extent?, drafts?, maxRepairs?, model? }
 * 200:   GenerateResult with ok:true and one or more accepted chunks.
 * 422:   compiler refused every draft (the instructions, not the wiring).
 * 503:   no provider reachable (the wiring, not the instructions).
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { generate } from "@/lib/dsl/generate";
import type { GenerateRequest, GenerateResult } from "@/lib/dsl/types";

/**
 * Sits above the generator's own 50s budget so the generator is what stops
 * first — it can return a partial bag, whereas a platform kill returns
 * nothing.
 */
export const config = { maxDuration: 60 };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateResult | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const body = (req.body ?? {}) as Partial<GenerateRequest>;
  const dslId = typeof body.dslId === "string" ? body.dslId.trim() : "";
  const instructions =
    typeof body.instructions === "string" ? body.instructions.trim() : "";

  if (!dslId) return res.status(400).json({ error: "dslId is required" });
  if (!instructions) {
    return res.status(400).json({ error: "instructions are required" });
  }

  try {
    const result = await generate({
      dslId,
      instructions,
      extent: body.extent === "chunk" ? "chunk" : "script",
      drafts: typeof body.drafts === "number" ? body.drafts : undefined,
      maxRepairs:
        typeof body.maxRepairs === "number" ? body.maxRepairs : undefined,
      model: typeof body.model === "string" && body.model ? body.model : undefined,
    });

    if (result.ok) return res.status(200).json(result);
    // The two failures a caller acts on differently: 503 is worth retrying
    // once the environment is fixed, 422 is not.
    return res.status(result.stage === "provider" ? 503 : 422).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
