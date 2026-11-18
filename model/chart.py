"""The one chart for the deck: the average miss on lateness by how far ahead the forecast looks, model against the best naive
forecast, with the band where the model's miss fell 95 times in 100 when whole origins were drawn again.

  python3 -m model.chart --bundle fixtures --out artifacts/forecast

Every number drawn is read from metrics.json. On stand-in data the chart says so in its title. Needs matplotlib (not one of the engine's libraries)."""
import argparse, json, os, sys

INK = "#1E1A16"; INK_HALF = "#8E8C8A"            # the brand's ink, and ink at half strength on white


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--bundle", required=True); ap.add_argument("--out", required=True); a = ap.parse_args()
    import matplotlib; matplotlib.use("Agg"); matplotlib.rcParams["svg.hashsalt"] = "insiyab"; matplotlib.rcParams["svg.fonttype"] = "none"
    import matplotlib.pyplot as plt
    metrics = json.load(open(os.path.join(a.bundle, "metrics.json"), encoding="utf-8"))
    t = next(t for t in metrics["targets"] if t["target"] == "arrival_delay_seconds"); rows = t["by_horizon"]; labels = {m["model"]: m["label"] for m in t["models"]}
    x = list(range(len(rows))); naive = [r["naive_mae"] for r in rows]; model = [r["model_mae"] for r in rows]
    lo = [r["naive_mae"] * (1 - r["skill_hi"]) for r in rows]; hi = [r["naive_mae"] * (1 - r["skill_lo"]) for r in rows]
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=200)
    ax.fill_between(x, lo, hi, color=INK, alpha=0.12, linewidth=0, label="Where the model's miss fell 95 times in 100")
    ax.plot(x, naive, color=INK_HALF, linewidth=2, marker="o", label="Best naive: " + labels[rows[0]["best_naive"]].lower())
    ax.plot(x, model, color=INK, linewidth=2.5, marker="o", label="Insiyab's forecast (boosted trees)")
    for i, r in enumerate(rows):
        ax.annotate(f"{r['naive_mae']:.0f} s", (i, r["naive_mae"]), textcoords="offset points", xytext=(0, 8), ha="center", color=INK_HALF, fontsize=9)
        ax.annotate(f"{r['model_mae']:.0f} s", (i, r["model_mae"]), textcoords="offset points", xytext=(0, -15), ha="center", color=INK, fontsize=9)
    ax.set_xticks(x); ax.set_xticklabels([f"{r['horizon']} stop{'s' if r['horizon'] > 1 else ''} ahead\nn {r['n']:,}" for r in rows])
    ax.set_ylabel("Average miss (MAE), seconds"); ax.set_ylim(0, max(naive + hi) * 1.15)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    title = "Lateness forecast: average miss by how far ahead it looks"
    ax.set_title(("STAND-IN DATA, NOT A RESULT. " if metrics.get("fixture") else "") + title, loc="left", fontsize=11, color=INK)
    ax.legend(frameon=False, loc="upper left", fontsize=9)
    fig.text(0.01, 0.01, "Forecasts made from 16:00, set aside at the start and scored once. Source: metrics.json, written by the engine.", fontsize=7, color=INK_HALF)
    fig.tight_layout(rect=(0, 0.03, 1, 1)); os.makedirs(a.out, exist_ok=True)
    for ext in ("png", "svg"):
        fig.savefig(os.path.join(a.out, "lateness_by_horizon." + ext), metadata={"Date": None} if ext == "svg" else None)
    print(f"WROTE {a.out}/lateness_by_horizon.png and .svg"); return 0


if __name__ == "__main__":
    sys.exit(main())
