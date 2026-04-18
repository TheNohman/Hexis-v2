type Point = {
  date: string;
  mood: number;
  sleep: number;
  energy: number;
  stress: number;
  volume: number;
};

type Props = {
  points: Point[];
};

/**
 * Pearson correlation + bucketed average view between wellness signals
 * and training volume. Shown on /stats when at least 7 days of data
 * are available so the number isn't meaningless.
 */
export function WellnessCorrelation({ points }: Props) {
  if (points.length < 7) return null;

  // Only consider days with any volume for the correlation; a zero-
  // volume day depresses the signal artificially.
  const active = points.filter((p) => p.volume > 0);
  if (active.length < 5) {
    return (
      <section className="rounded-2xl bg-surface shadow-card p-5 text-center">
        <p className="text-sm text-subtle">
          Encore trop peu de jours d&rsquo;entraînement pour mesurer une corrélation.
        </p>
      </section>
    );
  }

  const dims: Array<{
    key: keyof Pick<Point, "sleep" | "energy" | "mood" | "stress">;
    icon: string;
    label: string;
    /** Whether "higher is better" for this signal (stress is inverted — high stress = low detente). */
    positiveIsGood: boolean;
  }> = [
    { key: "sleep", icon: "\u{1F4A4}", label: "Sommeil", positiveIsGood: true },
    { key: "energy", icon: "\u{26A1}", label: "Énergie", positiveIsGood: true },
    { key: "mood", icon: "\u{1F642}", label: "Humeur", positiveIsGood: true },
    { key: "stress", icon: "\u{1F9D8}", label: "Détente", positiveIsGood: true },
  ];

  const rows = dims.map((dim) => {
    const xs = active.map((p) => p[dim.key]);
    const ys = active.map((p) => p.volume);
    const r = pearson(xs, ys);
    const { verdict, tone } = interpret(r);
    const low = active.filter((p) => p[dim.key] <= 2).map((p) => p.volume);
    const high = active.filter((p) => p[dim.key] >= 4).map((p) => p.volume);
    const lowAvg = low.length ? avg(low) : null;
    const highAvg = high.length ? avg(high) : null;
    return {
      ...dim,
      r,
      verdict,
      tone,
      lowAvg,
      highAvg,
      lowDays: low.length,
      highDays: high.length,
    };
  });

  return (
    <section className="space-y-3">
      <h2 className="font-display font-bold text-lg tracking-tight">
        Bien-être ↔ volume d&rsquo;entraînement
      </h2>
      <ul className="rounded-2xl bg-surface shadow-card divide-y divide-border overflow-hidden">
        {rows.map((row) => {
          // r ∈ [-1, 1] → bar position 0..100 with midpoint at 50
          const pct = Math.max(0, Math.min(100, (row.r + 1) * 50));
          return (
            <li key={row.key} className="p-3.5 flex items-center gap-3">
              <span aria-hidden="true" className="text-xl shrink-0">
                {row.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-display font-bold">{row.label}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold rounded-full px-2 py-0.5 ${
                        row.tone === "pos"
                          ? "bg-done/20 text-foreground"
                          : row.tone === "neg"
                            ? "bg-danger-soft text-danger"
                            : "bg-surface-hover text-muted"
                      }`}
                    >
                      <span aria-hidden="true">
                        {row.tone === "pos" ? "↑" : row.tone === "neg" ? "↓" : "→"}
                      </span>
                      {row.tone === "pos" ? "positif" : row.tone === "neg" ? "négatif" : "neutre"}
                    </span>
                    <span className="font-display font-bold text-sm tabular-nums">
                      {row.r >= 0 ? "+" : ""}
                      {row.r.toFixed(2)}
                    </span>
                  </div>
                </div>
                {/* Visual bar: -1 ← 0 → +1, marker shows r. Redundant with numeric r. */}
                <div
                  className="relative h-1.5 rounded-full bg-surface-hover mt-2 overflow-hidden"
                  aria-hidden="true"
                >
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <div
                    className={`absolute top-0 h-full rounded-full ${
                      row.tone === "pos"
                        ? "bg-done"
                        : row.tone === "neg"
                          ? "bg-danger"
                          : "bg-muted"
                    }`}
                    style={{
                      left: row.r >= 0 ? "50%" : `${pct}%`,
                      width: `${Math.abs(pct - 50)}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted mt-1.5">{row.verdict}</p>
                {row.lowAvg != null && row.highAvg != null && (
                  <p className="text-[10px] text-subtle tabular-nums mt-0.5">
                    Bas ({row.lowDays} j) : {formatVolume(row.lowAvg)} · Élevé (
                    {row.highDays} j) : {formatVolume(row.highAvg)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-subtle text-center">
        Basé sur {active.length} jours d&rsquo;entraînement. r ∈ [-1, 1] : +1 = corrélation
        parfaitement positive, 0 = aucune, -1 = parfaitement négative.
      </p>
    </section>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}

/**
 * Pearson correlation coefficient between two parallel numeric arrays.
 * Returns 0 if the data has no variance in either axis (undefined math).
 */
function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = avg(xs);
  const my = avg(ys);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return 0;
  return num / denom;
}

function interpret(r: number): { verdict: string; tone: "pos" | "neg" | "neutral" } {
  const a = Math.abs(r);
  if (a < 0.2) return { verdict: "Pas de lien clair", tone: "neutral" };
  if (a < 0.4) {
    return r > 0
      ? { verdict: "Lien positif faible", tone: "pos" }
      : { verdict: "Lien négatif faible", tone: "neg" };
  }
  if (a < 0.6) {
    return r > 0
      ? { verdict: "Lien positif modéré", tone: "pos" }
      : { verdict: "Lien négatif modéré", tone: "neg" };
  }
  return r > 0
    ? { verdict: "Lien positif fort", tone: "pos" }
    : { verdict: "Lien négatif fort", tone: "neg" };
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k kg`;
  return `${Math.round(v)} kg`;
}
