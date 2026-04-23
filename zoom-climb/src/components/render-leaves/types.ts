/**
 * Shared types for the render-leaf contract.
 *
 * A render-leaf is the primitive that turns a completed trajectory
 * (S-coord + leaf-specific params) into visible output on the single
 * surface. v0 ships exactly one leaf — `research` — which renders a
 * concise information card. Later leaves (imaging shaders, molecule
 * viewers, spectrum plots) will be added here as they are built.
 *
 * The surface never dispatches anything to a leaf but this shape.
 */

export type SCoord = {
  /** knowledge entropy — how specific the target is */
  S_k: number;
  /** temporal entropy — when in a sequence */
  S_t: number;
  /** evolution entropy — how the intent transforms the system */
  S_e: number;
};

export type LeafType = "research";

export type ResearchSection = {
  heading: string;
  body: string;
};

export type ResearchReference = {
  citation: string;
  url?: string;
};

/**
 * Payload for the `research` leaf — a distilled information card.
 * Constrained to a small number of short sections so the surface
 * never shows Wikipedia-length content.
 */
export type ResearchParams = {
  /** one-line identification, e.g. "p53 · tumour suppressor · TP53 · 393 aa" */
  title: string;
  /** optional kicker above the title, e.g. "protein" or "compound" */
  kind?: string;
  /** 2–5 sections, each one short paragraph */
  sections: ResearchSection[];
  /** optional one-line clinical / practical tag */
  tag?: string;
  /** up to three key references */
  references?: ResearchReference[];
};

export type LeafPayload = {
  leaf: LeafType;
  coord: SCoord;
  params: ResearchParams;
};

export type RenderResult = {
  /** one or more leaves to render inline on the same surface */
  leaves: LeafPayload[];
  /** optional short text annotation — one sentence max */
  caption?: string;
};

export type RenderLeafProps = {
  payload: LeafPayload;
};
