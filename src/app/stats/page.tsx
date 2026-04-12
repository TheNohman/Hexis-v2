import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getWorkoutStats } from "@/lib/stats/queries";
import { formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const userId = await getCurrentUserId();
  const stats = await getWorkoutStats(userId);

  const maxWeekCount = Math.max(...stats.weeklyActivity.map((w) => w.count), 1);
  const maxWeekVolume = Math.max(...stats.weeklyVolume.map((w) => w.volume), 1);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Statistiques
          </h1>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            Retour
          </Link>
        </header>

        {/* Summary */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: stats.totalWorkouts, label: "S\u00e9ances" },
            { value: stats.totalFinished, label: "Termin\u00e9es" },
            { value: stats.totalSetsDone, label: "S\u00e9ries" },
            {
              value: stats.avgDurationMins != null ? formatDuration(stats.avgDurationMins * 60) : "\u2014",
              label: "Dur\u00e9e moy.",
            },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-xl border border-border bg-surface p-4 text-center">
              <p className="text-2xl font-display font-bold text-accent tabular-nums">{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </section>

        {/* Total volume */}
        {stats.totalVolume > 0 && (
          <section className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-3xl font-display font-bold text-accent tabular-nums">
              {Math.round(stats.totalVolume).toLocaleString("fr-FR")} kg
            </p>
            <p className="text-xs text-muted mt-1">Volume total soulev&eacute;</p>
          </section>
        )}

        {/* Recent exercises */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Derniers exercices
            </h2>
            <Link
              href="/exercises"
              className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
            >
              Voir tout &rarr;
            </Link>
          </div>
          {stats.recentExercises.length === 0 ? (
            <p className="text-sm text-subtle">Aucune donnée.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentExercises.map((ex) => {
                const dateLabel = new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(ex.lastUsedAt));
                return (
                  <li key={ex.exerciseId}>
                    <Link
                      href={`/exercises/${ex.exerciseId}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 hover:bg-surface-hover transition-colors"
                    >
                      <span className="text-sm font-medium">{ex.name}</span>
                      <span className="text-xs text-muted">{dateLabel}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Weekly activity */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            S&eacute;ances par semaine
          </h2>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-end gap-2 h-32">
              {stats.weeklyActivity.map((week) => {
                const pct = (week.count / maxWeekCount) * 100;
                const label = new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(week.weekStart));
                return (
                  <div key={week.weekStart} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-muted tabular-nums">
                      {week.count || ""}
                    </span>
                    <div className="w-full flex items-end h-20">
                      <div
                        className="w-full rounded bg-accent transition-all duration-500"
                        style={{
                          height: week.count > 0 ? `${Math.max(pct, 10)}%` : "3px",
                          opacity: week.count > 0 ? 0.8 : 0.2,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-subtle">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Weekly volume */}
        {stats.weeklyVolume.some((w) => w.volume > 0) && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Volume par semaine (kg)
            </h2>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-end gap-2 h-32">
                {stats.weeklyVolume.map((week) => {
                  const pct = (week.volume / maxWeekVolume) * 100;
                  const label = new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(week.weekStart));
                  return (
                    <div key={week.weekStart} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted tabular-nums">
                        {week.volume > 0 ? `${Math.round(week.volume / 1000)}k` : ""}
                      </span>
                      <div className="w-full flex items-end h-20">
                        <div
                          className="w-full rounded bg-done transition-all duration-500"
                          style={{
                            height: week.volume > 0 ? `${Math.max(pct, 10)}%` : "3px",
                            opacity: week.volume > 0 ? 0.7 : 0.15,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-subtle">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
