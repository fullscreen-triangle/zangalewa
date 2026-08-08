/**
 * /zangalewa — the web tool, two items.
 *
 *   1. Code tool   — a user writes a prompt, gets DSL code back. No execution.
 *   2. Node panel  — the shape that drops into Buhera OS web: a subtask's
 *                    operations become a node's chunk bag.
 *
 * Item 2's operations are hard-coded here as a demonstration. In the OS the
 * calling module supplies them; this page is standing in for that module so
 * the panel can be exercised before integration.
 */

import Head from "next/head";
import { useState } from "react";
import CodeTool from "@/components/zangalewa/CodeTool";
import NodePanel, { type Operation, type BagEntry } from "@/components/zangalewa/NodePanel";

type Tab = "code" | "node";

/**
 * A stand-in for what a module would hand over. Only vaHera is registered
 * today, so all four operations target it; when shapeshifter, search,
 * scheduler and purpose compilers are wired into the registry, the dslId
 * values change and nothing else does.
 */
const DEMO_OPERATIONS: Operation[] = [
  {
    id: "op-region",
    dslId: "vahera",
    instructions:
      "create a memory region at S(0.4, 0.2, 0.7) for holding peak annotations",
  },
  {
    id: "op-store",
    dslId: "vahera",
    instructions:
      'store two facts: "xic_peak_412" is "retention time 4.12 min, m/z 760.55", and "lipid_class" is "phosphatidylcholine"',
  },
  {
    id: "op-search",
    dslId: "vahera",
    instructions:
      'find the three memories nearest to "phosphatidylcholine 760" and then list all memories',
  },
  {
    id: "op-verify",
    dslId: "vahera",
    instructions:
      "run the demon sort, verify with the controller, then print kernel stats",
  },
];

export default function ZangalewaPage() {
  const [tab, setTab] = useState<Tab>("code");
  const [bag, setBag] = useState<BagEntry[] | null>(null);

  return (
    <>
      <Head>
        <title>zangalewa · code generation</title>
        <meta
          name="description"
          content="Instructions in, DSL code out. Generation only — nothing is executed."
        />
      </Head>

      <main className="min-h-screen bg-black text-light">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <header className="mb-8">
            <h1 className="font-mono text-lg">zangalewa</h1>
            <p className="mt-1 text-sm opacity-60">
              The OS&apos;s only AI module. It turns instructions into DSL code
              and does nothing else — no execution, no planning, no ordering.
              The DSL&apos;s own compiler is the only judge applied here.
            </p>
          </header>

          <nav className="mb-6 flex gap-2 text-sm">
            <TabButton active={tab === "code"} onClick={() => setTab("code")}>
              Code tool
            </TabButton>
            <TabButton active={tab === "node"} onClick={() => setTab("node")}>
              Node panel
            </TabButton>
          </nav>

          {tab === "code" && (
            <div className="rounded border border-white/15">
              <CodeTool />
            </div>
          )}

          {tab === "node" && (
            <div className="space-y-4">
              <p className="text-sm opacity-60">
                A subtask arrives already split into operations by whichever
                module owns it. Zangalewa writes a chunk for each and hands
                back the bag. This page supplies the operations only because
                there is no module here yet to supply them.
              </p>

              <NodePanel
                nodeLabel="annotate xic peak"
                operations={DEMO_OPERATIONS}
                onBagReady={setBag}
              />

              {bag && (
                <details className="rounded border border-white/10 p-3 text-xs">
                  <summary className="cursor-pointer opacity-60">
                    bag handed to host ({bag.reduce((n, e) => n + e.chunks.length, 0)}{" "}
                    chunks)
                  </summary>
                  <pre className="mt-3 overflow-x-auto font-mono leading-relaxed opacity-70">
                    {JSON.stringify(bag, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded border px-3 py-1.5 ${
        active
          ? "border-white/50 bg-white/10"
          : "border-white/15 opacity-60 hover:opacity-100"
      }`}
    >
      {children}
    </button>
  );
}
