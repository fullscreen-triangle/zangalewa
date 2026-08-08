/**
 * Item 2 — the panel that drops into Buhera OS web.
 *
 * This is the runtime-assistant shape rather than the standalone-tool shape.
 * A subtask arrives already decomposed into operations by whichever module
 * owns it: one operation per DSL, each with its own instructions. Zangalewa
 * fills the node's chunk bag by writing code for each, and hands the bag
 * back. That is the whole interaction.
 *
 * The XIC-peak-annotation case is the canonical one: one subtask, five
 * operations in five DSLs, five chunks on one node.
 *
 * What this panel does NOT do, and must not be extended to do:
 *   - execute anything (there is no run button anywhere in this module),
 *   - order the operations (a node's chunks are a bag; the runtime executes
 *     all of them and judges nothing),
 *   - decide which operations a subtask needs (the calling module decided
 *     that before this panel was ever mounted),
 *   - pick a winner among drafts that compile.
 *
 * The host mounts it, supplies operations, and receives the bag via
 * onBagReady. Everything else is the host's business.
 */

import { useCallback, useMemo, useState } from "react";
import type { Chunk, Extent, GenerateResult } from "@/lib/dsl/types";

/** One operation the calling module wants code for. */
export interface Operation {
  /** Stable id from the host, echoed back on the bag. */
  id: string;
  dslId: string;
  /** Natural-language instructions for this operation alone. */
  instructions: string;
  extent?: Extent;
}

/** One operation's outcome. `chunks` may hold several accepted realisations. */
export interface BagEntry {
  operationId: string;
  dslId: string;
  chunks: Chunk[];
  error?: string;
}

export interface NodePanelProps {
  /** Host-supplied label for the subtask this node stands for. */
  nodeLabel?: string;
  operations: Operation[];
  /** Fires once every operation has settled. */
  onBagReady?: (bag: BagEntry[]) => void;
  /** Drafts per operation. Every draft that compiles enters the bag. */
  drafts?: number;
}

type OpState =
  | { status: "idle" }
  | { status: "writing" }
  | { status: "done"; result: GenerateResult }
  | { status: "failed"; message: string };

export default function NodePanel({
  nodeLabel,
  operations,
  onBagReady,
  drafts = 1,
}: NodePanelProps) {
  const [states, setStates] = useState<Record<string, OpState>>({});
  const [busy, setBusy] = useState(false);

  const stateOf = useCallback(
    (id: string): OpState => states[id] ?? { status: "idle" },
    [states]
  );

  const fillBag = useCallback(async () => {
    if (busy || operations.length === 0) return;
    setBusy(true);
    setStates(
      Object.fromEntries(
        operations.map((op) => [op.id, { status: "writing" } as OpState])
      )
    );

    // Operations are independent — nothing here composes them, so they run
    // concurrently and land in whatever order they finish.
    const settled = await Promise.all(
      operations.map(async (op): Promise<BagEntry> => {
        try {
          const res = await fetch("/api/zangalewa/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dslId: op.dslId,
              instructions: op.instructions,
              extent: op.extent ?? "chunk",
              drafts,
            }),
          });
          const body = await res.json();
          if (!("chunks" in body)) {
            throw new Error(body?.error ?? `HTTP ${res.status}`);
          }
          const result = body as GenerateResult;
          setStates((s) => ({ ...s, [op.id]: { status: "done", result } }));
          return {
            operationId: op.id,
            dslId: op.dslId,
            chunks: result.chunks,
            error: result.ok ? undefined : result.error,
          };
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          setStates((s) => ({ ...s, [op.id]: { status: "failed", message } }));
          return { operationId: op.id, dslId: op.dslId, chunks: [], error: message };
        }
      })
    );

    setBusy(false);
    onBagReady?.(settled);
  }, [busy, operations, drafts, onBagReady]);

  const totalChunks = useMemo(
    () =>
      Object.values(states).reduce(
        (n, s) => n + (s.status === "done" ? s.result.chunks.length : 0),
        0
      ),
    [states]
  );

  const settledCount = useMemo(
    () =>
      Object.values(states).filter(
        (s) => s.status === "done" || s.status === "failed"
      ).length,
    [states]
  );

  return (
    <section className="space-y-3 rounded border border-white/15 p-4 text-sm">
      <header className="flex items-baseline gap-3">
        <h3 className="font-mono text-xs uppercase tracking-wide opacity-70">
          node{nodeLabel ? ` · ${nodeLabel}` : ""}
        </h3>
        <span className="text-xs opacity-50">
          {operations.length}{" "}
          {operations.length === 1 ? "operation" : "operations"}
          {settledCount > 0 && ` · ${totalChunks} chunks in bag`}
        </span>
        <button
          onClick={fillBag}
          disabled={busy || operations.length === 0}
          className="ml-auto rounded border border-white/30 px-3 py-1 text-xs hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "writing…" : "Write chunks"}
        </button>
      </header>

      <ul className="space-y-2">
        {operations.map((op) => {
          const st = stateOf(op.id);
          return (
            <li key={op.id} className="rounded border border-white/10">
              <div className="flex items-center gap-3 border-b border-white/10 px-3 py-1.5 text-xs">
                <span className="font-mono opacity-80">{op.dslId}</span>
                <span className="truncate opacity-50">{op.instructions}</span>
                <span className="ml-auto shrink-0 opacity-70">
                  <OpBadge state={st} />
                </span>
              </div>

              {st.status === "done" &&
                st.result.chunks.map((c, i) => (
                  <div key={i} className="border-t border-white/5 first:border-t-0">
                    <div className="px-3 pt-1.5 text-[10px] opacity-40">
                      {c.model} · {c.repairs} repairs · {c.elapsedMs} ms
                    </div>
                    <pre className="overflow-x-auto px-3 pb-2 font-mono text-xs leading-relaxed">
                      {c.code}
                    </pre>
                  </div>
                ))}

              {st.status === "done" && !st.result.ok && (
                <p className="px-3 py-2 text-xs text-red-400">
                  {st.result.error}
                </p>
              )}
              {st.status === "failed" && (
                <p className="px-3 py-2 text-xs text-red-400">{st.message}</p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs opacity-40">
        Chunks are a bag, not a sequence — the OS executes all of them and
        judges none. Nothing is executed here.
      </p>
    </section>
  );
}

function OpBadge({ state }: { state: OpState }) {
  switch (state.status) {
    case "idle":
      return <span className="opacity-40">pending</span>;
    case "writing":
      return <span className="opacity-70">writing…</span>;
    case "failed":
      return <span className="text-red-400">failed</span>;
    case "done":
      return state.result.ok ? (
        <span className="text-emerald-400">
          {state.result.chunks.length}{" "}
          {state.result.chunks.length === 1 ? "chunk" : "chunks"}
        </span>
      ) : (
        <span className="text-red-400">rejected</span>
      );
  }
}
