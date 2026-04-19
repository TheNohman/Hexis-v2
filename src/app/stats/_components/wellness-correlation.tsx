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

type DimKey = keyof Pick<Point, "sleep" | "energy" | "mood" | "stress">;

type Dim = {
  key: DimKey;
  icon: string;
  label: string;
  /** Label used when the dim's high score matters — "bien dormi" reads better than "haut sommeil". */
  highPhrase: string;
  /** Mirror phrase for the low bucket, used when the correlation is negative. */
  lowPhrase: string;
  /**
   * Whether "higher is better" for this signal. Stress is inverted — a 5 on the
   * stress scale means "very relaxed" in our UX, so positive correlation still
   * means "more relaxed → more volume".
   */
  positiveIsGood: boolean;
};

const DIMENSIONS: Dim[] = [
  {
    key: "sleep",
    icon: "\u{1F4A4}",
    label: "Sommeil",
    highPhrase: "tu as bien dormi",
    lowPhrase: "tu as mal dormi",
    positiveIsGood: true,
  },
  {
    key: "energy",
    icon: "\u{26A1}",
    label: "Énergie",
    highPhrase: "tu as de l'énergie",
    lowPhrase: "tu es à plat",
    positiveIsGood: true,
  },
  {
    key: "mood",
    icon: "\u{1F642}",
    label: "Humeur",
    highPhrase: "ton humeur est haute",
    lowPhrase: "ton humeur est basse",
    positiveIsGood: true,
  },
  {
    key: "stress",
    icon: "\u{1F9D8}",
    label: "Détente",
    highPhrase: "tu es détendu",
    lowPhrase: "tu es tendu",
    positiveIsGood: true,
  },
];

const R_THRESHOLD = 0.4;

/**
 * Wellness ↔ training volume — single actionable insight.
 * Instead of firing four abstract Pearson r values at the user, we pick the
 * dimension with the strongest signal (|r| >= 0.4) and phrase it as a
 * narrative: "Sur N jours, ton volume est +38% plus élevé quand tu as
 * bien dormi (≥4/5)." Below threshold = hide with a "pas assez de
 * données" fallback.
 */
export function WellnessCorrelation({ points }: Props) {
  if (points.length < 7) return null;

  // Zero-volume days flatten the correlation; exclude them.
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

  // Compute r for every dimension, then pick the strongest.
  type Scored = Dim & {
    r: number;
    highAvg: number | null;
    lowAvg: number | null;
    highDays: number;
    lowDays: number;
  };

  const scored: Scored[] = DIMENSIONS.map((dim) => {
    const xs = active.map((p) => p[dim.key]);
    const ys = active.map((p) => p.volume);
    const r = pearson(xs, ys);
    const low = active.filter((p) => p[dim.key] <= 2).map((p) => p.volume);
    const high = active.filter((p) => p[dim.key] >= 4).map((p) => p.volume);
    return {
      ...dim,
      r,
      lowAvg: low.length ? avg(low) : null,
      highAvg: high.length ? avg(high) : null,
      lowDays: low.length,
      highDays: high.length,
    };
  });

  const strongest = scored
    .filter((s) => Math.abs(s.r) >= R_THRESHOLD)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0];

  if (!strongest) {
    return (
      <section className="rounded-2xl bg-surface shadow-card p-5 text-center">
        <p className="text-sm text-subtle">
          Pas assez de données pour un lien clair entre ton bien-être et ton volume.
        </p>
        <p className="text-[11px] text-subtle mt-1">
          Basé sur {active.length} jours d&rsquo;entraînement.
        </p>
      </section>
    );
  }

  // Phrase the takeaway. Positive r = higher score ↔ higher volume.
  // We always compare the "favourable" bucket vs the "unfavourable" one
  // so the delta reads naturally in French.
  const direction: "pos" | "neg" = strongest.r > 0 ? "pos" : "neg";
  const phrase = direction === "pos" ? strongest.highPhrase : strongest.lowPhrase;

  const { highAvg, lowAvg } = strongest;
  let pctDelta: number | null = null;
  if (highAvg != null && lowAvg != null && lowAvg > 0) {
    // If positive r, high bucket is the good one — show its uplift over low.
    // If negative r, low bucket is the good one — compare low over high.
    const numerator = direction === "pos" ? highAvg : lowAvg;
    const denominator = direction === "pos" ? lowAvg : highAvg;
    if (denominator > 0) {
      pctDelta = Math.round(((numerator - denominator) / denominator) * 100);
    }
  }

  const pctLabel =
    pctDelta != null && pctDelta !== 0
      ? `${pctDelta > 0 ? "+" : ""}${pctDelta}% plus élevé`
      : "nettement plus élevé";
  const bucketLabel = direction === "pos" ? "≥ 4/5" : "≤ 2/5";

  return (
    <section className="space-y-3">
      <h2 className="font-display font-bold text-lg tracking-tight">
        Bien-être ↔ volume
      </h2>
      <div className="rounded-2xl bg-surface shadow-card p-5">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="text-2xl shrink-0">
            {strongest.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] leading-relaxed">
              Sur{" "}
              <span className="tabular-nums font-semibold">{active.length}</span>{" "}
              jours, ton volume est{" "}
              <span
                className={`font-semibold ${direction === "pos" ? "text-accent-ink" : "text-danger"}`}
              >
                {pctLabel}
              </span>{" "}
              quand {phrase} ({bucketLabel}).
            </p>
            {highAvg != null && lowAvg != null && (
              <p className="text-[11px] text-subtle tabular-nums mt-1.5">
                {direction === "pos"
                  ? `${formatVolume(highAvg)} en moyenne vs ${formatVolume(lowAvg)}`
                  : `${formatVolume(lowAvg)} en moyenne vs ${formatVolume(highAvg)}`}
                {" · "}
                r = {strongest.r >= 0 ? "+" : ""}
                {strongest.r.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
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

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k kg`;
  return `${Math.round(v)} kg`;
}
