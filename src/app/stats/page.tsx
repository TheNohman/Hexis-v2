import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getWorkoutStats, getWellnessPerformanceCorrelation } from "@/lib/stats/queries";
import { listRecentEvents, countEventsByName } from "@/lib/telemetry/queries";
import { formatDuration } from "@/lib/format";
import { WellnessCorrelation } from "./_components/wellness-correlation";
import { RecentEvents } from "./_components/recent-events";
import { Sparkline } from "@/app/_components/sparkline";

export const dynamic = "force-dynamic";

function thirtyDaysAgo(): Date {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

function formatVolumeShort(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v)}`;
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

  const activityValues = stats.weeklyActivity.map((w) => w.count);
  const volumeValues = stats.weeklyVolume.map((w) => w.volume);

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-6 pb-28">
      <div className="max-w-2xl w-full space-y-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px] leading-tight">
              Statistiques
            </h1>
            <p className="text-xs text-muted mt-1">Ta performance en un coup d&rsquo;œil</p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-muted hover:text-foreground transition-colors py-1"
          >
            ← Retour
          </Link>
        </header>

        {/* Hero total volume — only if meaningful data */}
        {stats.totalVolume > 0 ? (
          <section
            aria-label="Volume total soulevé"
            className="rounded-3xl bg-foreground text-background p-6 shadow-hero"
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold text-accent">
              Volume total soulevé
            </p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <p className="font-display font-black text-5xl tabular-nums leading-none">
                {Math.round(stats.totalVolume).toLocaleString("fr-FR")}
                <span className="text-2xl text-background/70 font-bold ml-1">kg</span>
              </p>
              {volumeValues.length > 1 && (
                <Sparkline
                  values={volumeValues}
                  color="var(--accent)"
                  width={100}
                  height={44}
                  strokeWidth={2.5}
                />
              )}
            </div>
            <p className="text-xs text-background/70 mt-3 tabular-nums">
              {stats.totalFinished} séance{stats.totalFinished > 1 ? "s" : ""} terminée
              {stats.totalFinished > 1 ? "s" : ""} · {stats.totalSetsDone} série
              {stats.totalSetsDone > 1 ? "s" : ""}
            </p>
          </section>
        ) : null}

        {/* Summary — 4 stat cards */}
        <section
          aria-label="Résumé de l&rsquo;activité"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
        >
          {[
            { value: stats.totalWorkouts, label: "Séances" },
            { value: stats.totalFinished, label: "Terminées" },
            { value: stats.totalSetsDone, label: "Séries" },
            {
              value:
                stats.avgDurationMins != null
                  ? formatDuration(stats.avgDurationMins * 60)
                  : "—",
              label: "Durée moy.",
            },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="rounded-2xl bg-surface shadow-card p-4"
            >
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
                {label}
              </p>
              <p className="font-display font-black text-2xl tabular-nums mt-1.5 leading-none">
                {value}
              </p>
            </div>
          ))}
        </section>

        {/* Personal Records */}
        {stats.personalRecords.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg tracking-tight">
              Records personnels
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stats.personalRecords.map((pr) => (
                <Link
                  key={pr.exerciseId}
                  href={`/exercises/${pr.exerciseId}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl bg-surface shadow-card p-4 hover:shadow-hero hover:-translate-y-0.5 transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
                      Charge max
                    </p>
                    <p className="text-sm font-display font-bold truncate mt-0.5">
                      {pr.name}
                    </p>
                  </div>
                  <p className="shrink-0 font-display font-black text-2xl tabular-nums">
                    {pr.maxWeight}
                    <span className="text-sm text-muted font-bold ml-0.5">kg</span>
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
            <h2 className="font-display font-bold text-lg tracking-tight">
              Derniers exercices
            </h2>
            <Link
              href="/exercises"
              className="text-xs font-semibold text-foreground hover:text-muted transition-colors inline-flex items-center gap-1"
            >
              Tout voir <span aria-hidden="true">→</span>
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
                      className="group flex items-center justify-between rounded-2xl bg-surface shadow-card px-4 py-3 hover:shadow-hero hover:-translate-y-0.5 transition-all"
                    >
                      <span className="text-sm font-display font-bold truncate">
                        {ex.name}
                      </span>
                      <span className="text-[11px] text-muted tabular-nums shrink-0 ml-3">
                        {dateLabel}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Weekly activity */}
        <section className="space-y-3">
          <h2 className="font-display font-bold text-lg tracking-tight">
            Séances par semaine
          </h2>
          <div
            className="rounded-2xl bg-surface shadow-card p-4"
            role="img"
            aria-label={`Séances par semaine sur ${stats.weeklyActivity.length} semaines, maximum ${maxWeekCount}`}
          >
            <div className="flex items-end gap-2 h-36">
              {stats.weeklyActivity.map((week) => {
                const pct = (week.count / maxWeekCount) * 100;
                const label = new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(week.weekStart));
                const isTop = week.count === maxWeekCount && week.count > 0;
                return (
                  <div
                    key={week.weekStart}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${
                        isTop ? "text-accent-ink" : "text-muted"
                      }`}
                    >
                      {week.count || ""}
                    </span>
                    <div className="w-full flex items-end h-24">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 ${
                          isTop ? "bg-accent" : "bg-[var(--lavender)]"
                        }`}
                        style={{
                          height: week.count > 0 ? `${Math.max(pct, 12)}%` : "4px",
                          opacity: week.count > 0 ? 1 : 0.2,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-subtle">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Weekly volume */}
        {stats.weeklyVolume.some((w) => w.volume > 0) && (
          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg tracking-tight">
              Volume par semaine
            </h2>
            <div
              className="rounded-2xl bg-surface shadow-card p-4"
              role="img"
              aria-label={`Volume soulevé par semaine sur ${stats.weeklyVolume.length} semaines, maximum ${Math.round(maxWeekVolume).toLocaleString("fr-FR")} kg`}
            >
              <div className="flex items-end gap-2 h-36">
                {stats.weeklyVolume.map((week) => {
                  const pct = (week.volume / maxWeekVolume) * 100;
                  const label = new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(week.weekStart));
                  const volLabel = week.volume > 0 ? formatVolumeShort(week.volume) : "";
                  const isTop = week.volume === maxWeekVolume && week.volume > 0;
                  return (
                    <div
                      key={week.weekStart}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span
                        className={`text-[10px] font-semibold tabular-nums ${
                          isTop ? "text-accent-ink" : "text-muted"
                        }`}
                      >
                        {volLabel}
                      </span>
                      <div className="w-full flex items-end h-24">
                        <div
                          className={`w-full rounded-lg transition-all duration-500 ${
                            isTop ? "bg-accent" : "bg-[var(--peach)]"
                          }`}
                          style={{
                            height: week.volume > 0 ? `${Math.max(pct, 12)}%` : "4px",
                            opacity: week.volume > 0 ? 1 : 0.2,
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-subtle">{label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-subtle mt-3 text-center tabular-nums">
                Sommets en bleu ·{" "}
                <span aria-label="kilogrammes">kg</span>
              </p>
            </div>
          </section>
        )}

        {volumeValues.length < 2 && activityValues.length < 2 && (
          <p className="text-xs text-subtle text-center">
            Continue à t&rsquo;entraîner — plus de données, plus d&rsquo;insights.
          </p>
        )}
      </div>
    </main>
  );
}
