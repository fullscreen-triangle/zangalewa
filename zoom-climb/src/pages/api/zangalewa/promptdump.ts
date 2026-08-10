// TEMPORARY parity harness: dumps the exact system prompt the TS generator
// builds, so it can be diffed byte-for-byte against the Rust one. Delete once
// parity is verified.
import type { NextApiRequest, NextApiResponse } from "next";
import { buildSystemPrompt } from "@/lib/dsl/generate";
import { buildPackContext } from "@/lib/dsl/packs";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const extent = req.query.extent === "chunk" ? "chunk" : "script";
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(buildSystemPrompt("vaHera", extent, buildPackContext("vahera")));
}
