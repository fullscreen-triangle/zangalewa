import { useEffect, useRef } from "react";

import * as dc from "dc";

/** Loosely-typed dc.js chart — the lib ships without TS types. */
type DCChart = { render: () => unknown };

/**
 * Mount a dc.js chart into a React-managed div.
 *
 * dc.js 4.x requires the parent element at construction time
 * (`dc.pieChart(parent)`), not via a later `.anchor()` call. The factory
 * therefore receives the host element as its single argument and is
 * expected to pass it straight into whichever dc constructor it uses.
 *
 * Crossfilter + the dc chart registry are the brushing-link mechanism —
 * any chart filtering its dimension automatically triggers a redraw on
 * every other registered chart sharing the same crossfilter instance.
 */
export function useDCChart<T extends DCChart>(
  factory: (host: HTMLElement) => T,
  deps: ReadonlyArray<unknown> = []
) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<T | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Reset the host node so React strict-mode double-render in dev
    // doesn't leave two SVGs stacked.
    ref.current.innerHTML = "";

    const chart = factory(ref.current);
    chart.render();
    chartRef.current = chart;

    return () => {
      try {
        dc.chartRegistry.deregister(chart);
      } catch {
        // chart may not have been registered if factory threw mid-build
      }
      if (ref.current) ref.current.innerHTML = "";
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/** Render every registered chart — useful after async data updates. */
export function renderAll(): void {
  dc.renderAll();
}

/** Re-draw every registered chart without resetting state. */
export function redrawAll(): void {
  dc.redrawAll();
}

/** Globally clear all dc filters — wires up to the "reset all" button. */
export function filterAll(): void {
  dc.filterAll();
  dc.renderAll();
}
