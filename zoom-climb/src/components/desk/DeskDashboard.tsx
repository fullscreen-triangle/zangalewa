"use client";

import { useMemo, useState, useEffect } from "react";
import crossfilter from "crossfilter2";
import * as d3 from "d3";
import * as dc from "dc";

import type { RepoIndexEntry } from "@/lib/desk/types";
import { useDCChart, filterAll } from "./useDCChart";
import {
  transformIndex,
  logSizeBucket,
  starsBucket,
  coordDecile,
  type DeskRow,
} from "./transform";

/**
 * DeskDashboard — 17 crossfilter-linked charts over the desk index.
 *
 * Architectural note: all charts share one `crossfilter` instance and
 * the dc.js global chart registry. Brushing or clicking any chart
 * filters its dimension; every other chart redraws against the
 * filtered crossfilter view. No manual coordination is needed — dc.js
 * is the linked-brushing coordinator.
 *
 * Pattern: dimensions + groups live in one `useMemo` at the top of the
 * component so they're stable across re-renders. Each chart factory
 * inside `useDCChart` closes over them and re-builds only on data
 * change.
 */

type Props = { data: RepoIndexEntry[] };

export default function DeskDashboard({ data }: Props) {
  const rows = useMemo(() => transformIndex(data), [data]);
  const cx = useMemo(() => crossfilter(rows), [rows]);

  const [filteredCount, setFilteredCount] = useState(rows.length);

  // -------------- dimensions + groups (stable for the cx lifetime) ----------
  const dims = useMemo(() => {
    const all = cx.groupAll();
    return {
      all,
      // categorical
      language: cx.dimension((d: DeskRow) => d.language_or_none),
      activity: cx.dimension((d: DeskRow) => d.activity_bucket),
      surface: cx.dimension((d: DeskRow) => d.surface_kind),
      age: cx.dimension((d: DeskRow) => d.age_bucket),
      stars: cx.dimension((d: DeskRow) => starsBucket(d.stargazers_count)),
      topicCount: cx.dimension((d: DeskRow) =>
        d.topic_count === 0
          ? "0"
          : d.topic_count === 1
          ? "1"
          : d.topic_count <= 3
          ? "2-3"
          : d.topic_count <= 5
          ? "4-5"
          : "6+"
      ),
      // array-valued (each topic counted separately)
      topic: cx.dimension((d: DeskRow) => d.topics, true),
      // temporal
      pushedMonth: cx.dimension((d: DeskRow) => d.pushed_month),
      createdQuarter: cx.dimension((d: DeskRow) => d.created_quarter),
      // numerical (binned)
      sizeBucket: cx.dimension((d: DeskRow) => logSizeBucket(d.size)),
      sk: cx.dimension((d: DeskRow) => coordDecile(d.coord.S_k)),
      st: cx.dimension((d: DeskRow) => coordDecile(d.coord.S_t)),
      se: cx.dimension((d: DeskRow) => coordDecile(d.coord.S_e)),
      readmeLen: cx.dimension((d: DeskRow) =>
        d.readme_length === 0
          ? "empty"
          : d.readme_length < 200
          ? "tiny"
          : d.readme_length < 600
          ? "short"
          : d.readme_length < 1500
          ? "medium"
          : "long"
      ),
      descLen: cx.dimension((d: DeskRow) =>
        d.description_length === 0
          ? "(none)"
          : d.description_length < 50
          ? "short"
          : d.description_length < 100
          ? "medium"
          : "long"
      ),
      // for the data table — keys repos by their pushed_date desc
      tableSort: cx.dimension(
        (d: DeskRow) => -d.pushed_date.getTime()
      ),
    };
  }, [cx]);

  // Drive the React-side filtered-count off a tiny hidden dc.numberDisplay.
  // The renderlet fires after every brush/click, so React stays in sync
  // with crossfilter's current filtered view.
  useEffect(() => {
    const allCount = dims.all.reduceCount() as unknown as {
      value(): number;
    };
    const handler = () => setFilteredCount(allCount.value());
    const tickerHost = document.createElement("div");
    document.body.appendChild(tickerHost);
    const ticker = dc
      .numberDisplay(tickerHost)
      .group(allCount)
      .formatNumber(d3.format("d"));
    ticker.on("renderlet", handler);
    ticker.render();
    handler();
    return () => {
      dc.chartRegistry.deregister(ticker);
      tickerHost.remove();
    };
  }, [dims]);

  // ============== chart factories ==========================================

  // 1. number display — wired separately above; rendered via filteredCount

  // 2. Language pie
  const langPie = useDCChart((host) => {
    const grp = dims.language.group();
    return dc
      .pieChart(host)
      .width(220)
      .height(220)
      .innerRadius(40)
      .dimension(dims.language)
      .group(grp)
      .ordering((d: { value: number }) => -d.value)
      .legend(dc.legend().x(0).y(180).itemHeight(10).gap(4));
  }, [dims]);

  // 3. Activity recency pie
  const activityPie = useDCChart((host) => {
    const grp = dims.activity.group();
    const order = ["active", "recent", "stale", "dormant"];
    return dc
      .pieChart(host)
      .width(220)
      .height(220)
      .innerRadius(40)
      .dimension(dims.activity)
      .group(grp)
      .ordering((d: { key: string }) => order.indexOf(d.key));
  }, [dims]);

  // 4. Surface-kind pie
  const surfacePie = useDCChart((host) => {
    const grp = dims.surface.group();
    return dc
      .pieChart(host)
      .width(220)
      .height(220)
      .innerRadius(40)
      .dimension(dims.surface)
      .group(grp);
  }, [dims]);

  // 5. Repo age row chart
  const ageRow = useDCChart((host) => {
    const grp = dims.age.group();
    const order = ["fresh", "<6mo", "<1y", "<2y", "older"];
    const chart = dc
      .rowChart(host)
      .width(280)
      .height(200)
      .margins({ top: 10, right: 10, bottom: 25, left: 50 })
      .dimension(dims.age)
      .group(grp)
      .ordering((d: { key: string }) => order.indexOf(d.key))
      .elasticX(true);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  // 6. Pushed-month time-series bar chart (range chart)
  const pushedBar = useDCChart((host) => {
    const grp = dims.pushedMonth.group().reduceCount();
    const dates = rows.map((r) => r.pushed_month).filter(Boolean) as Date[];
    const xMin = dates.length ? d3.min(dates)! : new Date(2020, 0, 1);
    const xMax = dates.length ? d3.max(dates)! : new Date();
    return dc
      .barChart(host)
      .width(1180)
      .height(180)
      .margins({ top: 10, right: 30, bottom: 30, left: 40 })
      .dimension(dims.pushedMonth)
      .group(grp)
      .x(
        d3
          .scaleTime()
          .domain([d3.timeMonth.offset(xMin, -1), d3.timeMonth.offset(xMax, 1)])
      )
      .xUnits(d3.timeMonths)
      .round(d3.timeMonth.round)
      .alwaysUseRounding(true)
      .centerBar(true)
      .gap(2)
      .elasticY(true)
      .renderHorizontalGridLines(true)
      .brushOn(true);
  }, [dims, rows]);

  // 7. Created-quarter bar chart
  const createdBar = useDCChart((host) => {
    const grp = dims.createdQuarter.group().reduceCount();
    const dates = rows.map((r) => r.created_quarter).filter(Boolean) as Date[];
    const xMin = dates.length ? d3.min(dates)! : new Date(2020, 0, 1);
    const xMax = dates.length ? d3.max(dates)! : new Date();
    return dc
      .barChart(host)
      .width(1180)
      .height(160)
      .margins({ top: 10, right: 30, bottom: 30, left: 40 })
      .dimension(dims.createdQuarter)
      .group(grp)
      .x(
        d3
          .scaleTime()
          .domain([
            d3.timeMonth.offset(xMin, -3),
            d3.timeMonth.offset(xMax, 3),
          ])
      )
      .xUnits((start: Date, end: Date) =>
        Math.max(1, Math.ceil(d3.timeMonth.count(start, end) / 3))
      )
      .round(d3.timeMonth.round)
      .alwaysUseRounding(true)
      .centerBar(true)
      .gap(4)
      .elasticY(true)
      .renderHorizontalGridLines(true)
      .brushOn(true);
  }, [dims, rows]);

  // 8. Stars row chart
  const starsRow = useDCChart((host) => {
    const grp = dims.stars.group();
    const order = ["0", "1", "2-5", "6-20", "21+"];
    const chart = dc
      .rowChart(host)
      .width(280)
      .height(200)
      .margins({ top: 10, right: 10, bottom: 25, left: 40 })
      .dimension(dims.stars)
      .group(grp)
      .ordering((d: { key: string }) => order.indexOf(d.key))
      .elasticX(true);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  // 9. Topic-count row chart
  const topicCountRow = useDCChart((host) => {
    const grp = dims.topicCount.group();
    const order = ["0", "1", "2-3", "4-5", "6+"];
    const chart = dc
      .rowChart(host)
      .width(280)
      .height(200)
      .margins({ top: 10, right: 10, bottom: 25, left: 40 })
      .dimension(dims.topicCount)
      .group(grp)
      .ordering((d: { key: string }) => order.indexOf(d.key))
      .elasticX(true);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  // 10. Size bucket bar chart (log-binned KB)
  const sizeBar = useDCChart((host) => {
    const grp = dims.sizeBucket.group().reduceCount();
    const chart = dc
      .barChart(host)
      .width(380)
      .height(180)
      .margins({ top: 10, right: 20, bottom: 30, left: 40 })
      .dimension(dims.sizeBucket)
      .group(grp)
      .x(d3.scaleLinear().domain([-0.5, 6.5]))
      .xUnits(() => 7)
      .centerBar(true)
      .gap(8)
      .elasticY(true)
      .renderHorizontalGridLines(true);
    chart
      .xAxis()
      .tickFormat((d: d3.NumberValue) =>
        Number(d) === 0 ? "0 KB" : `10^${Number(d)}`
      );
    return chart;
  }, [dims]);

  // 11. S_k decile histogram
  const skBar = useDCChart((host) => {
    const grp = dims.sk.group().reduceCount();
    return dc
      .barChart(host)
      .width(380)
      .height(160)
      .margins({ top: 10, right: 20, bottom: 30, left: 40 })
      .dimension(dims.sk)
      .group(grp)
      .x(d3.scaleLinear().domain([-0.05, 1.05]))
      .xUnits(() => 11)
      .centerBar(true)
      .gap(4)
      .elasticY(true)
      .renderHorizontalGridLines(true);
  }, [dims]);

  // 12. S_t decile histogram
  const stBar = useDCChart((host) => {
    const grp = dims.st.group().reduceCount();
    return dc
      .barChart(host)
      .width(380)
      .height(160)
      .margins({ top: 10, right: 20, bottom: 30, left: 40 })
      .dimension(dims.st)
      .group(grp)
      .x(d3.scaleLinear().domain([-0.05, 1.05]))
      .xUnits(() => 11)
      .centerBar(true)
      .gap(4)
      .elasticY(true)
      .renderHorizontalGridLines(true);
  }, [dims]);

  // 13. S_e decile histogram
  const seBar = useDCChart((host) => {
    const grp = dims.se.group().reduceCount();
    return dc
      .barChart(host)
      .width(380)
      .height(160)
      .margins({ top: 10, right: 20, bottom: 30, left: 40 })
      .dimension(dims.se)
      .group(grp)
      .x(d3.scaleLinear().domain([-0.05, 1.05]))
      .xUnits(() => 11)
      .centerBar(true)
      .gap(4)
      .elasticY(true)
      .renderHorizontalGridLines(true);
  }, [dims]);

  // 14. README length row
  const readmeLenRow = useDCChart((host) => {
    const grp = dims.readmeLen.group();
    const order = ["empty", "tiny", "short", "medium", "long"];
    const chart = dc
      .rowChart(host)
      .width(280)
      .height(200)
      .margins({ top: 10, right: 10, bottom: 25, left: 50 })
      .dimension(dims.readmeLen)
      .group(grp)
      .ordering((d: { key: string }) => order.indexOf(d.key))
      .elasticX(true);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  // 15. Description length row
  const descLenRow = useDCChart((host) => {
    const grp = dims.descLen.group();
    const order = ["(none)", "short", "medium", "long"];
    const chart = dc
      .rowChart(host)
      .width(280)
      .height(200)
      .margins({ top: 10, right: 10, bottom: 25, left: 50 })
      .dimension(dims.descLen)
      .group(grp)
      .ordering((d: { key: string }) => order.indexOf(d.key))
      .elasticX(true);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  // 16. Top topics row chart (top 25 by frequency)
  const topicsRow = useDCChart((host) => {
    const grp = dims.topic.group();
    // Filter out single-use topics with a fake group to keep the list short.
    const top25 = topNGroup(grp, 25);
    const chart = dc
      .rowChart(host)
      .width(380)
      .height(500)
      .margins({ top: 10, right: 10, bottom: 25, left: 10 })
      .dimension(dims.topic)
      .group(top25 as never)
      .elasticX(true);
    chart.xAxis().ticks(4);
    return chart;
  }, [dims]);

  // 17. Data table — wired separately because dc.dataTable uses its own
  // beginSlice/endSlice paging instead of group()
  const tableHost = useDCChart((host) => {
    return dc
      .dataTable(host)
      .dimension(dims.tableSort)
      .section((d: DeskRow) => d.activity_bucket)
      .size(63)
      .columns([
        { label: "Name", format: (d: DeskRow) => d.name },
        { label: "Lang", format: (d: DeskRow) => d.language ?? "—" },
        {
          label: "Topics",
          format: (d: DeskRow) => d.topics.slice(0, 5).join(" · "),
        },
        { label: "★", format: (d: DeskRow) => d.stargazers_count },
        {
          label: "Pushed",
          format: (d: DeskRow) =>
            d.pushed_date.toISOString().slice(0, 10),
        },
        {
          label: "S",
          format: (d: DeskRow) =>
            `(${d.coord.S_k.toFixed(2)}, ${d.coord.S_t.toFixed(
              2
            )}, ${d.coord.S_e.toFixed(2)})`,
        },
      ])
      .sortBy((d: DeskRow) => -d.pushed_date.getTime())
      .order(d3.ascending);
  }, [dims]);

  return (
    <div className="w-full max-w-[1280px] mx-auto px-6 py-8 flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] opacity-50">
            zoom-climb · desk
          </div>
          <h1 className="text-2xl mt-1">
            {filteredCount} of {rows.length} repos
          </h1>
        </div>
        <button
          onClick={() => filterAll()}
          className="text-xs underline underline-offset-2 opacity-60 hover:opacity-100"
        >
          reset all filters
        </button>
      </header>

      {/* Row 1: small categorical charts */}
      <section className="grid grid-cols-4 gap-4">
        <ChartCard title="Language">
          <div ref={langPie} className="dc-chart" />
        </ChartCard>
        <ChartCard title="Activity">
          <div ref={activityPie} className="dc-chart" />
        </ChartCard>
        <ChartCard title="Surface kind">
          <div ref={surfacePie} className="dc-chart" />
        </ChartCard>
        <ChartCard title="Repo age">
          <div ref={ageRow} className="dc-chart" />
        </ChartCard>
      </section>

      {/* Row 2: pushed time-series */}
      <ChartCard title="Pushes by month">
        <div ref={pushedBar} className="dc-chart" />
      </ChartCard>

      {/* Row 3: created time-series */}
      <ChartCard title="Repos created by quarter">
        <div ref={createdBar} className="dc-chart" />
      </ChartCard>

      {/* Row 4: S-coord histograms */}
      <section className="grid grid-cols-3 gap-4">
        <ChartCard title="S_k · knowledge specificity">
          <div ref={skBar} className="dc-chart" />
        </ChartCard>
        <ChartCard title="S_t · temporal entropy">
          <div ref={stBar} className="dc-chart" />
        </ChartCard>
        <ChartCard title="S_e · evolution depth">
          <div ref={seBar} className="dc-chart" />
        </ChartCard>
      </section>

      {/* Row 5: size + readme + description */}
      <section className="grid grid-cols-3 gap-4">
        <ChartCard title="Repo size (log KB)">
          <div ref={sizeBar} className="dc-chart" />
        </ChartCard>
        <ChartCard title="README length">
          <div ref={readmeLenRow} className="dc-chart" />
        </ChartCard>
        <ChartCard title="Description length">
          <div ref={descLenRow} className="dc-chart" />
        </ChartCard>
      </section>

      {/* Row 6: stars + topic-count + top topics */}
      <section className="grid grid-cols-[280px_280px_1fr] gap-4">
        <ChartCard title="Stars">
          <div ref={starsRow} className="dc-chart" />
        </ChartCard>
        <ChartCard title="Topic count">
          <div ref={topicCountRow} className="dc-chart" />
        </ChartCard>
        <ChartCard title="Top topics (click to filter)">
          <div ref={topicsRow} className="dc-chart" />
        </ChartCard>
      </section>

      {/* Row 7: filtered data table */}
      <ChartCard title="Filtered repos">
        <div ref={tableHost} className="dc-chart dc-data-table" />
      </ChartCard>

      <footer className="text-[10px] uppercase tracking-[0.25em] opacity-40 pt-6">
        crossfilter + dc.js · brushing in any chart filters every other
      </footer>
    </div>
  );
}

/**
 * Fake-group wrapper that returns only the top N keys by value descending.
 * dc.js's rowChart over an array-valued dimension shows every key by
 * default; we don't want 200 single-use topics — top 25 is enough.
 */
function topNGroup(
  group: { all(): { key: unknown; value: number }[] },
  n: number
) {
  return {
    all() {
      return group
        .all()
        .slice()
        .sort((a, b) => b.value - a.value)
        .slice(0, n);
    },
    top(k: number) {
      return this.all().slice(0, k);
    },
  };
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-dark border border-light/10 rounded-md p-3 flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-widest opacity-50">
        {title}
      </div>
      {children}
    </div>
  );
}
