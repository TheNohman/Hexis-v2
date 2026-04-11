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
      <div className="max-w-2xl w-full space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <Link
            href="/dashboard"
            className="text-sm text-foreground/60 hover:text-foreground transition-colors"
          >
            Retour
          </Link>
        </header>

        {/* ---- Summary cards ---- */}
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
            <p className="text-sm text-foreground/60 mt-1">Séances</p>
          </div>
          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalFinished}</p>
            <p className="text-sm text-foreground/60 mt-1">Terminées</p>
          </div>
          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalSetsDone}</p>
            <p className="text-sm text-foreground/60 mt-1">Séries validées</p>
          </div>
        </section>

        {/* ---- Top 5 exercises ---- */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide">
            Top 5 exercices
          </h2>

          {stats.topExercises.length === 0 ? (
            <p className="text-sm text-foreground/40">Aucune donnée.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topExercises.map((ex) => (
                <li
                  key={ex.exerciseId}
                  className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{ex.name}</span>
                    <span className="text-xs text-foreground/60">
                      {ex.count} entrée{ex.count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground/80 transition-all"
                      style={{
                        width: `${(ex.count / maxExerciseCount) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- Weekly activity ---- */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide">
            Activité par semaine
          </h2>

          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
            <div className="flex items-end gap-2 h-32">
              {stats.weeklyActivity.map((week) => {
                const pct = (week.count / maxWeekCount) * 100;
                const label = new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(week.weekStart));

                return (
                  <div
                    key={week.weekStart}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-xs text-foreground/60">
                      {week.count}
                    </span>
                    <div className="w-full flex items-end h-20">
                      <div
                        className="w-full rounded-md bg-foreground/80 transition-all"
                        style={{
                          height:
                            week.count > 0
                              ? `${Math.max(pct, 8)}%`
                              : "4px",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-foreground/40">
                      {label}
                    </span>
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
