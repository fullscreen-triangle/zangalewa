/**
 * Shared types for the render-leaf contract.
 *
 * A render-leaf is the kernel-exposed primitive that turns a completed
 * trajectory (S-coord + leaf-specific params) into pixels on the single
 * surface. Each domain (imaging / chem / spec) registers exactly one leaf.
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

export type LeafType = "imaging" | "chem" | "spec";

export type LeafPayload = {
  leaf: LeafType;
  coord: SCoord;
  /** leaf-specific render parameters; opaque to the surface */
  params: Record<string, unknown>;
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
