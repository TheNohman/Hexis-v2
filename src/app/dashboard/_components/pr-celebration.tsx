type Props = {
  prs: {
    exerciseName: string;
    weightKg: number;
    reps: number;
    estimated1RM: number;
    previousEstimated1RM: number | null;
  }[];
};

/**
 * Celebratory panel shown at the top of the dashboard immediately after
 * a session where new PRs were detected. Non-dismissible visually (it
 * goes away on the next navigation because the ?prs=N param drops off).
 */
export function PrCelebration({ prs }: Props) {
  if (prs.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-done/50 bg-done/10 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🏆</span>
        <div>
          <h2 className="text-lg font-display font-bold text-done">
            {prs.length === 1 ? "Nouveau record !" : `${prs.length} nouveaux records !`}
          </h2>
          <p className="text-xs text-muted">Ta séance vient d&rsquo;établir un nouveau maximum.</p>
        </div>
      </div>
      <ul className="space-y-2">
        {prs.map((pr, i) => {
          const delta =
            pr.previousEstimated1RM != null
              ? pr.estimated1RM - pr.previousEstimated1RM
              : null;
          return (
            <li
              key={`${pr.exerciseName}-${i}`}
              className="flex items-center justify-between rounded-xl bg-surface border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{pr.exerciseName}</p>
                <p className="text-xs text-muted tabular-nums">
                  {pr.weightKg} kg × {pr.reps} rep{pr.reps > 1 ? "s" : ""}
                  {pr.reps > 1 && ` · ≈ ${pr.estimated1RM} kg 1RM`}
                </p>
              </div>
              {delta != null && delta > 0 && (
                <span className="text-xs font-bold text-done tabular-nums whitespace-nowrap ml-3">
                  +{delta.toFixed(1)} kg
                </span>
              )}
              {delta == null && (
                <span className="text-[10px] font-bold uppercase text-done whitespace-nowrap ml-3">
                  1er PR
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
