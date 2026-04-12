import Link from "next/link";
import { formatDuration } from "@/lib/format";
import type { WorkoutStats } from "@/lib/stats/queries";

type Props = { stats: WorkoutStats };

export function ActivitySummary({ stats }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Activit&eacute;
        </h2>
        <Link
          href="/stats"
          className="text-xs text-accent hover:text-accent-hover transition-colors"
        >
          Stats d&eacute;taill&eacute;es &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="text-xl font-display font-bold text-accent tabular-nums">
            {stats.totalWorkouts}
          </p>
          <p className="text-[10px] text-muted mt-0.5">S&eacute;ances</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="text-xl font-display font-bold tabular-nums">
            {stats.totalSetsDone}
          </p>
          <p className="text-[10px] text-muted mt-0.5">S&eacute;ries</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="text-xl font-display font-bold tabular-nums">
            {stats.avgDurationMins != null
              ? formatDuration(stats.avgDurationMins * 60)
              : "\u2014"}
          </p>
          <p className="text-[10px] text-muted mt-0.5">Dur&eacute;e moy.</p>
        </div>
        {stats.totalVolume > 0 && (
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className="text-xl font-display font-bold tabular-nums">
              {Math.round(stats.totalVolume / 1000)}k
            </p>
            <p className="text-[10px] text-muted mt-0.5">Volume (kg)</p>
          </div>
        )}
      </div>

      {/* Weekly activity mini chart */}
      {stats.weeklyActivity.some((w) => w.count > 0) && (
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-[10px] text-subtle mb-2">S&eacute;ances / semaine (8 derni&egrave;res)</p>
          <div className="flex items-end gap-1.5 h-16">
            {stats.weeklyActivity.map((week) => {
              const max = Math.max(...stats.weeklyActivity.map((w) => w.count), 1);
              const pct = (week.count / max) * 100;
              return (
                <div key={week.weekStart} className="flex-1 flex flex-col items-center gap-0.5">
                  {week.count > 0 && (
                    <span className="text-[9px] text-muted tabular-nums">{week.count}</span>
                  )}
                  <div className="w-full flex items-end h-10">
                    <div
                      className="w-full rounded-sm bg-accent transition-all"
                      style={{
                        height: week.count > 0 ? `${Math.max(pct, 15)}%` : "2px",
                        opacity: week.count > 0 ? 0.7 : 0.15,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
