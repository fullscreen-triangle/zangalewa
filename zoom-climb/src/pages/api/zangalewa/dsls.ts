/**
 * GET /api/zangalewa/dsls
 *
 * What this instance can write, and which models are wired up. The UI needs
 * both to render honestly rather than offering options that will 503.
 *
 * Provider status reports availability only — never key material.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { listDsls } from "@/lib/dsl/registry";
import { packExists } from "@/lib/dsl/packs";
import { providerStatus } from "@/lib/dsl/providers";

export interface DslsResponse {
  dsls: {
    id: string;
    label: string;
    moduleId: string;
    acceptsFragment: boolean;
    /** Whether grounding material is on disk for this DSL. */
    grounded: boolean;
  }[];
  providers: { id: string; label: string; available: boolean; cost: number }[];
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<DslsResponse | { error: string }>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method not allowed" });
  }

  return res.status(200).json({
    dsls: listDsls().map((d) => ({
      id: d.id,
      label: d.label,
      moduleId: d.moduleId,
      acceptsFragment: d.acceptsFragment,
      grounded: packExists(d.packId),
    })),
    providers: providerStatus(),
  });
}
