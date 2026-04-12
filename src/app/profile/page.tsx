import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getUserProfile } from "@/lib/profile/mutations";
import { listBodyWeightEntries } from "@/lib/bodyweight/queries";
import { getRecentWellnessLogs } from "@/lib/wellness/queries";
import { getWorkoutStats } from "@/lib/stats/queries";
import { getActiveProgram } from "@/lib/programs/queries";
import { listTypeConfigs } from "@/lib/measurements/type-config-queries";
import { listAllMeasurements } from "@/lib/measurements/queries";
import { formatDuration } from "@/lib/format";
import { ProfileForm } from "./_components/profile-form";
import { HubCard } from "./_components/hub-card";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  const [
    profile,
    bwEntries,
    typeConfigs,
    measurements,
    wellnessLogs,
    stats,
    activeProgram,
  ] = await Promise.all([
    getUserProfile(userId),
    listBodyWeightEntries(userId),
    listTypeConfigs(userId),
    listAllMeasurements(userId),
    getRecentWellnessLogs(userId, 30),
    getWorkoutStats(userId),
    getActiveProgram(userId),
  ]);

  // ─── Measurements summary ───
  type MeasureRow = {
    label: string;
    value: string;
    delta?: string;
    deltaClass?: string;
  };
  const measureRows: MeasureRow[] = [];

  if (bwEntries.length > 0) {
    const latest = bwEntries[0].weightKg;
    const prev = bwEntries.length >= 2 ? bwEntries[1].weightKg : null;
    const d = prev != null ? latest - prev : null;
    measureRows.push({
      label: "Poids",
      value: `${latest.toFixed(1)} kg`,
      delta:
        d != null ? `${d > 0 ? "+" : ""}${d.toFixed(1)}` : undefined,
      deltaClass:
        d != null
          ? d > 0
            ? "text-danger"
            : d < 0
              ? "text-done"
              : "text-muted"
          : undefined,
    });
  }

  const latestByType = new Map<string, number>();
  for (const entry of measurements) {
    if (!latestByType.has(entry.type))
      latestByType.set(entry.type, entry.value);
  }
  for (const config of typeConfigs) {
    const v = latestByType.get(config.slug);
    measureRows.push({
      label: config.label,
      value: v != null ? `${v.toFixed(1)} ${config.unit}` : "\u2014",
    });
  }

  // ─── Wellness: 7-day sparkline data + trends ───
  const last7 = wellnessLogs.slice(0, 7).reverse(); // oldest→newest for sparkline
  const lastLog = wellnessLogs.length > 0 ? wellnessLogs[0] : null;

  function trend(values: number[]): "up" | "down" | "stable" {
    if (values.length < 3) return "stable";
    const recent = values.slice(-3).reduce((s, v) => s + v, 0) / 3;
    const older = values.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
    const diff = recent - older;
    if (diff > 0.5) return "up";
    if (diff < -0.5) return "down";
    return "stable";
  }

  const moodTrend = trend(last7.map((l) => l.mood));
  const stressTrend = trend(last7.map((l) => l.stress));

  const TREND_ARROW = { up: "↑", down: "↓", stable: "→" } as const;
  const MOOD_EMOJI = [
    "",
    "\ud83d\ude2b",
    "\ud83d\ude1f",
    "\ud83d\ude10",
    "\ud83d\ude0a",
    "\ud83d\ude04",
  ];

  // ─── Activity: this week stats ───
  const thisWeek = stats.weeklyActivity.length > 0
    ? stats.weeklyActivity[stats.weeklyActivity.length - 1]
    : null;
  const thisWeekVolume = stats.weeklyVolume.length > 0
    ? stats.weeklyVolume[stats.weeklyVolume.length - 1]
    : null;

  // ─── Program: current slot info ───
  const currentSlot = activeProgram?.currentSlot;
  const currentCycleDisplay = currentSlot
    ? `Cycle ${currentSlot.cycle + 1}`
    : null;
  const currentDayDisplay = currentSlot
    ? DAY_NAMES[currentSlot.day] ?? `Jour ${currentSlot.day + 1}`
    : null;

  // ─── Personal records ───
  const prs = stats.personalRecords.slice(0, 4);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              Profil
            </h1>
            <p className="text-xs text-muted mt-1">
              {profile.name ?? profile.email ?? ""}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Retour
          </Link>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {/* ─── Programme actif ─── */}
          {activeProgram && (
            <HubCard
              href={`/programs/${activeProgram.programId}`}
              title="Programme"
              className="col-span-2"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="3" width="12" height="11" rx="1.5" />
                  <line x1="5" y1="1" x2="5" y2="4" />
                  <line x1="11" y1="1" x2="11" y2="4" />
                  <line x1="2" y1="7" x2="14" y2="7" />
                </svg>
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {activeProgram.programName}
                  </p>
                  {currentSlot && (
                    <p className="text-xs text-muted mt-0.5">
                      {currentCycleDisplay} &middot; {currentDayDisplay}
                      {currentSlot.startTime && ` \u2014 ${currentSlot.startTime}`}
                    </p>
                  )}
                </div>
                {currentSlot?.templateName && (
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-accent font-medium">
                      Prochaine
                    </p>
                    <p className="text-sm font-medium mt-0.5">
                      {currentSlot.templateName}
                    </p>
                  </div>
                )}
              </div>
            </HubCard>
          )}

          {/* ─── Activité enrichie ─── */}
          <HubCard
            href="/stats"
            title="Activité"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 2v12M12 2v12M2 6h4M10 6h4M2 10h4M10 10h4" />
              </svg>
            }
          >
            <p className="text-xl font-display font-bold tabular-nums">
              {thisWeek ? thisWeek.count : stats.totalWorkouts}{" "}
              <span className="text-sm font-sans font-normal text-muted">
                séance{(thisWeek ? thisWeek.count : stats.totalWorkouts) !== 1 ? "s" : ""}
              </span>
            </p>
            <div className="flex items-center gap-3 mt-1">
              {stats.avgDurationMins != null && (
                <span className="text-xs text-subtle">
                  Moy. {formatDuration(stats.avgDurationMins * 60)}
                </span>
              )}
              {thisWeekVolume && thisWeekVolume.volume > 0 && (
                <span className="text-xs text-subtle">
                  {Math.round(thisWeekVolume.volume / 1000)}t vol.
                </span>
              )}
            </div>
            {/* Mini bar chart — 8 weeks */}
            {stats.weeklyActivity.some((w) => w.count > 0) && (
              <div className="flex items-end gap-0.5 h-6 mt-2">
                {stats.weeklyActivity.map((week) => {
                  const max = Math.max(
                    ...stats.weeklyActivity.map((w) => w.count),
                    1,
                  );
                  const pct = (week.count / max) * 100;
                  return (
                    <div
                      key={week.weekStart}
                      className="flex-1 rounded-sm bg-accent transition-all"
                      style={{
                        height:
                          week.count > 0
                            ? `${Math.max(pct, 15)}%`
                            : "2px",
                        opacity: week.count > 0 ? 0.6 : 0.15,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </HubCard>

          {/* ─── Bien-être enrichi ─── */}
          <HubCard
            href="/profile/bien-etre"
            title="Bien-être"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 14s-5.5-3.5-5.5-7A3.5 3.5 0 018 4a3.5 3.5 0 015.5 3c0 3.5-5.5 7-5.5 7z" />
              </svg>
            }
          >
            {lastLog ? (
              <>
                {/* Sparkline mood 7 jours */}
                {last7.length >= 2 && (
                  <div className="flex items-end gap-0.5 h-5 mb-2">
                    {last7.map((l, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-done transition-all"
                        style={{
                          height: `${(l.mood / 5) * 100}%`,
                          opacity: 0.4 + (l.mood / 5) * 0.6,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {MOOD_EMOJI[lastLog.mood]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted">
                        Humeur {TREND_ARROW[moodTrend]}
                      </span>
                      <span className="text-muted">
                        Stress {TREND_ARROW[stressTrend]}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-subtle mt-1">
                  {wellnessLogs.length} jour{wellnessLogs.length !== 1 ? "s" : ""} enregistré{wellnessLogs.length !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <p className="text-xs text-subtle">Aucune donnée</p>
            )}
          </HubCard>

          {/* ─── Records personnels ─── */}
          {prs.length > 0 && (
            <HubCard
              href="/stats"
              title="Records"
              className="col-span-2"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 1l2 4h4l-3 3 1 5-4-2.5L4 13l1-5-3-3h4z" />
                </svg>
              }
            >
              <div className="grid grid-cols-2 gap-1.5">
                {prs.map((pr) => (
                  <div
                    key={pr.exerciseId}
                    className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2"
                  >
                    <span className="text-xs text-muted truncate mr-2">
                      {pr.name}
                    </span>
                    <span className="text-sm font-medium tabular-nums shrink-0">
                      {pr.maxWeight} kg
                    </span>
                  </div>
                ))}
              </div>
            </HubCard>
          )}

          {/* ─── Mesures corporelles ─── */}
          <HubCard
            href="/profile/mesures"
            title="Mesures"
            className="col-span-2"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 14V4l4 3 4-5 4 4v8H2z" />
              </svg>
            }
          >
            <div className="space-y-1.5">
              {measureRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2"
                >
                  <span className="text-sm text-muted">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">
                      {row.value}
                    </span>
                    {row.delta && (
                      <span
                        className={`text-xs tabular-nums ${row.deltaClass}`}
                      >
                        {row.delta}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {measureRows.length === 0 && (
                <p className="text-xs text-subtle text-center py-1">
                  Aucune mesure enregistrée
                </p>
              )}
            </div>
          </HubCard>

          {/* ─── Mentor IA (CTA) ─── */}
          {profile.mentorEnabled && (
            <HubCard
              title="Mentor IA"
              className="col-span-2"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="8" cy="6" r="4" />
                  <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                </svg>
              }
            >
              <p className="text-sm text-muted">
                Conseil pour ta prochaine séance
              </p>
            </HubCard>
          )}
        </div>

        {/* ─── Préférences (en bas, replié visuellement) ─── */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer py-2 text-xs text-muted hover:text-foreground transition-colors list-none">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="transition-transform group-open:rotate-90"
            >
              <polyline points="4,2 8,6 4,10" />
            </svg>
            Préférences
          </summary>
          <div className="mt-2">
            <ProfileForm profile={profile} />
          </div>
        </details>
      </div>
    </main>
  );
}
