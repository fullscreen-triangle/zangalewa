import type { ComponentType } from "react";
import type { LeafType, RenderLeafProps } from "./types";
import ResearchLeaf from "./research";

/**
 * The render-leaf dispatch table.
 *
 * BSP's single-surface rule means: whatever the utterance, the result is
 * dispatched to one or more of these leaves and all renders are composed
 * inline on the same surface. Nothing else in the system may render.
 *
 * v0 ships one leaf: `research` (text-based information synthesis).
 * Future leaves (imaging shaders, molecule viewers, spectrum plots)
 * register here as they are built.
 */
export const leafRegistry: Record<LeafType, ComponentType<RenderLeafProps>> = {
  research: ResearchLeaf,
};
