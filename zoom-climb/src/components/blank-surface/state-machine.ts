import type { RenderResult } from "@/components/render-leaves/types";

/**
 * The BSP surface state machine.
 *
 * The surface is provably only ever in one of these four states:
 *   blank     — cursor, no content
 *   thinking  — an observation is being resolved
 *   rendered  — exactly one completed trajectory is displayed
 *   error     — the observation could not be resolved; recoverable
 *
 * Any enrichment of the surface that does not fit this machine is
 * architectural regression, not UX improvement.
 */
export type SurfaceState =
  | { kind: "blank" }
  | { kind: "thinking"; utterance: string }
  | { kind: "rendered"; utterance: string; result: RenderResult }
  | { kind: "error"; utterance: string; message: string };

export type SurfaceEvent =
  | { type: "submit"; utterance: string }
  | { type: "result"; result: RenderResult }
  | { type: "error"; message: string }
  | { type: "reset" };

export function reduce(state: SurfaceState, event: SurfaceEvent): SurfaceState {
  switch (event.type) {
    case "submit":
      return { kind: "thinking", utterance: event.utterance };
    case "result":
      if (state.kind !== "thinking") return state;
      return {
        kind: "rendered",
        utterance: state.utterance,
        result: event.result,
      };
    case "error":
      if (state.kind !== "thinking") return state;
      return {
        kind: "error",
        utterance: state.utterance,
        message: event.message,
      };
    case "reset":
      return { kind: "blank" };
  }
}

export const initialState: SurfaceState = { kind: "blank" };
