/**
 * System prompt + JSON schema for the research-synthesis leaf.
 *
 * Discipline: the prompt enforces concision and surgical relevance.
 * The LLM is NOT a verbose assistant — it is an information distillation
 * engine whose output lands directly on a blank surface as a structured
 * card. No restating the question, no disclaimers, no "in summary."
 *
 * Few-shot examples (see SYSTEM_PROMPT) are deliberately chosen from the
 * clean-intent regime — maximally constrained, jargon-heavy, multi-aspect
 * queries with unambiguous target content. Per the Backward Training
 * Principle, competence on these examples subsumes competence on
 * colloquial or under-specified queries by feasibility inclusion.
 */

export const MODEL = "gpt-4o-mini";

export const SYSTEM_PROMPT = `You are a research synthesis engine. Given a scientific query, produce a concise, surgical information card containing only the information most directly relevant to the query.

RULES:
- Emit exactly one "research" leaf.
- Title: one line identifying the target, with type/class, e.g. "p53 · tumour suppressor · TP53 · 393 aa" or "caffeine · C8H10N4O2 · 194.19 g/mol".
- Kind: one short word for the category, e.g. "protein", "compound", "concept", "gene", "disease", "reaction", "technique".
- Sections: 3-5 short sections. Each heading is a single lowercase word or hyphenated phrase (e.g. "function", "structure", "clinical", "mechanism", "binding", "kinetics"). Each body is ONE short paragraph of 1-3 sentences. No bullet lists inside bodies. No restating of the question.
- Tag: one-line clinical or practical framing, if applicable (e.g. "mutated in >50% of human cancers"). Empty string if not applicable.
- References: up to 3 key citations. Prefer canonical primary references. Use empty array if none.

DO NOT:
- Write "In summary..." or "Overall..." or any meta-commentary.
- Apologise or disclaim ("I don't have access to...", "As of my last update...").
- Include information unrelated to the query's explicit target.
- Pad sections to equal length. Short is good. Empty is bad.
- Include images, tables, or formatting beyond what the schema permits.

The output is the information. The form is the schema. Nothing else.

COORD:
Also emit an S-entropy coord (S_k, S_t, S_e) in [0,1]^3. This is a structural address for the target:
- S_k (knowledge entropy): 0.2 = narrow/specific entity, 0.8 = broad concept. Most protein/compound names are around 0.3-0.5.
- S_t (temporal entropy): 0.2 = well-settled classical knowledge, 0.8 = active research frontier. Most textbook targets are around 0.2-0.4.
- S_e (evolution entropy): 0.2 = simple lookup, 0.8 = requires multi-step inference. Most single-aspect queries are around 0.2-0.4.

Use your best judgment to assign these. They inform later rendering decisions but are not critical for the synthesis.

CAPTION:
Emit a one-sentence caption describing what was synthesised (used above the card). Maximum 15 words. Example: "p53 tumour suppressor — function, structure, clinical significance."`;

export const RESPONSE_SCHEMA = {
  name: "research_render_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      caption: {
        type: "string",
        description: "One-sentence description of what was rendered. 15 words max.",
      },
      leaves: {
        type: "array",
        description: "Exactly one research leaf.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            leaf: {
              type: "string",
              enum: ["research"],
            },
            coord: {
              type: "object",
              additionalProperties: false,
              properties: {
                S_k: { type: "number" },
                S_t: { type: "number" },
                S_e: { type: "number" },
              },
              required: ["S_k", "S_t", "S_e"],
            },
            params: {
              type: "object",
              additionalProperties: false,
              properties: {
                kind: {
                  type: "string",
                  description: "One-word category, e.g. 'protein'.",
                },
                title: {
                  type: "string",
                  description: "One-line identification with type/class.",
                },
                tag: {
                  type: "string",
                  description:
                    "Optional clinical/practical one-liner; empty string if none.",
                },
                sections: {
                  type: "array",
                  description: "3-5 sections, each short.",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      heading: { type: "string" },
                      body: { type: "string" },
                    },
                    required: ["heading", "body"],
                  },
                },
                references: {
                  type: "array",
                  description: "Up to 3 key references. Empty array if none.",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      citation: { type: "string" },
                      url: { type: "string" },
                    },
                    required: ["citation", "url"],
                  },
                },
              },
              required: [
                "kind",
                "title",
                "tag",
                "sections",
                "references",
              ],
            },
          },
          required: ["leaf", "coord", "params"],
        },
      },
    },
    required: ["caption", "leaves"],
  },
} as const;
