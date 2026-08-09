/**
 * Item 1 — the code tool.
 *
 * A user writes a prompt, picks a DSL, and gets back source code. NO
 * EXECUTION: there is no run button, no output pane, no interpreter. The
 * only verdict shown is the compiler's — did this parse — because that is
 * the only verdict this module is entitled to give.
 *
 * When more than one draft compiles, ALL of them are shown side by side.
 * That is not a UI convenience; two accepted drafts are two valid
 * realisations and nothing here knows which one matters.
 *
 * Written as a component rather than a page so Item 2 can embed the same
 * surface inside the OS shell without a second implementation.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GenerateResult, Extent } from "@/lib/dsl/types";
import type { DslsResponse } from "@/pages/api/zangalewa/dsls";

export interface CodeToolProps {
  /** Pre-select a DSL and hide the picker — used when a module embeds this. */
  lockedDslId?: string;
  /** Pre-select an extent and hide the picker. */
  lockedExtent?: Extent;
  /** Seed the prompt box. */
  initialInstructions?: string;
  /** Called with every accepted chunk when generation succeeds. */
  onChunks?: (result: GenerateResult) => void;
  /** Compact chrome for embedding. */
  dense?: boolean;
}

export default function CodeTool({
  lockedDslId,
  lockedExtent,
  initialInstructions = "",
  onChunks,
  dense = false,
}: CodeToolProps) {
  const [catalog, setCatalog] = useState<DslsResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [dslId, setDslId] = useState(lockedDslId ?? "");
  const [extent, setExtent] = useState<Extent>(lockedExtent ?? "script");
  const [instructions, setInstructions] = useState(initialInstructions);
  const [drafts, setDrafts] = useState(1);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/zangalewa/dsls");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as DslsResponse;
        if (cancelled) return;
        setCatalog(body);
        if (!lockedDslId && !dslId && body.dsls.length > 0) {
          setDslId(body.dsls[0].id);
        }

        // Warm the local model's prompt cache while the user is still
        // typing. The grounding pack costs ~124s to evaluate cold and
        // ~1s warm, so paying it now is the difference between a first
        // generation that feels broken and one that feels instant.
        //
        // No extent is sent, so both are warmed: the user can switch the
        // extent picker before hitting Generate, and script and chunk share
        // no cached prefix.
        //
        // Fire-and-forget — a failed warm only costs a slow first request.
        if (body.providers.some((p) => p.id === "ollama" && p.available)) {
          fetch("/api/zangalewa/warm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dslId: lockedDslId ?? body.dsls[0]?.id }),
          }).catch(() => {});
        }
      } catch (e) {
        if (!cancelled) {
          setCatalogError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedDslId]);

  const selected = useMemo(
    () => catalog?.dsls.find((d) => d.id === dslId) ?? null,
    [catalog, dslId]
  );

  const anyProvider = catalog?.providers.some((p) => p.available) ?? false;

  const submit = useCallback(async () => {
    if (!dslId || !instructions.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/zangalewa/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dslId, instructions, extent, drafts }),
      });
      const body = await res.json();
      if (!res.ok && !("chunks" in body)) {
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const generated = body as GenerateResult;
      setResult(generated);
      if (generated.ok) onChunks?.(generated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [dslId, instructions, extent, drafts, busy, onChunks]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const pad = dense ? "p-3" : "p-6";

  return (
    <section className={`${pad} space-y-4 text-sm`}>
      {catalogError && (
        <p className="text-red-500">
          could not load DSL catalog: {catalogError}
        </p>
      )}

      {catalog && !anyProvider && (
        <p className="rounded border border-amber-600/40 bg-amber-600/10 px-3 py-2 text-amber-400">
          No model provider is configured. Set one of{" "}
          <code>OLLAMA_URL</code>, <code>GEMINI_API_KEY</code>,{" "}
          <code>OPENAI_API_KEY</code>, <code>ANTHROPIC_API_KEY</code> in{" "}
          <code>.env.local</code> — generation will fail until then.
        </p>
      )}

      {/* ── controls ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        {!lockedDslId && (
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide opacity-60">
              DSL
            </span>
            <select
              value={dslId}
              onChange={(e) => setDslId(e.target.value)}
              className="rounded border border-white/20 bg-transparent px-2 py-1"
            >
              {(catalog?.dsls ?? []).map((d) => (
                <option key={d.id} value={d.id} className="bg-black">
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {!lockedExtent && (
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide opacity-60">
              Extent
            </span>
            <select
              value={extent}
              onChange={(e) => setExtent(e.target.value as Extent)}
              className="rounded border border-white/20 bg-transparent px-2 py-1"
            >
              <option value="script" className="bg-black">
                script — complete program
              </option>
              <option
                value="chunk"
                disabled={selected ? !selected.acceptsFragment : false}
                className="bg-black"
              >
                chunk — one subtask&apos;s share
              </option>
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide opacity-60">
            Drafts
          </span>
          <input
            type="number"
            min={1}
            max={8}
            value={drafts}
            onChange={(e) =>
              setDrafts(Math.max(1, Math.min(8, Number(e.target.value) || 1)))
            }
            className="w-16 rounded border border-white/20 bg-transparent px-2 py-1"
          />
        </label>

        {selected && !selected.grounded && (
          <span className="pb-1 text-xs text-amber-400">
            no knowledge pack for {selected.label} — quality will be poor
          </span>
        )}
      </div>

      {/* ── prompt ───────────────────────────────────────────────── */}
      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wide opacity-60">
          Instructions
        </span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onKeyDown={onKeyDown}
          rows={dense ? 4 : 7}
          spellCheck={false}
          placeholder="describe what the code should do — e.g. create a memory region at S(0.2, 0.5, 0.1), store two facts about p53, then find the nearest two to 'tumour suppressor'"
          className="w-full resize-y rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-white/50"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy || !instructions.trim() || !dslId}
          className="rounded border border-white/30 px-4 py-1.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "generating…" : "Generate"}
        </button>
        <span className="text-xs opacity-50">⌘/Ctrl + Enter</span>
        <span className="ml-auto text-xs opacity-40">
          generation only — nothing is executed
        </span>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {/* ── results ──────────────────────────────────────────────── */}
      {result && !result.ok && (
        <div className="space-y-3">
          <p className="text-red-500">{result.error}</p>
          {result.rejected.map((r, i) => (
            <RejectedCard key={i} rejected={r} index={i} />
          ))}
        </div>
      )}

      {/* A dead provider is worth saying out loud even when the bag is
          non-empty — otherwise a revoked key looks like a working setup. */}
      {result?.providerErrors?.length ? (
        <ul className="rounded border border-amber-600/40 bg-amber-600/10 px-3 py-2 text-xs text-amber-400">
          {result.providerErrors.map((e, i) => (
            <li key={i}>
              {e.model} unavailable — {e.message}
            </li>
          ))}
        </ul>
      ) : null}

      {result?.ok && (
        <div className="space-y-4">
          <p className="text-xs opacity-60">
            {result.chunks.length} accepted{" "}
            {result.chunks.length === 1 ? "draft" : "drafts"}
            {result.rejected.length > 0 &&
              ` · ${result.rejected.length} rejected`}
            {result.chunks.length > 1 &&
              " — every one compiles; nothing here ranks them"}
          </p>
          {result.chunks.map((c, i) => (
            <article
              key={i}
              className="rounded border border-emerald-600/40 bg-emerald-600/5"
            >
              <header className="flex items-center gap-3 border-b border-white/10 px-3 py-1.5 text-xs opacity-70">
                <span className="font-mono">{c.model}</span>
                <span>
                  {c.repairs === 0
                    ? "compiled first try"
                    : `${c.repairs} repair ${c.repairs === 1 ? "round" : "rounds"}`}
                </span>
                <span>{c.elapsedMs} ms</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(c.code)}
                  className="ml-auto rounded border border-white/20 px-2 py-0.5 hover:bg-white/10"
                >
                  copy
                </button>
              </header>
              <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
                {c.code}
              </pre>
            </article>
          ))}

          {result.rejected.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer opacity-60">
                show {result.rejected.length} rejected
              </summary>
              <div className="mt-3 space-y-3">
                {result.rejected.map((r, i) => (
                  <RejectedCard key={i} rejected={r} index={i} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function RejectedCard({
  rejected,
  index,
}: {
  rejected: GenerateResult["rejected"][number];
  index: number;
}) {
  return (
    <article
      key={index}
      className="rounded border border-red-600/40 bg-red-600/5"
    >
      <header className="flex items-center gap-3 border-b border-white/10 px-3 py-1.5 text-xs opacity-70">
        <span className="font-mono">{rejected.model}</span>
        <span>rejected after {rejected.repairs} repair rounds</span>
      </header>
      <ul className="space-y-0.5 px-3 py-2 text-xs text-red-400">
        {rejected.errors.map((e, i) => (
          <li key={i}>
            {e.line != null ? `line ${e.line}: ` : ""}
            {e.message}
          </li>
        ))}
      </ul>
      {rejected.code && (
        <pre className="overflow-x-auto border-t border-white/10 p-3 font-mono text-xs leading-relaxed opacity-60">
          {rejected.code}
        </pre>
      )}
    </article>
  );
}
