import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getWorkoutStats } from "@/lib/stats/queries";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const userId = await getCurrentUserId();
  const stats = await getWorkoutStats(userId);

  const maxExerciseCount = stats.topExercises[0]?.count ?? 1;
  const maxWeekCount = Math.max(...stats.weeklyActivity.map((w) => w.count), 1);

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
        <section className="grid grid-cols-3 gap-3">
          {[
            { value: stats.totalWorkouts, label: "S\u00e9ances" },
            { value: stats.totalFinished, label: "Termin\u00e9es" },
            { value: stats.totalSetsDone, label: "S\u00e9ries" },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-xl border border-border bg-surface p-4 text-center">
              <p className="text-2xl font-display font-bold text-accent tabular-nums">{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </section>

        {/* Top exercises */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Top 5 exercices
          </h2>
          {stats.topExercises.length === 0 ? (
            <p className="text-sm text-subtle">Aucune donn&eacute;e.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topExercises.map((ex) => (
                <li key={ex.exerciseId} className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{ex.name}</span>
                    <span className="text-xs text-muted tabular-nums">
                      {ex.count} entr&eacute;e{ex.count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${(ex.count / maxExerciseCount) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Weekly activity */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Activit&eacute; par semaine
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
      </div>
    </main>
  );
}
