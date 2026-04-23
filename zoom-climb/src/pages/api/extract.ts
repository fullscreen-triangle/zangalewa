import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import type { RenderResult } from "@/components/render-leaves/types";
import { MODEL, SYSTEM_PROMPT, RESPONSE_SCHEMA } from "@/lib/prompt";

/**
 * /api/extract
 *
 * Takes a natural-language utterance, returns a structured RenderResult
 * ready for the blank surface to dispatch. Backed by OpenAI with a
 * strict JSON schema — the response is guaranteed to match the render-leaf
 * contract at the schema level.
 *
 * Note: this is the v0 stand-in for the real MSI (Minimum Sufficient
 * Interceptor) that would eventually be produced by purpose-factory as
 * a LoRA-adapted Resolver. The interface is identical; only the backend
 * changes when the real resolver lands.
 */

export const config = {
  maxDuration: 30,
};

export default async function handler(
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "OPENAI_API_KEY not set. Add it to .env.local (see .env.local.example).",
    });
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: utterance },
      ],
      response_format: {
        type: "json_schema",
        json_schema: RESPONSE_SCHEMA,
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return res.status(502).json({ error: "empty response from model" });
    }

    const parsed = JSON.parse(raw) as RenderResult;
    return res.status(200).json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: `synthesis failed: ${message}` });
  }
}
