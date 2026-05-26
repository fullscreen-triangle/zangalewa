import Head from "next/head";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { DeskIndex, RepoIndexEntry } from "@/lib/desk/types";
import DashboardErrorBoundary from "@/components/desk/ErrorBoundary";

/**
 * /desk
 *
 * The visual exploration view of the desk substrate. Loads the cached
 * index from /api/desk and hands it to the dashboard component. The
 * dashboard itself is dynamically imported because dc.js manipulates the
 * DOM directly during construction — it cannot run during SSR.
 */

const DeskDashboard = dynamic(() => import("@/components/desk/DeskDashboard"), {
  ssr: false,
  loading: () => (
    <p className="text-sm opacity-60 p-8">Loading dashboard…</p>
  ),
});

export default function DeskPage() {
  const [data, setData] = useState<RepoIndexEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/desk?stats=1", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
        const body = (await res.json()) as DeskIndex;
        if (!cancelled) setData(body.repos);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Head>
        <title>desk · zoom-climb</title>
      </Head>
      <main className="min-h-screen bg-black text-light">
        {error && (
          <p className="p-8 text-sm text-red-600">
            failed to load index: {error}
            <br />
            try <code>curl http://localhost:3000/api/desk?rebuild=1</code> first.
          </p>
        )}
        {!error && !data && (
          <p className="p-8 text-sm opacity-60">
            Fetching desk index from /api/desk…
          </p>
        )}
        {data && data.length === 0 && (
          <p className="p-8 text-sm opacity-60">
            Index has 0 repos. Hit{" "}
            <code>/api/desk?rebuild=1</code> to build it.
          </p>
        )}
        {data && data.length > 0 && (
          <DashboardErrorBoundary>
            <DeskDashboard data={data} />
          </DashboardErrorBoundary>
        )}
      </main>
    </>
  );
}
