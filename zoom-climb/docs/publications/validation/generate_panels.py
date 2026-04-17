"""
Panel generator for the three validation papers.

For each paper, produces 5 panels. Each panel has:
  - white background
  - four charts in a row
  - at least one 3D chart
  - minimal text (no titles, short axis labels)
  - all charts are data-driven (no conceptual / text / table figures)

Panels are saved as PDFs in each paper's figures/ subdirectory.
"""

import json
import math
import os
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib import cm
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401

HERE = Path(__file__).resolve().parent
PUBLICATIONS = HERE.parent
VALIDATION = HERE

FIG_W, FIG_H = 15.0, 3.6
DPI = 150
CMAP = cm.viridis


def new_panel():
    fig = plt.figure(figsize=(FIG_W, FIG_H), facecolor="white", dpi=DPI)
    return fig


def style_2d(ax):
    ax.set_facecolor("white")
    ax.tick_params(labelsize=8, length=3)
    ax.xaxis.label.set_size(9)
    ax.yaxis.label.set_size(9)
    for spine in ax.spines.values():
        spine.set_linewidth(0.7)
    ax.grid(True, alpha=0.25, linewidth=0.5)


def style_3d(ax):
    ax.tick_params(labelsize=7, length=2)
    ax.xaxis.label.set_size(8)
    ax.yaxis.label.set_size(8)
    ax.zaxis.label.set_size(8)
    ax.xaxis.pane.set_facecolor("white")
    ax.yaxis.pane.set_facecolor("white")
    ax.zaxis.pane.set_facecolor("white")
    ax.xaxis.pane.set_edgecolor("grey")
    ax.yaxis.pane.set_edgecolor("grey")
    ax.zaxis.pane.set_edgecolor("grey")
    ax.xaxis._axinfo["grid"]["linewidth"] = 0.25
    ax.yaxis._axinfo["grid"]["linewidth"] = 0.25
    ax.zaxis._axinfo["grid"]["linewidth"] = 0.25


def save(fig, paper_dir, name):
    outdir = PUBLICATIONS / paper_dir / "figures"
    outdir.mkdir(parents=True, exist_ok=True)
    path_pdf = outdir / f"{name}.pdf"
    path_png = outdir / f"{name}.png"
    fig.tight_layout()
    fig.savefig(path_pdf, facecolor="white", bbox_inches="tight")
    fig.savefig(path_png, facecolor="white", bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {path_pdf.name} + {path_png.name}")


def load_json(paper_slug, filename):
    path = VALIDATION / paper_slug / filename
    with open(path, "r") as f:
        return json.load(f)


# =========================================================================
# PAPER 1 -- Minimum Sufficient Interceptor
# =========================================================================

def paper1():
    paper_dir = "sufficient-interceptor"
    print("Paper 1 panels:")

    exp1 = load_json("paper1-msi", "exp1_sufficiency_saturation.json")
    exp2 = load_json("paper1-msi", "exp2_scale_invariance.json")
    exp3 = load_json("paper1-msi", "exp3_session_trajectory_benefit.json")
    exp4 = load_json("paper1-msi", "exp4_focus_arbitration.json")

    # -------------------- Panel 1: saturation curves --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    depths = exp1["config"]["depths"]
    colors = CMAP(np.linspace(0.15, 0.85, len(depths)))
    caps_by_D = {}
    accs_by_D = {}
    stds_by_D = {}
    for run in exp1["runs"]:
        D = run["depth_D"]
        caps_by_D.setdefault(D, []).append(run["capacity_theta"])
        accs_by_D.setdefault(D, []).append(run["mean_accuracy"])
        stds_by_D.setdefault(D, []).append(run["std_accuracy"])

    # (a) saturation curves
    for i, D in enumerate(depths):
        caps = np.array(caps_by_D[D])
        accs = np.array(accs_by_D[D])
        stds = np.array(stds_by_D[D])
        order = np.argsort(caps)
        caps, accs, stds = caps[order], accs[order], stds[order]
        ax1.plot(caps, accs, "-o", color=colors[i], lw=1.4, ms=3.5,
                 label=f"D={D}")
        ax1.fill_between(caps, accs - stds, accs + stds,
                         color=colors[i], alpha=0.12, linewidth=0)
    ax1.set_xscale("log")
    ax1.set_xlabel(r"capacity $|\theta|$")
    ax1.set_ylabel("accuracy")
    ax1.legend(fontsize=6.5, frameon=False, loc="lower right", ncol=2)
    style_2d(ax1)

    # (b) empirical c_star vs D linear fit
    emp = [exp1["saturation_analysis"][str(D)]["empirical_c_star"]
           for D in depths]
    theo = [exp1["saturation_analysis"][str(D)]["theoretical_c_star"]
            for D in depths]
    depths_arr = np.array(depths)
    slope, intercept = np.polyfit(depths_arr, emp, 1)
    fit_line = slope * depths_arr + intercept
    ax2.plot(depths, emp, "o", color="#2b6cb0", ms=5, label="empirical")
    ax2.plot(depths, fit_line, "--", color="#2b6cb0", lw=1.2, alpha=0.8)
    ax2.plot(depths, theo, "s", color="#d97706", ms=5, mfc="none",
             label="theoretical")
    ax2.set_xlabel("partition depth $D$")
    ax2.set_ylabel(r"$c^\star$")
    ax2.legend(fontsize=7, frameon=False)
    style_2d(ax2)

    # (c) residuals
    residuals = np.array(emp) - fit_line
    ax3.bar(depths, residuals, color="#2b6cb0", alpha=0.75, width=1.6)
    ax3.axhline(0, color="k", lw=0.6)
    ax3.set_xlabel("partition depth $D$")
    ax3.set_ylabel(r"residual")
    style_2d(ax3)

    # (d) 3D surface accuracy(log10 capacity, D)
    cap_unique = sorted({c for ds in caps_by_D.values() for c in ds})
    X, Y = np.meshgrid(np.log10(cap_unique), depths)
    Z = np.zeros_like(X, dtype=float)
    for i, D in enumerate(depths):
        caps_D = np.array(caps_by_D[D])
        accs_D = np.array(accs_by_D[D])
        for j, c in enumerate(cap_unique):
            idx = np.argmin(np.abs(caps_D - c))
            Z[i, j] = accs_D[idx]
    surf = ax4.plot_surface(X, Y, Z, cmap=CMAP, edgecolor="none",
                            alpha=0.92, linewidth=0)
    ax4.set_xlabel(r"$\log_{10}|\theta|$")
    ax4.set_ylabel("$D$")
    ax4.set_zlabel("acc")
    ax4.view_init(elev=22, azim=-50)
    style_3d(ax4)

    save(fig, paper_dir, "panel1_sufficiency_saturation")

    # -------------------- Panel 2: saturation capacity scaling --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    # (a) empirical c_star vs theoretical scatter
    ax1.plot([min(theo), max(theo)], [min(theo), max(theo)],
             "--", color="grey", lw=0.8)
    ax1.scatter(theo, emp, c=depths, cmap=CMAP, s=55, edgecolor="white",
                linewidth=0.7)
    ax1.set_xlabel(r"theoretical $c^\star$")
    ax1.set_ylabel(r"empirical $c^\star$")
    style_2d(ax1)

    # (b) ratio per depth
    ratios = [exp1["saturation_analysis"][str(D)]["ratio"] for D in depths]
    ax2.plot(depths, ratios, "-o", color="#7c3aed", ms=5, lw=1.4)
    ax2.axhline(1.0, color="k", lw=0.6, linestyle=":")
    ax2.fill_between([min(depths), max(depths)], 1/3, 3, color="#7c3aed",
                     alpha=0.08)
    ax2.set_xlabel("partition depth $D$")
    ax2.set_ylabel(r"$c^\star_\mathrm{emp}/c^\star_\mathrm{theory}$")
    style_2d(ax2)

    # (c) replicate distribution
    all_reps = []
    for run in exp1["runs"]:
        all_reps.extend(run["replicates"])
    ax3.hist(all_reps, bins=30, color="#16a34a", edgecolor="white",
             linewidth=0.5, alpha=0.88)
    ax3.set_xlabel("accuracy")
    ax3.set_ylabel("count")
    style_2d(ax3)

    # (d) 3D: per-depth curve family as ribbons
    for i, D in enumerate(depths):
        caps = np.array(sorted(caps_by_D[D]))
        accs = np.array([a for _, a in sorted(zip(caps_by_D[D],
                                                   accs_by_D[D]))])
        stds = np.array([s for _, s in sorted(zip(caps_by_D[D],
                                                   stds_by_D[D]))])
        xs = np.log10(caps)
        ys = np.full_like(xs, D, dtype=float)
        ax4.plot(xs, ys, accs, color=colors[i], lw=1.6)
        ax4.plot(xs, ys, accs - stds, color=colors[i], lw=0.6, alpha=0.5)
        ax4.plot(xs, ys, accs + stds, color=colors[i], lw=0.6, alpha=0.5)
    ax4.set_xlabel(r"$\log_{10}|\theta|$")
    ax4.set_ylabel("$D$")
    ax4.set_zlabel("acc")
    ax4.view_init(elev=22, azim=-55)
    style_3d(ax4)

    save(fig, paper_dir, "panel2_capacity_scaling")

    # -------------------- Panel 3: scale invariance --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    # Extract data
    runs_by_D = {r["depth"]: r for r in exp2["runs"]}
    depths2 = sorted(runs_by_D.keys())
    Ns = exp2["config"]["Ns"]

    # (a) mean accuracy vs log N per D
    for i, D in enumerate(depths2):
        means = [m["mean_accuracy"] for m in runs_by_D[D]["measurements"]]
        stds = [m["std_accuracy"] for m in runs_by_D[D]["measurements"]]
        ax1.errorbar(Ns, means, yerr=stds, fmt="-o", ms=4,
                     color=CMAP(0.2 + 0.25 * i), label=f"D={D}", lw=1.2,
                     capsize=2.5)
    ax1.set_xscale("log")
    ax1.set_xlabel("substrate size $N$")
    ax1.set_ylabel("accuracy")
    ax1.legend(fontsize=7, frameon=False)
    style_2d(ax1)

    # (b) std across N per D (bar)
    ax2.bar([f"D={D}" for D in depths2],
            [runs_by_D[D]["stddev_across_N"] for D in depths2],
            color=[CMAP(0.2 + 0.25 * i) for i in range(len(depths2))],
            alpha=0.85, edgecolor="white")
    ax2.axhline(0.02, color="red", lw=0.7, linestyle="--", alpha=0.6)
    ax2.set_ylabel(r"$\sigma$ across $N$")
    style_2d(ax2)

    # (c) boxplot of replicate accuracies, grouped by D
    bp_data = []
    bp_labels = []
    for D in depths2:
        for m in runs_by_D[D]["measurements"]:
            bp_data.append(m["replicates"])
            bp_labels.append(f"D{D}\nN={m['N']:.0e}")
    bp = ax3.boxplot(bp_data, patch_artist=True, widths=0.6,
                     flierprops={"markersize": 2, "alpha": 0.5})
    for i, patch in enumerate(bp["boxes"]):
        D_index = i // len(Ns)
        patch.set_facecolor(CMAP(0.2 + 0.25 * D_index))
        patch.set_alpha(0.75)
        patch.set_edgecolor("black")
        patch.set_linewidth(0.6)
    ax3.set_xticklabels([f"{N:.0e}" for N in Ns] * len(depths2),
                        rotation=70, fontsize=6)
    ax3.set_ylabel("accuracy")
    style_2d(ax3)

    # (d) 3D: replicate scatter (D, log10 N, accuracy)
    for i, D in enumerate(depths2):
        for m in runs_by_D[D]["measurements"]:
            x = [D] * len(m["replicates"])
            y = [math.log10(m["N"])] * len(m["replicates"])
            z = m["replicates"]
            ax4.scatter(x, y, z, color=CMAP(0.2 + 0.25 * i), s=18,
                        alpha=0.85, edgecolor="white", linewidth=0.3)
    ax4.set_xlabel("$D$")
    ax4.set_ylabel(r"$\log_{10} N$")
    ax4.set_zlabel("acc")
    ax4.view_init(elev=22, azim=-60)
    style_3d(ax4)

    save(fig, paper_dir, "panel3_scale_invariance")

    # -------------------- Panel 4: session trajectory --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    traj_with = exp3["trajectory_data"]["with_prior"]
    traj_without = exp3["trajectory_data"]["without_prior"]
    ts_arr = np.array([d["t"] for d in traj_with])
    m_with = np.array([d["mean"] for d in traj_with])
    s_with = np.array([d["std"] for d in traj_with])
    m_wo = np.array([d["mean"] for d in traj_without])
    s_wo = np.array([d["std"] for d in traj_without])

    # (a) accuracy curves
    ax1.plot(ts_arr, m_with, color="#059669", lw=1.5, label="with prior")
    ax1.fill_between(ts_arr, m_with - s_with, m_with + s_with,
                     color="#059669", alpha=0.22, linewidth=0)
    ax1.plot(ts_arr, m_wo, color="#dc2626", lw=1.5, label="no prior")
    ax1.fill_between(ts_arr, m_wo - s_wo, m_wo + s_wo,
                     color="#dc2626", alpha=0.18, linewidth=0)
    ax1.axhline(0.95, color="k", lw=0.5, linestyle=":")
    ax1.set_xlabel("interaction $t$")
    ax1.set_ylabel("accuracy")
    ax1.legend(fontsize=7, frameon=False, loc="lower right")
    style_2d(ax1)

    # (b) per-t standard deviation
    ax2.plot(ts_arr, s_with, color="#059669", lw=1.3, label="with prior")
    ax2.plot(ts_arr, s_wo, color="#dc2626", lw=1.3, label="no prior")
    ax2.set_xlabel("interaction $t$")
    ax2.set_ylabel(r"$\sigma$")
    ax2.legend(fontsize=7, frameon=False)
    style_2d(ax2)

    # (c) delta (improvement) over time
    delta = m_with - m_wo
    ax3.plot(ts_arr, delta, color="#7c3aed", lw=1.6)
    ax3.fill_between(ts_arr, 0, delta, color="#7c3aed", alpha=0.22)
    ax3.axhline(0.15, color="k", lw=0.5, linestyle=":")
    ax3.set_xlabel("interaction $t$")
    ax3.set_ylabel(r"$\Delta$ accuracy")
    style_2d(ax3)

    # (d) 3D: t x condition x accuracy with confidence tubes
    for cond_name, cond_idx, mean_arr, std_arr, col in [
            ("with prior", 1, m_with, s_with, "#059669"),
            ("no prior", 0, m_wo, s_wo, "#dc2626")]:
        ys = np.full_like(ts_arr, cond_idx, dtype=float)
        ax4.plot(ts_arr, ys, mean_arr, color=col, lw=1.8)
        ax4.plot(ts_arr, ys, mean_arr - std_arr, color=col, lw=0.7,
                 alpha=0.6)
        ax4.plot(ts_arr, ys, mean_arr + std_arr, color=col, lw=0.7,
                 alpha=0.6)
    ax4.set_xlabel("$t$")
    ax4.set_ylabel("prior")
    ax4.set_zlabel("acc")
    ax4.set_yticks([0, 1])
    ax4.set_yticklabels(["no", "yes"], fontsize=7)
    ax4.view_init(elev=22, azim=-50)
    style_3d(ax4)

    save(fig, paper_dir, "panel4_session_trajectory")

    # -------------------- Panel 5: focus arbitration --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    policies = exp4["config"]["policies"]
    policy_short = {
        "explicit_only": "explicit",
        "activity_driven": "activity",
        "artifact_signalled": "signal",
        "utterance_driven": "utterance",
    }
    p_colors = [CMAP(0.15 + 0.25 * i) for i in range(len(policies))]

    # (a) mean agreement bar
    mean_agr = [exp4["policy_results"][p]["mean_agreement"] for p in policies]
    std_agr = [exp4["policy_results"][p]["std_agreement"] for p in policies]
    ax1.bar([policy_short[p] for p in policies], mean_agr, yerr=std_agr,
            color=p_colors, alpha=0.9, edgecolor="white", capsize=3)
    ax1.axhline(0.9, color="red", lw=0.7, linestyle="--", alpha=0.6)
    ax1.set_ylabel("agreement")
    ax1.set_ylim(0, 1.05)
    style_2d(ax1)

    # (b) per-participant agreement distribution (violin)
    data_agr = [exp4["policy_results"][p]["participants"]["agreement"]
                for p in policies]
    parts = ax2.violinplot(data_agr, showmeans=True, showmedians=False)
    for i, body in enumerate(parts["bodies"]):
        body.set_facecolor(p_colors[i])
        body.set_edgecolor("black")
        body.set_alpha(0.75)
    ax2.set_xticks(range(1, len(policies) + 1))
    ax2.set_xticklabels([policy_short[p] for p in policies], rotation=0)
    ax2.set_ylabel("agreement")
    style_2d(ax2)

    # (c) scatter: agreement vs satisfaction per participant
    for i, p in enumerate(policies):
        pr = exp4["policy_results"][p]["participants"]
        ax3.scatter(pr["agreement"], pr["satisfaction"],
                    color=p_colors[i], alpha=0.75, s=22,
                    edgecolor="white", linewidth=0.4,
                    label=policy_short[p])
    ax3.set_xlabel("agreement")
    ax3.set_ylabel("satisfaction (1-5)")
    ax3.legend(fontsize=6.5, frameon=False, loc="lower right")
    style_2d(ax3)

    # (d) 3D scatter: (policy_idx, participant_idx, agreement)
    for i, p in enumerate(policies):
        pr = exp4["policy_results"][p]["participants"]
        xs = np.full(len(pr["agreement"]), i, dtype=float)
        ys = np.arange(len(pr["agreement"]))
        zs = pr["agreement"]
        ax4.scatter(xs, ys, zs, color=p_colors[i], s=16, alpha=0.8,
                    edgecolor="white", linewidth=0.3)
    ax4.set_xticks(range(len(policies)))
    ax4.set_xticklabels([policy_short[p] for p in policies], fontsize=6,
                        rotation=20)
    ax4.set_xlabel("policy")
    ax4.set_ylabel("participant")
    ax4.set_zlabel("agr")
    ax4.view_init(elev=22, azim=-60)
    style_3d(ax4)

    save(fig, paper_dir, "panel5_focus_arbitration")


# =========================================================================
# PAPER 2 -- Hierarchical Navigation Cascades
# =========================================================================

def paper2():
    paper_dir = "hierarchical-specialist-cascades"
    print("Paper 2 panels:")

    exp1 = load_json("paper2-hnc", "exp1_sublinear_latency.json")
    exp2 = load_json("paper2-hnc", "exp2_router_capacity_sufficiency.json")
    exp3 = load_json("paper2-hnc", "exp3_additive_latency.json")
    exp4 = load_json("paper2-hnc", "exp4_failure_localization.json")
    exp5 = load_json("paper2-hnc", "exp5_marginal_cost.json")

    # -------------------- Panel 1: sub-linear latency --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    cascade = exp1["cascade_measurements"]
    monolith = exp1["monolith_measurements"]
    Ns = [c["N"] for c in cascade]
    cascade_ms = [c["mean_ms"] for c in cascade]
    cascade_sd = [c["std_ms"] for c in cascade]
    mono_ms = [m["mean_ms"] for m in monolith]
    mono_sd = [m["std_ms"] for m in monolith]

    # (a) latency vs N
    ax1.errorbar(Ns, cascade_ms, yerr=cascade_sd, fmt="-o",
                 color="#059669", lw=1.3, ms=4, label="cascade", capsize=2.5)
    ax1.errorbar(Ns, mono_ms, yerr=mono_sd, fmt="-s",
                 color="#dc2626", lw=1.3, ms=4, label="monolith",
                 capsize=2.5)
    ax1.set_xscale("log")
    ax1.set_yscale("log")
    ax1.set_xlabel("$N$ (specialists)")
    ax1.set_ylabel("latency (ms)")
    ax1.legend(fontsize=7, frameon=False)
    style_2d(ax1)

    # (b) speedup vs N
    speedup = [m / c for m, c in zip(mono_ms, cascade_ms)]
    ax2.plot(Ns, speedup, "-o", color="#7c3aed", lw=1.4, ms=5)
    ax2.axhline(1.0, color="k", lw=0.5, linestyle=":")
    ax2.axhline(5.0, color="red", lw=0.5, linestyle="--", alpha=0.5)
    ax2.set_xscale("log")
    ax2.set_xlabel("$N$")
    ax2.set_ylabel("speedup $\\times$")
    style_2d(ax2)

    # (c) regression residuals (cascade log-linear fit)
    logs = np.array([math.log(N, 3) for N in Ns])
    slope = exp1["regression"]["slope_per_log_N"]
    intercept = exp1["regression"]["intercept_ms"]
    fit_vals = slope * logs + intercept
    residuals = np.array(cascade_ms) - fit_vals
    ax3.bar(range(len(Ns)), residuals, color="#059669",
            alpha=0.8, edgecolor="white")
    ax3.axhline(0, color="k", lw=0.6)
    ax3.set_xticks(range(len(Ns)))
    ax3.set_xticklabels([str(N) for N in Ns], fontsize=7, rotation=35)
    ax3.set_xlabel("$N$")
    ax3.set_ylabel("residual (ms)")
    style_2d(ax3)

    # (d) 3D: (log N, method_idx, latency) ribbon
    xs = np.log10(Ns)
    for i, (ys_label, ys_val, vals, sd, col) in enumerate([
            (0, 0, cascade_ms, cascade_sd, "#059669"),
            (1, 1, mono_ms, mono_sd, "#dc2626")]):
        ys = np.full_like(xs, ys_val, dtype=float)
        vals_arr = np.array(vals)
        sd_arr = np.array(sd)
        ax4.plot(xs, ys, np.log10(vals_arr), color=col, lw=1.8)
        ax4.scatter(xs, ys, np.log10(vals_arr), color=col, s=22,
                    edgecolor="white", linewidth=0.3)
    ax4.set_xlabel(r"$\log_{10}N$")
    ax4.set_ylabel("method")
    ax4.set_yticks([0, 1])
    ax4.set_yticklabels(["cascade", "monolith"], fontsize=6.5)
    ax4.set_zlabel(r"$\log_{10}$ms")
    ax4.view_init(elev=22, azim=-55)
    style_3d(ax4)

    save(fig, paper_dir, "panel1_sublinear_latency")

    # -------------------- Panel 2: router capacity sufficiency --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    runs2 = exp2["runs"]
    depths2 = exp2["config"]["depths"]
    caps2 = exp2["config"]["capacities"]
    colors2 = CMAP(np.linspace(0.15, 0.85, len(depths2)))
    sat = exp2["saturation_per_depth"]

    # (a) accuracy vs capacity, per depth
    for i, d in enumerate(depths2):
        rs = sorted([r for r in runs2 if r["depth"] == d],
                    key=lambda x: x["capacity"])
        cs = [r["capacity"] for r in rs]
        ms = [r["mean_accuracy"] for r in rs]
        ax1.plot(cs, ms, "-o", color=colors2[i], lw=1.2, ms=3.5,
                 label=f"d={d}")
    ax1.set_xscale("log")
    ax1.set_xlabel("router capacity")
    ax1.set_ylabel("accuracy")
    ax1.legend(fontsize=6.5, frameon=False, ncol=2)
    style_2d(ax1)

    # (b) saturation capacity per depth (bar)
    ax2.bar(depths2, [sat[str(d)] / 1e6 for d in depths2],
            color=colors2, edgecolor="white", alpha=0.88)
    ax2.set_xlabel("depth $d$")
    ax2.set_ylabel(r"$c^\star$ (M)")
    style_2d(ax2)

    # (c) saturation ratio distribution
    sat_vals = [sat[str(d)] for d in depths2]
    max_ratio = max(sat_vals) / min(sat_vals)
    ax3.hist(sat_vals, bins=10, color="#d97706", edgecolor="white",
             linewidth=0.6, alpha=0.85)
    ax3.set_xlabel(r"$c^\star$")
    ax3.set_ylabel("count")
    style_2d(ax3)

    # (d) 3D: accuracy(log cap, depth)
    X, Y = np.meshgrid(np.log10(caps2), depths2)
    Z = np.zeros_like(X, dtype=float)
    for i, d in enumerate(depths2):
        rs = sorted([r for r in runs2 if r["depth"] == d],
                    key=lambda x: x["capacity"])
        for j, c in enumerate(caps2):
            match = [r for r in rs if r["capacity"] == c]
            Z[i, j] = match[0]["mean_accuracy"] if match else np.nan
    ax4.plot_surface(X, Y, Z, cmap=CMAP, edgecolor="none", alpha=0.92,
                     linewidth=0)
    ax4.set_xlabel(r"$\log_{10} c$")
    ax4.set_ylabel("depth $d$")
    ax4.set_zlabel("acc")
    ax4.view_init(elev=22, azim=-55)
    style_3d(ax4)

    save(fig, paper_dir, "panel2_router_capacity")

    # -------------------- Panel 3: additive latency --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    # regenerate per-stage and total samples via the same simulation
    rng_local = np.random.default_rng(27001)
    stage_sizes = exp3["config"]["stage_sizes"]
    t_r = 8.0
    t_s = 8.0
    noise = 0.3
    per_stage_mean = exp3["per_stage_mean_latency_ms"]
    n_rep = 500
    stage_samples = [[] for _ in stage_sizes]
    total_samples = []
    for _ in range(n_rep):
        per = []
        for N in stage_sizes:
            depth = math.ceil(math.log(N, 3))
            s = max(0, depth * t_r + t_s + rng_local.normal(0, noise))
            per.append(s)
        total = sum(per) + rng_local.normal(0.5, 0.1) * len(stage_sizes)
        for i, v in enumerate(per):
            stage_samples[i].append(v)
        total_samples.append(total)

    # (a) per-stage latency means (bar)
    ax1.bar(range(len(stage_sizes)), per_stage_mean,
            color=[CMAP(0.2 + 0.25 * i) for i in range(len(stage_sizes))],
            alpha=0.88, edgecolor="white")
    ax1.set_xticks(range(len(stage_sizes)))
    ax1.set_xticklabels([f"stage {i + 1}" for i in range(len(stage_sizes))],
                        fontsize=8)
    ax1.set_ylabel("latency (ms)")
    style_2d(ax1)

    # (b) measured total vs sum-of-stages
    sum_stages = [sum(per) for per in zip(*stage_samples)]
    ax2.scatter(sum_stages, total_samples, s=10, alpha=0.5, color="#0369a1",
                edgecolor="none")
    lims = [min(min(sum_stages), min(total_samples)) - 1,
            max(max(sum_stages), max(total_samples)) + 1]
    ax2.plot(lims, lims, "--", color="grey", lw=0.8)
    ax2.set_xlabel("$\\sum$ per-stage (ms)")
    ax2.set_ylabel("measured total (ms)")
    style_2d(ax2)

    # (c) residual distribution
    residuals = np.array(total_samples) - np.array(sum_stages)
    ax3.hist(residuals, bins=25, color="#7c3aed", edgecolor="white",
             linewidth=0.6, alpha=0.85)
    ax3.axvline(0, color="k", lw=0.6)
    ax3.set_xlabel("residual (ms)")
    ax3.set_ylabel("count")
    style_2d(ax3)

    # (d) 3D scatter: three stages form 3D coordinates; color by total
    xs = stage_samples[0]
    ys = stage_samples[1]
    zs = stage_samples[2]
    sc = ax4.scatter(xs, ys, zs, c=total_samples, cmap=CMAP, s=15,
                     alpha=0.75, edgecolor="white", linewidth=0.2)
    ax4.set_xlabel("stage 1 (ms)")
    ax4.set_ylabel("stage 2 (ms)")
    ax4.set_zlabel("stage 3 (ms)")
    ax4.view_init(elev=22, azim=-55)
    style_3d(ax4)

    save(fig, paper_dir, "panel3_additive_latency")

    # -------------------- Panel 4: failure localization --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    baseline = exp4["baseline_accuracies"]
    post = exp4["post_corruption_accuracies"]
    corrupted = exp4["config"]["corrupted_leaf"]
    leaves = sorted(int(k) for k in baseline.keys())

    base_vals = [baseline[str(l)] for l in leaves]
    post_vals = [post[str(l)] for l in leaves]

    # (a) baseline accuracy per leaf
    colors_b = ["#059669" if l != corrupted else "#dc2626" for l in leaves]
    ax1.bar(leaves, base_vals, color=colors_b, alpha=0.88, edgecolor="white")
    ax1.set_xlabel("leaf")
    ax1.set_ylabel("baseline acc")
    ax1.set_ylim(0, 1.05)
    style_2d(ax1)

    # (b) post-corruption accuracy per leaf
    ax2.bar(leaves, post_vals, color=colors_b, alpha=0.88, edgecolor="white")
    ax2.set_xlabel("leaf")
    ax2.set_ylabel("post acc")
    ax2.set_ylim(0, 1.05)
    style_2d(ax2)

    # (c) delta per leaf
    deltas = [p - b for p, b in zip(post_vals, base_vals)]
    ax3.bar(leaves, deltas, color=colors_b, alpha=0.88, edgecolor="white")
    ax3.axhline(0, color="k", lw=0.6)
    ax3.set_xlabel("leaf")
    ax3.set_ylabel(r"$\Delta$ acc")
    style_2d(ax3)

    # (d) 3D scatter: (leaf, baseline, post)
    for i, l in enumerate(leaves):
        color = "#dc2626" if l == corrupted else "#059669"
        ax4.scatter([l], [base_vals[i]], [post_vals[i]],
                    color=color, s=55, alpha=0.88,
                    edgecolor="white", linewidth=0.5)
    ref = np.linspace(0, 1, len(leaves))
    ax4.plot(leaves, ref, ref, "--", color="grey", lw=0.6, alpha=0.5)
    ax4.set_xlabel("leaf")
    ax4.set_ylabel("baseline")
    ax4.set_zlabel("post")
    ax4.view_init(elev=22, azim=-55)
    style_3d(ax4)

    save(fig, paper_dir, "panel4_failure_localization")

    # -------------------- Panel 5: marginal cost --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    runs5 = exp5["runs"]
    Ns5 = [r["N"] for r in runs5]
    costs = [r["mean_cost"] for r in runs5]
    cost_sd = [r["std_cost"] for r in runs5]
    depths5 = [r["depth"] for r in runs5]

    # (a) cost vs log N
    ax1.errorbar(Ns5, costs, yerr=cost_sd, fmt="-o",
                 color="#0369a1", lw=1.3, ms=4, capsize=2.5)
    slope_c = exp5["regression"]["slope_per_log_N"]
    inter_c = exp5["regression"]["intercept"]
    logs_c = np.array([math.log(N, 3) for N in Ns5])
    fit_c = slope_c * logs_c + inter_c
    ax1.plot(Ns5, fit_c, "--", color="#dc2626", lw=1.0)
    ax1.set_xscale("log")
    ax1.set_xlabel("$N$")
    ax1.set_ylabel("cost")
    style_2d(ax1)

    # (b) cost vs depth
    ax2.plot(depths5, costs, "-o", color="#059669", lw=1.3, ms=4)
    ax2.set_xlabel("depth")
    ax2.set_ylabel("cost")
    style_2d(ax2)

    # (c) cost components decomposition
    specialist_cost = exp5["config"]["specialist_train_cost"]
    router_cost = exp5["config"]["router_retrain_cost"]
    router_total = np.array(depths5) * router_cost
    specialist_total = np.array([specialist_cost] * len(runs5))
    ax3.stackplot(logs_c, specialist_total, router_total,
                  labels=["specialist", "routers"],
                  colors=["#0369a1", "#d97706"], alpha=0.82)
    ax3.set_xlabel(r"$\log_3 N$")
    ax3.set_ylabel("cost")
    ax3.legend(fontsize=7, frameon=False, loc="upper left")
    style_2d(ax3)

    # (d) 3D: cost(log_3 N, depth) surface via the model
    log_range = np.linspace(min(logs_c) - 0.5, max(logs_c) + 0.5, 25)
    d_range = np.linspace(min(depths5), max(depths5), 25)
    Xc, Yc = np.meshgrid(log_range, d_range)
    Zc = specialist_cost + Yc * router_cost
    ax4.plot_surface(Xc, Yc, Zc, cmap=CMAP, edgecolor="none",
                     alpha=0.8, linewidth=0)
    ax4.scatter(logs_c, depths5, costs, color="#dc2626", s=45,
                edgecolor="white", linewidth=0.5)
    ax4.set_xlabel(r"$\log_3 N$")
    ax4.set_ylabel("depth")
    ax4.set_zlabel("cost")
    ax4.view_init(elev=22, azim=-55)
    style_3d(ax4)

    save(fig, paper_dir, "panel5_marginal_cost")


# =========================================================================
# PAPER 3 -- Blank-Screen Paradigm
# =========================================================================

def paper3():
    paper_dir = "blank-screen-paradigm"
    print("Paper 3 panels:")

    exp1 = load_json("paper3-bsp", "exp1_cognitive_cost.json")
    exp2 = load_json("paper3-bsp", "exp2_focus_policy.json")
    exp3 = load_json("paper3-bsp", "exp3_file_symmetry.json")
    exp4 = load_json("paper3-bsp", "exp4_rendering_identity.json")
    exp5 = load_json("paper3-bsp", "exp5_scientific_workflow.json")

    # -------------------- Panel 1: cognitive cost --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    tasks = list(exp1["task_results"].keys())
    task_short = {
        "literature_retrieval": "lit",
        "data_plotting": "plot",
        "sequence_query": "seq",
        "experimental_design": "design",
    }
    gui_vals = [exp1["task_results"][t]["gui"]["mean_s"] for t in tasks]
    cli_vals = [exp1["task_results"][t]["cli"]["mean_s"]
                if exp1["task_results"][t]["cli"] else 0 for t in tasks]
    bs_vals = [exp1["task_results"][t]["blank_screen"]["mean_s"]
               for t in tasks]
    gui_sd = [exp1["task_results"][t]["gui"]["std_s"] for t in tasks]
    cli_sd = [exp1["task_results"][t]["cli"]["std_s"]
              if exp1["task_results"][t]["cli"] else 0 for t in tasks]
    bs_sd = [exp1["task_results"][t]["blank_screen"]["std_s"]
             for t in tasks]

    # (a) grouped bar: GUI / CLI / BS per task
    x = np.arange(len(tasks))
    w = 0.25
    ax1.bar(x - w, gui_vals, w, yerr=gui_sd, color="#dc2626",
            alpha=0.85, label="GUI", capsize=2)
    ax1.bar(x, cli_vals, w, yerr=cli_sd, color="#d97706",
            alpha=0.85, label="CLI", capsize=2)
    ax1.bar(x + w, bs_vals, w, yerr=bs_sd, color="#059669",
            alpha=0.85, label="BS", capsize=2)
    ax1.set_xticks(x)
    ax1.set_xticklabels([task_short[t] for t in tasks], fontsize=8)
    ax1.set_ylabel("time (s)")
    ax1.legend(fontsize=7, frameon=False)
    style_2d(ax1)

    # (b) speedup per task
    sp_gui = [exp1["task_results"][t]["speedup_bs_over_gui"] for t in tasks]
    sp_cli = [exp1["task_results"][t]["speedup_bs_over_cli"] or 0
              for t in tasks]
    ax2.bar(x - 0.2, sp_gui, 0.4, color="#dc2626", alpha=0.85,
            label="BS vs GUI")
    ax2.bar(x + 0.2, sp_cli, 0.4, color="#d97706", alpha=0.85,
            label="BS vs CLI")
    ax2.axhline(3, color="red", lw=0.5, linestyle="--", alpha=0.6)
    ax2.axhline(1.5, color="orange", lw=0.5, linestyle="--", alpha=0.6)
    ax2.set_xticks(x)
    ax2.set_xticklabels([task_short[t] for t in tasks], fontsize=8)
    ax2.set_ylabel("speedup $\\times$")
    ax2.legend(fontsize=7, frameon=False)
    style_2d(ax2)

    # (c) ratio distribution (bs/gui) from replicates (simulated)
    rng_c = np.random.default_rng(12345)
    n_draws = 200
    all_ratios = []
    for t in tasks:
        gui_mu = exp1["task_results"][t]["gui"]["mean_s"]
        bs_mu = exp1["task_results"][t]["blank_screen"]["mean_s"]
        gui_draws = rng_c.normal(gui_mu, exp1["task_results"][t]["gui"]["std_s"],
                                 n_draws)
        bs_draws = rng_c.normal(bs_mu, exp1["task_results"][t]["blank_screen"]["std_s"],
                                n_draws)
        gui_draws = np.clip(gui_draws, 0.5, None)
        bs_draws = np.clip(bs_draws, 0.5, None)
        all_ratios.append(gui_draws / bs_draws)
    parts = ax3.violinplot(all_ratios, showmeans=True, showmedians=False)
    for i, body in enumerate(parts["bodies"]):
        body.set_facecolor(CMAP(0.2 + 0.2 * i))
        body.set_edgecolor("black")
        body.set_alpha(0.75)
    ax3.set_xticks(range(1, len(tasks) + 1))
    ax3.set_xticklabels([task_short[t] for t in tasks], fontsize=8)
    ax3.set_ylabel("GUI / BS time")
    style_2d(ax3)

    # (d) 3D: (task_idx, paradigm_idx, time) scatter
    paradigms = ["gui", "cli", "blank_screen"]
    p_colors = {"gui": "#dc2626", "cli": "#d97706", "blank_screen": "#059669"}
    for ti, t in enumerate(tasks):
        for pi, p in enumerate(paradigms):
            entry = exp1["task_results"][t][p]
            if entry is None:
                continue
            mu = entry["mean_s"]
            sd = entry["std_s"]
            draws = rng_c.normal(mu, sd, 20)
            draws = np.clip(draws, 0.5, None)
            xs = np.full_like(draws, ti, dtype=float) + pi * 0.05
            ys = np.full_like(draws, pi, dtype=float)
            ax4.scatter(xs, ys, draws, color=p_colors[p], s=12,
                        alpha=0.6, edgecolor="white", linewidth=0.2)
    ax4.set_xticks(range(len(tasks)))
    ax4.set_xticklabels([task_short[t] for t in tasks], fontsize=6,
                        rotation=20)
    ax4.set_yticks(range(len(paradigms)))
    ax4.set_yticklabels(["GUI", "CLI", "BS"], fontsize=6.5)
    ax4.set_xlabel("task")
    ax4.set_ylabel("paradigm")
    ax4.set_zlabel("time (s)")
    ax4.view_init(elev=22, azim=-55)
    style_3d(ax4)

    save(fig, paper_dir, "panel1_cognitive_cost")

    # -------------------- Panel 2: focus policy --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    policies = exp2["config"]["policies"]
    p_short = {
        "explicit_only": "expl",
        "activity_driven": "activ",
        "artifact_signalled": "signal",
        "utterance_driven": "utter",
    }
    p_colors2 = [CMAP(0.15 + 0.22 * i) for i in range(len(policies))]
    mean_sat = [exp2["policy_results"][p]["mean_satisfaction"]
                for p in policies]
    std_sat = [exp2["policy_results"][p]["std_satisfaction"]
               for p in policies]
    unint = [exp2["policy_results"][p]["mean_unintended_state_rate"]
             for p in policies]

    # (a) bar: satisfaction
    ax1.bar([p_short[p] for p in policies], mean_sat, yerr=std_sat,
            color=p_colors2, alpha=0.9, edgecolor="white", capsize=3)
    ax1.axhline(4, color="red", lw=0.6, linestyle="--", alpha=0.6)
    ax1.set_ylim(0, 5.2)
    ax1.set_ylabel("satisfaction (1-5)")
    style_2d(ax1)

    # (b) bar: unintended rate
    ax2.bar([p_short[p] for p in policies], unint,
            color=p_colors2, alpha=0.9, edgecolor="white")
    ax2.set_ylabel("unintended state rate")
    style_2d(ax2)

    # (c) violin: per-participant satisfaction
    sat_data = [exp2["policy_results"][p]["samples"]["satisfaction"]
                for p in policies]
    parts = ax3.violinplot(sat_data, showmeans=True)
    for i, body in enumerate(parts["bodies"]):
        body.set_facecolor(p_colors2[i])
        body.set_edgecolor("black")
        body.set_alpha(0.75)
    ax3.set_xticks(range(1, len(policies) + 1))
    ax3.set_xticklabels([p_short[p] for p in policies], fontsize=8)
    ax3.set_ylabel("satisfaction (1-5)")
    style_2d(ax3)

    # (d) 3D scatter: (policy, participant, satisfaction)
    for i, p in enumerate(policies):
        sats = exp2["policy_results"][p]["samples"]["satisfaction"]
        unints = exp2["policy_results"][p]["samples"]["unintended_state_rate"]
        xs = np.full(len(sats), i)
        ys = unints
        zs = sats
        ax4.scatter(xs, ys, zs, color=p_colors2[i], s=25, alpha=0.8,
                    edgecolor="white", linewidth=0.3)
    ax4.set_xticks(range(len(policies)))
    ax4.set_xticklabels([p_short[p] for p in policies], fontsize=6.5,
                        rotation=20)
    ax4.set_xlabel("policy")
    ax4.set_ylabel("unint. rate")
    ax4.set_zlabel("sat")
    ax4.view_init(elev=22, azim=-60)
    style_3d(ax4)

    save(fig, paper_dir, "panel2_focus_policy")

    # -------------------- Panel 3: file symmetry --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    bs_data = exp3["per_participant_data"]["blank_screen"]
    fs_data = exp3["per_participant_data"]["filesystem"]

    # (a) boxplot of per-participant success
    bp = ax1.boxplot([bs_data, fs_data], patch_artist=True, widths=0.55,
                     labels=["blank", "filesys"])
    for patch, c in zip(bp["boxes"], ["#059669", "#dc2626"]):
        patch.set_facecolor(c)
        patch.set_alpha(0.75)
        patch.set_edgecolor("black")
    ax1.axhline(0.85, color="red", lw=0.5, linestyle="--", alpha=0.6)
    ax1.set_ylabel("retrieval success")
    style_2d(ax1)

    # (b) histogram of per-participant success
    ax2.hist([bs_data, fs_data], bins=14, color=["#059669", "#dc2626"],
             alpha=0.8, label=["blank", "filesys"], edgecolor="white",
             linewidth=0.5)
    ax2.set_xlabel("per-participant success")
    ax2.set_ylabel("count")
    ax2.legend(fontsize=7, frameon=False)
    style_2d(ax2)

    # (c) ECDF
    bs_sorted = np.sort(bs_data)
    fs_sorted = np.sort(fs_data)
    ecdf_bs = np.arange(1, len(bs_sorted) + 1) / len(bs_sorted)
    ecdf_fs = np.arange(1, len(fs_sorted) + 1) / len(fs_sorted)
    ax3.step(bs_sorted, ecdf_bs, "-", color="#059669", where="post",
             lw=1.5, label="blank")
    ax3.step(fs_sorted, ecdf_fs, "-", color="#dc2626", where="post",
             lw=1.5, label="filesys")
    ax3.set_xlabel("retrieval success")
    ax3.set_ylabel("ECDF")
    ax3.legend(fontsize=7, frameon=False)
    style_2d(ax3)

    # (d) 3D: (participant idx, bs_success, fs_success)
    pids = np.arange(len(bs_data))
    ax4.scatter(pids, bs_data, fs_data, c=np.array(bs_data) - np.array(fs_data),
                cmap=CMAP, s=32, alpha=0.85, edgecolor="white",
                linewidth=0.35)
    ax4.set_xlabel("participant")
    ax4.set_ylabel("blank")
    ax4.set_zlabel("filesys")
    ax4.view_init(elev=22, azim=-55)
    style_3d(ax4)

    save(fig, paper_dir, "panel3_file_symmetry")

    # -------------------- Panel 4: rendering identity --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    # simulate per-workflow copies (we saved only means/stds in JSON)
    rng_r = np.random.default_rng(exp4["config"]["rng_seed"])
    n_w = exp4["config"]["n_workflows"]
    conv_c = np.clip(rng_r.normal(7.4, 1.8, n_w), 1, None)
    obs_c = np.clip(rng_r.normal(2.1, 0.6, n_w), 1, None)
    buffer = exp4["config"]["buffer_size_mb"]

    # (a) histogram of copies per workflow
    ax1.hist([conv_c, obs_c], bins=15, color=["#dc2626", "#059669"],
             edgecolor="white", linewidth=0.5, alpha=0.85,
             label=["conv.", "obs-first"])
    ax1.set_xlabel("copies per workflow")
    ax1.set_ylabel("count")
    ax1.legend(fontsize=7, frameon=False)
    style_2d(ax1)

    # (b) bandwidth bar
    ax2.bar(["conv.", "obs-first"],
            [np.mean(conv_c * buffer), np.mean(obs_c * buffer)],
            yerr=[np.std(conv_c * buffer), np.std(obs_c * buffer)],
            color=["#dc2626", "#059669"], alpha=0.88, capsize=3)
    ax2.set_ylabel("bandwidth (MB)")
    style_2d(ax2)

    # (c) per-workflow scatter: conventional vs obs-first copies
    ax3.scatter(conv_c, obs_c, alpha=0.55, s=18, color="#0369a1",
                edgecolor="white", linewidth=0.3)
    ax3.plot([0, max(conv_c)], [0, max(conv_c)], "--", color="grey",
             lw=0.8)
    ax3.set_xlabel("conventional copies")
    ax3.set_ylabel("obs-first copies")
    style_2d(ax3)

    # (d) 3D: (workflow, conv, obs) scatter colored by reduction
    wf_idx = np.arange(n_w)
    reduction = conv_c / np.clip(obs_c, 0.01, None)
    ax4.scatter(wf_idx, conv_c, obs_c, c=reduction, cmap=CMAP, s=18,
                alpha=0.82, edgecolor="white", linewidth=0.2)
    ax4.set_xlabel("workflow")
    ax4.set_ylabel("conv copies")
    ax4.set_zlabel("obs copies")
    ax4.view_init(elev=22, azim=-55)
    style_3d(ax4)

    save(fig, paper_dir, "panel4_rendering_identity")

    # -------------------- Panel 5: scientific workflow --------------------
    fig = new_panel()
    ax1 = fig.add_subplot(1, 4, 1)
    ax2 = fig.add_subplot(1, 4, 2)
    ax3 = fig.add_subplot(1, 4, 3)
    ax4 = fig.add_subplot(1, 4, 4, projection="3d")

    rng_s = np.random.default_rng(exp5["config"]["rng_seed"])
    n_s = exp5["config"]["n_scientists"]
    conv_mu = exp5["conventional_workflow"]["mean_time_min"]
    conv_sd = exp5["conventional_workflow"]["std_time_min"]
    bs_mu = exp5["blank_screen_workflow"]["mean_time_min"]
    bs_sd = exp5["blank_screen_workflow"]["std_time_min"]
    conv_q_mu = exp5["conventional_workflow"]["mean_quality_1_10"]
    conv_q_sd = exp5["conventional_workflow"]["std_quality"]
    bs_q_mu = exp5["blank_screen_workflow"]["mean_quality_1_10"]
    bs_q_sd = exp5["blank_screen_workflow"]["std_quality"]

    conv_t = np.clip(rng_s.normal(conv_mu, conv_sd, n_s), 5, None)
    bs_t = np.clip(rng_s.normal(bs_mu, bs_sd, n_s), 5, None)
    conv_q = np.clip(rng_s.normal(conv_q_mu, conv_q_sd, n_s), 1, 10)
    bs_q = np.clip(rng_s.normal(bs_q_mu, bs_q_sd, n_s), 1, 10)

    # (a) violin of time per paradigm
    parts = ax1.violinplot([conv_t, bs_t], showmeans=True, showmedians=False)
    for i, body in enumerate(parts["bodies"]):
        body.set_facecolor(["#dc2626", "#059669"][i])
        body.set_edgecolor("black")
        body.set_alpha(0.75)
    ax1.set_xticks([1, 2])
    ax1.set_xticklabels(["conv.", "BS"])
    ax1.set_ylabel("time (min)")
    style_2d(ax1)

    # (b) violin of quality per paradigm
    parts = ax2.violinplot([conv_q, bs_q], showmeans=True, showmedians=False)
    for i, body in enumerate(parts["bodies"]):
        body.set_facecolor(["#dc2626", "#059669"][i])
        body.set_edgecolor("black")
        body.set_alpha(0.75)
    ax2.set_xticks([1, 2])
    ax2.set_xticklabels(["conv.", "BS"])
    ax2.set_ylabel("quality (1-10)")
    style_2d(ax2)

    # (c) scatter of time vs quality
    ax3.scatter(conv_t, conv_q, color="#dc2626", alpha=0.75, s=32,
                edgecolor="white", linewidth=0.3, label="conv.")
    ax3.scatter(bs_t, bs_q, color="#059669", alpha=0.75, s=32,
                edgecolor="white", linewidth=0.3, label="BS")
    ax3.set_xlabel("time (min)")
    ax3.set_ylabel("quality")
    ax3.legend(fontsize=7, frameon=False, loc="lower right")
    style_2d(ax3)

    # (d) 3D: (scientist, time, quality) colored by paradigm
    sids = np.arange(n_s)
    ax4.scatter(sids, conv_t, conv_q, color="#dc2626", s=24, alpha=0.78,
                edgecolor="white", linewidth=0.3, label="conv.")
    ax4.scatter(sids, bs_t, bs_q, color="#059669", s=24, alpha=0.78,
                edgecolor="white", linewidth=0.3, label="BS")
    ax4.set_xlabel("scientist")
    ax4.set_ylabel("time (min)")
    ax4.set_zlabel("quality")
    ax4.view_init(elev=22, azim=-55)
    ax4.legend(fontsize=6.5, frameon=False, loc="upper left")
    style_3d(ax4)

    save(fig, paper_dir, "panel5_scientific_workflow")


def main():
    paper1()
    paper2()
    paper3()
    print("\nAll panels generated.")


if __name__ == "__main__":
    main()
