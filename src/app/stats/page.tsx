import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getWorkoutStats, getWellnessPerformanceCorrelation } from "@/lib/stats/queries";
import { formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const userId = await getCurrentUserId();
  const [stats, wellnessPerf] = await Promise.all([
    getWorkoutStats(userId),
    getWellnessPerformanceCorrelation(userId, 30),
  ]);

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

        {/* Personal Records */}
        {stats.personalRecords.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Records personnels
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stats.personalRecords.map((pr) => (
                <Link
                  key={pr.exerciseId}
                  href={`/exercises/${pr.exerciseId}`}
                  className="rounded-xl border border-border bg-surface p-3.5 flex items-center justify-between hover:bg-surface-hover transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{pr.name}</p>
                    <p className="text-[10px] text-subtle mt-0.5">Charge max</p>
                  </div>
                  <p className="text-lg font-display font-bold text-done tabular-nums shrink-0 ml-3">
                    {pr.maxWeight} kg
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Wellness x Performance */}
        {wellnessPerf.length >= 3 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Bien-&ecirc;tre &amp; performance (30 jours)
            </h2>
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              {(() => {
                const withWorkout = wellnessPerf.filter((p) => p.volume > 0);
                const withoutWorkout = wellnessPerf.filter((p) => p.volume === 0);
                if (withWorkout.length === 0) {
                  return <p className="text-sm text-subtle text-center">Pas assez de donn&eacute;es crois&eacute;es.</p>;
                }
                const avgEnergyTraining = withWorkout.reduce((s, p) => s + p.energy, 0) / withWorkout.length;
                const avgSleepTraining = withWorkout.reduce((s, p) => s + p.sleep, 0) / withWorkout.length;
                const avgStressTraining = withWorkout.reduce((s, p) => s + p.stress, 0) / withWorkout.length;
                const avgEnergyRest = withoutWorkout.length > 0
                  ? withoutWorkout.reduce((s, p) => s + p.energy, 0) / withoutWorkout.length : null;
                const avgSleepRest = withoutWorkout.length > 0
                  ? withoutWorkout.reduce((s, p) => s + p.sleep, 0) / withoutWorkout.length : null;

                const metrics = [
                  { label: "\u00c9nergie", icon: "\u26a1", training: avgEnergyTraining, rest: avgEnergyRest },
                  { label: "Sommeil", icon: "\ud83d\ude34", training: avgSleepTraining, rest: avgSleepRest },
                  { label: "Stress", icon: "\ud83e\uddd8", training: avgStressTraining, rest: null },
                ];

                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-3">
                      {metrics.map((m) => (
                        <div key={m.label} className="text-center">
                          <span className="text-lg">{m.icon}</span>
                          <p className="text-xl font-display font-bold tabular-nums mt-1">{m.training.toFixed(1)}</p>
                          <p className="text-[10px] text-muted">{m.label}</p>
                          <p className="text-[10px] text-subtle">jours d&rsquo;entra&icirc;nement</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-subtle text-center mt-2">
                      Bas&eacute; sur {withWorkout.length} jour{withWorkout.length > 1 ? "s" : ""} d&rsquo;entra&icirc;nement
                      {avgSleepRest != null && ` vs ${withoutWorkout.length} jour${withoutWorkout.length > 1 ? "s" : ""} de repos`}
                    </p>
                  </div>
                );
              })()}
            </div>
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
            <p className="text-sm text-subtle">Aucune donn&eacute;e.</p>
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
            <div className="flex items-end gap-2 h-36">
              {stats.weeklyActivity.map((week) => {
                const pct = (week.count / maxWeekCount) * 100;
                const label = new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(week.weekStart));
                return (
                  <div key={week.weekStart} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-accent tabular-nums">
                      {week.count || ""}
                    </span>
                    <div className="w-full flex items-end h-24">
                      <div
                        className="w-full rounded-md bg-accent transition-all duration-500"
                        style={{
                          height: week.count > 0 ? `${Math.max(pct, 12)}%` : "4px",
                          opacity: week.count > 0 ? 1 : 0.15,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted">{label}</span>
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
              <div className="flex items-end gap-2 h-36">
                {stats.weeklyVolume.map((week) => {
                  const pct = (week.volume / maxWeekVolume) * 100;
                  const label = new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(week.weekStart));
                  const volLabel = week.volume >= 1000
                    ? `${(week.volume / 1000).toFixed(1)}k`
                    : week.volume > 0 ? `${Math.round(week.volume)}` : "";
                  return (
                    <div key={week.weekStart} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-done tabular-nums">
                        {volLabel}
                      </span>
                      <div className="w-full flex items-end h-24">
                        <div
                          className="w-full rounded-md bg-done transition-all duration-500"
                          style={{
                            height: week.volume > 0 ? `${Math.max(pct, 12)}%` : "4px",
                            opacity: week.volume > 0 ? 0.9 : 0.15,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted">{label}</span>
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
