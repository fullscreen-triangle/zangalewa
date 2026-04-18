import type { NextApiRequest, NextApiResponse } from "next";
import type {
  LeafPayload,
  RenderResult,
} from "@/components/render-leaves/types";

/**
 * Stub coord-extractor.
 *
 * For v0 this is a deterministic keyword matcher, NOT the real MSI.
 * It exists so the end-to-end surface pipeline can be exercised without
 * an OpenAI dependency. When the OpenAI wiring lands, the swap is
 * server-side only — the /api/extract contract stays the same.
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<RenderResult | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const body = req.body as { utterance?: unknown } | undefined;
  const utterance = String(body?.utterance ?? "").trim();
  if (!utterance) {
    return res.status(400).json({ error: "empty utterance" });
  }

  const u = utterance.toLowerCase();
  const leaves: LeafPayload[] = [];

  if (/(image|microscop|fluoresc|cell|neuron|bacter|cortic|coli|sample)/.test(u)) {
    leaves.push({
      leaf: "imaging",
      coord: { S_k: 0.62, S_t: 0.41, S_e: 0.18 },
      params: { utterance },
    });
  }
  if (/(molecul|chem|caffeine|ethanol|bind|ligand|compound|drug|smiles|adenosine|lipid)/.test(u)) {
    leaves.push({
      leaf: "chem",
      coord: { S_k: 0.54, S_t: 0.29, S_e: 0.47 },
      params: { utterance },
    });
  }
  if (/(spectr|mass |nmr|instrument|\bev\b|peak|ionis|ionize|m\/z)/.test(u)) {
    leaves.push({
      leaf: "spec",
      coord: { S_k: 0.71, S_t: 0.22, S_e: 0.33 },
      params: { utterance },
    });
  }

  // Fall-through: route to chem as a safe default so the surface always
  // renders something in response. Not a real policy — only a stub.
  if (leaves.length === 0) {
    leaves.push({
      leaf: "chem",
      coord: { S_k: 0.5, S_t: 0.5, S_e: 0.5 },
      params: { utterance },
    });
  }

  const result: RenderResult = {
    leaves,
    caption: `Stub extractor routed your utterance to ${leaves.length} leaf${
      leaves.length === 1 ? "" : "s"
    }.`,
  };

  return res.status(200).json(result);
}
