import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getWorkoutStats, getWellnessPerformanceCorrelation } from "@/lib/stats/queries";
import { listRecentEvents, countEventsByName } from "@/lib/telemetry/queries";
import { formatDuration } from "@/lib/format";
import { WellnessCorrelation } from "./_components/wellness-correlation";
import { RecentEvents } from "./_components/recent-events";
import { Card } from "@/app/_components/card";

export const dynamic = "force-dynamic";

function thirtyDaysAgo(): Date {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

export default async function StatsPage() {
  const userId = await getCurrentUserId();
  const since30d = thirtyDaysAgo();
  const [stats, wellnessPerf, recentEvents, eventCounts] = await Promise.all([
    getWorkoutStats(userId),
    getWellnessPerformanceCorrelation(userId, 30),
    listRecentEvents(userId, 30),
    countEventsByName(userId, since30d),
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
            { value: stats.totalWorkouts, label: "Séances" },
            { value: stats.totalFinished, label: "Terminées" },
            { value: stats.totalSetsDone, label: "Séries" },
            {
              value: stats.avgDurationMins != null ? formatDuration(stats.avgDurationMins * 60) : "—",
              label: "Durée moy.",
            },
          ].map(({ value, label }) => (
            <Card key={label} className="text-center">
              <p className="text-2xl font-display font-bold text-accent tabular-nums">{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </Card>
          ))}
        </section>

        {/* Total volume */}
        {stats.totalVolume > 0 && (
          <Card as="section" className="text-center">
            <p className="text-3xl font-display font-bold text-accent tabular-nums">
              {Math.round(stats.totalVolume).toLocaleString("fr-FR")} kg
            </p>
            <p className="text-xs text-muted mt-1">Volume total soulev&eacute;</p>
          </Card>
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

        {/* Activité récente (télémétrie in-app) */}
        <RecentEvents events={recentEvents} counts={eventCounts} />

        {/* Wellness × Performance correlation (Pearson + bucketed avg) */}
        <WellnessCorrelation points={wellnessPerf} />

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
          <Card>
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
          </Card>
        </section>

        {/* Weekly volume */}
        {stats.weeklyVolume.some((w) => w.volume > 0) && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Volume par semaine (kg)
            </h2>
            <Card>
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
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
