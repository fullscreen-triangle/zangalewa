import {
  useReducer,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
} from "react";
import { leafRegistry } from "@/components/render-leaves/registry";
import type { LeafPayload } from "@/components/render-leaves/types";
import { extractCoord } from "@/lib/coord-extract";
import { reduce, initialState } from "./state-machine";

export type BlankSurfaceProps = {
  /** Placeholder shown in the cursor; onboarding hint only, not a constraint. */
  placeholder?: string;
  /** Subtle footer hint visible when the surface is blank. */
  domainHint?: string;
};

/**
 * The single surface.
 *
 * One input region, one render region, one state machine. Any utterance
 * may route to any leaf; the page-level placeholder is an onboarding hint,
 * not a domain gate.
 */
export default function BlankSurface({
  placeholder,
  domainHint,
}: BlankSurfaceProps) {
  const [state, dispatch] = useReducer(reduce, initialState);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = state.kind === "thinking";

  const submit = useCallback(async () => {
    const text = inputRef.current?.value?.trim() ?? "";
    if (!text || isBusy) return;
    dispatch({ type: "submit", utterance: text });
    try {
      const result = await extractCoord(text);
      dispatch({ type: "result", result });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      dispatch({ type: "error", message });
    }
  }, [isBusy]);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, []);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      reset();
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [state.kind]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 w-full">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <textarea
          ref={inputRef}
          disabled={isBusy}
          placeholder={placeholder ?? "type what you want to observe…"}
          rows={2}
          spellCheck={false}
          className="w-full bg-transparent outline-none resize-none text-lg border-b border-dark/30 focus:border-primary py-2 px-1 placeholder:opacity-40 disabled:opacity-50"
          onKeyDown={onKey}
        />

        <div className="text-[10px] uppercase tracking-widest opacity-40 min-h-[1em]">
          {state.kind === "blank" &&
            (domainHint ??
              "zoom-climb · enter observes · esc returns to blank")}
          {state.kind === "thinking" && `observing "${state.utterance}"…`}
          {state.kind === "rendered" &&
            (state.result.caption ??
              `${state.result.leaves.length} leaf${
                state.result.leaves.length === 1 ? "" : "s"
              }`)}
          {state.kind === "error" && `error · ${state.message}`}
        </div>

        {state.kind === "rendered" && (
          <div className="flex flex-col gap-4">
            {state.result.leaves.map((payload: LeafPayload, i: number) => {
              const Leaf = leafRegistry[payload.leaf];
              return <Leaf key={i} payload={payload} />;
            })}
            <button
              onClick={reset}
              className="self-start text-xs opacity-60 hover:opacity-100 underline underline-offset-4 mt-2"
            >
              clear &amp; return to blank
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
