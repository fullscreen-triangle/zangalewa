/**
 * POST /api/zangalewa/warm
 *
 * Pay the cold-cache cost deliberately, so a user's first generation does
 * not pay it by accident.
 *
 * A local model must evaluate the whole grounding pack before it can emit
 * anything, and that dominates everything else. Measured with llama3.2:3b
 * and the 1101-token vaHera pack, prompt eval is ~124s cold and ~0.2-0.5s
 * once the prefix is cached. Since the pack is a fixed prefix on every
 * call, one throwaway request per (DSL, extent) converts every subsequent
 * generation to ~1-1.5s.
 *
 * Warming is expensive and stays expensive: ~63s for the first extent and
 * ~103s for the second. The second is slower rather than faster, which is
 * the tell that the cost here is model load and contention, not prefix
 * evaluation — the two extents cache into separate slots and neither
 * subsidises the other. Budget ~3 minutes to warm one DSL fully, and run it
 * off the user's critical path.
 *
 * Alternating extents afterwards does NOT evict: a chunk call following a
 * script call still hits its own cached prefix. Warming both is therefore
 * safe as well as necessary.
 *
 * Cloud providers have no such cache, so they are skipped.
 *
 * BOTH extents are warmed per DSL, and that is not thoroughness — it is
 * required. buildSystemPrompt emits a different sentence for script and for
 * chunk, and it does so BEFORE the grounding pack: the two prompts share
 * only their first 72 characters out of ~4600, so they share no usable
 * cached prefix. Warming just "script" leaves every chunk request paying
 * the full cold price. Measured, a first chunk generation against a warmed
 * script prefix took 91.7s; against a warmed chunk prefix, 14.9s, then
 * ~1.2s thereafter. Callers may pass an `extent` to warm only the one they
 * will actually use.
 *
 * Fire-and-forget: a failed warm is not an error, just a slow first
 * generation later.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { listDsls, getDsl } from "@/lib/dsl/registry";
import { buildPackContext } from "@/lib/dsl/packs";
import { getProvider } from "@/lib/dsl/providers";
import { buildSystemPrompt } from "@/lib/dsl/generate";
import type { Extent } from "@/lib/dsl/types";

/**
 * Warming one DSL across both extents measured ~166s, so this ceiling holds
 * exactly one DSL and no more. Callers should pass a `dslId` rather than
 * relying on the warm-everything default: the moment a second compiler is
 * registered, an unscoped warm will be cut off partway through, and the
 * DSLs it never reached stay cold with nothing to say so.
 */
export const config = { maxDuration: 300 };

interface WarmResult {
  warmed: {
    dslId: string;
    extent: Extent;
    ms: number;
    ok: boolean;
    error?: string;
  }[];
  skipped?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WarmResult | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const ollama = getProvider("ollama");
  if (!ollama?.available()) {
    return res.status(200).json({
      warmed: [],
      skipped: "ollama not configured — nothing to warm",
    });
  }

  // Warm one DSL, or every registered one.
  const requested = typeof req.body?.dslId === "string" ? req.body.dslId : null;
  const targets = requested
    ? [getDsl(requested)].filter(Boolean)
    : listDsls();

  // Which extents to prime. Default is both, because the two do not share a
  // prefix and a caller that warms the wrong one has warmed nothing.
  const requestedExtent: Extent | null =
    req.body?.extent === "chunk" || req.body?.extent === "script"
      ? req.body.extent
      : null;

  const warmed: WarmResult["warmed"] = [];

  // Sequential on purpose: concurrent cold loads of the same model contend
  // for the same weights and make each other slower.
  for (const dsl of targets) {
    if (!dsl) continue;

    const extents: Extent[] = requestedExtent
      ? [requestedExtent]
      : dsl.acceptsFragment
      ? ["script", "chunk"]
      : ["script"];

    for (const extent of extents) {
      // A DSL whose compiler refuses fragments never sees a chunk-extent
      // request, so warming one would be wasted minutes.
      if (extent === "chunk" && !dsl.acceptsFragment) continue;

      const started = Date.now();
      try {
        await ollama.generate({
          // The generator's own builder, imported rather than copied: a
          // prefix cache is exact-match, so a divergent copy would warm a
          // prompt nobody ever sends.
          system: buildSystemPrompt(
            dsl.label,
            extent,
            buildPackContext(dsl.packId)
          ),
          user: "Instructions:\nlist all memories",
          temperature: 0.2,
        });
        warmed.push({ dslId: dsl.id, extent, ms: Date.now() - started, ok: true });
      } catch (err) {
        warmed.push({
          dslId: dsl.id,
          extent,
          ms: Date.now() - started,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return res.status(200).json({ warmed });
}
