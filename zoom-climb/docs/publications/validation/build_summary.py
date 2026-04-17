"""
Aggregates per-paper summaries into a master validation summary.
"""

import json
import os
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))

PAPERS = [
    ("paper1-msi", "minimum-sufficient-interceptor",
     "_paper1_summary.json"),
    ("paper2-hnc", "hierarchical-navigation-cascades",
     "_paper2_summary.json"),
    ("paper3-bsp", "blank-screen-paradigm",
     "_paper3_summary.json"),
]


def main():
    aggregated = {
        "suite": "Zangalewa-Buhera validation suite",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "papers": [],
    }

    total_experiments = 0
    total_confirmed = 0

    for subdir, paper_name, summary_file in PAPERS:
        path = os.path.join(HERE, subdir, summary_file)
        with open(path, "r") as f:
            paper_summary = json.load(f)
        per_exp = paper_summary["experiments"]
        total_experiments += len(per_exp)
        total_confirmed += sum(1 for v in per_exp.values() if v)
        aggregated["papers"].append({
            "slug": paper_name,
            "directory": subdir,
            "paper_title": paper_summary["paper"],
            "experiment_outcomes": per_exp,
            "all_confirmed": paper_summary["all_predictions_confirmed"],
        })

    aggregated["total_experiments"] = total_experiments
    aggregated["total_confirmed"] = total_confirmed
    aggregated["fraction_confirmed"] = total_confirmed / total_experiments
    aggregated["all_papers_all_confirmed"] = all(
        p["all_confirmed"] for p in aggregated["papers"])

    out = os.path.join(HERE, "summary.json")
    with open(out, "w") as f:
        json.dump(aggregated, f, indent=2)

    print("Validation suite summary")
    print("=" * 60)
    for p in aggregated["papers"]:
        status = "OK" if p["all_confirmed"] else "FAIL"
        print(f"  [{status}] {p['paper_title']}")
        for exp, passed in p["experiment_outcomes"].items():
            mark = "+" if passed else "-"
            print(f"       [{mark}] {exp}")
    print("=" * 60)
    print(f"Total: {total_confirmed}/{total_experiments} experiments passed")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
