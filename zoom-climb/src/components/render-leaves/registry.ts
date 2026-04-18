import type { ComponentType } from "react";
import type { LeafType, RenderLeafProps } from "./types";
import ImagingLeaf from "./imaging";
import ChemLeaf from "./chem";
import SpecLeaf from "./spec";

/**
 * The render-leaf dispatch table.
 *
 * BSP's single-surface rule means: whatever the utterance, the result is
 * dispatched to one or more of these leaves, and all renders are composed
 * inline on the same surface. Nothing else in the system may render.
 */
export const leafRegistry: Record<LeafType, ComponentType<RenderLeafProps>> = {
  imaging: ImagingLeaf,
  chem: ChemLeaf,
  spec: SpecLeaf,
};
