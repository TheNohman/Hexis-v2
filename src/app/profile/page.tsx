import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getUserProfile } from "@/lib/profile/mutations";
import { listBodyWeightEntries } from "@/lib/bodyweight/queries";
import { getRecentWellnessLogs } from "@/lib/wellness/queries";
import { getWorkoutStats } from "@/lib/stats/queries";
import { listTypeConfigs } from "@/lib/measurements/type-config-queries";
import { listAllMeasurements } from "@/lib/measurements/queries";
import { formatDuration } from "@/lib/format";
import { ProfileForm } from "./_components/profile-form";
import { HubCard } from "./_components/hub-card";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  const [profile, bodyWeightEntries, typeConfigs, measurements, wellnessLogs, stats] =
    await Promise.all([
      getUserProfile(userId),
      listBodyWeightEntries(userId),
      listTypeConfigs(userId),
      listAllMeasurements(userId),
      getRecentWellnessLogs(userId, 30),
      getWorkoutStats(userId),
    ]);

  // Body weight summary
  const latestWeight = bodyWeightEntries.length > 0 ? bodyWeightEntries[0].weightKg : null;
  const weightTrend =
    bodyWeightEntries.length >= 2
      ? bodyWeightEntries[0].weightKg - bodyWeightEntries[1].weightKg
      : null;

  // Latest value per measurement type
  const latestByType = new Map<string, number>();
  for (const entry of measurements) {
    if (!latestByType.has(entry.type)) {
      latestByType.set(entry.type, entry.value);
    }
  }

  // Wellness averages
  const avgMood =
    wellnessLogs.length > 0
      ? wellnessLogs.reduce((s, l) => s + l.mood, 0) / wellnessLogs.length
      : null;
  const avgEnergy =
    wellnessLogs.length > 0
      ? wellnessLogs.reduce((s, l) => s + l.energy, 0) / wellnessLogs.length
      : null;

  const MOOD_EMOJI = ["", "\ud83d\ude2b", "\ud83d\ude1f", "\ud83d\ude10", "\ud83d\ude0a", "\ud83d\ude04"];
  const ENERGY_EMOJI = ["", "\ud83e\udead", "\ud83e\udd71", "\ud83d\ude10", "\u26a1", "\ud83d\udd25"];

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
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

        <ProfileForm profile={profile} />

        {/* Hub cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Mesures corporelles — full width, includes weight */}
          <HubCard
            href="/profile/mesures"
            title="Mesures"
            className="col-span-2"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 14V4l4 3 4-5 4 4v8H2z" />
              </svg>
            }
          >
            <div className="space-y-1.5">
              {/* Body weight row */}
              <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2">
                <span className="text-sm text-muted">Poids</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {latestWeight != null ? `${latestWeight.toFixed(1)} kg` : "\u2014"}
                  </span>
                  {weightTrend != null && (
                    <span
                      className={`text-xs tabular-nums ${
                        weightTrend > 0 ? "text-danger" : weightTrend < 0 ? "text-done" : "text-muted"
                      }`}
                    >
                      {weightTrend > 0 ? "+" : ""}{weightTrend.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Each measurement type row */}
              {typeConfigs.map((config) => {
                const latest = latestByType.get(config.slug);
                return (
                  <div
                    key={config.slug}
                    className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2"
                  >
                    <span className="text-sm text-muted">{config.label}</span>
                    <span className="text-sm font-medium tabular-nums">
                      {latest != null ? `${latest.toFixed(1)} ${config.unit}` : "\u2014"}
                    </span>
                  </div>
                );
              })}

              {typeConfigs.length === 0 && latestWeight == null && (
                <p className="text-xs text-subtle text-center py-1">
                  Aucune mesure enregistree
                </p>
              )}
            </div>
          </HubCard>

          {/* Bien-etre */}
          <HubCard
            href="/profile/bien-etre"
            title="Bien-etre"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 14s-5.5-3.5-5.5-7A3.5 3.5 0 018 4a3.5 3.5 0 015.5 3c0 3.5-5.5 7-5.5 7z" />
              </svg>
            }
          >
            <p className="text-xl font-display font-bold tabular-nums">
              {avgMood != null
                ? `${MOOD_EMOJI[Math.round(avgMood)]} ${ENERGY_EMOJI[Math.round(avgEnergy ?? 3)]}`
                : "\u2014"}
            </p>
            <p className="text-xs text-subtle mt-1">
              {wellnessLogs.length > 0
                ? `${wellnessLogs.length} jour${wellnessLogs.length !== 1 ? "s" : ""}`
                : "Aucune donnee"}
            </p>
          </HubCard>

          {/* Activite */}
          <HubCard
            href="/stats"
            title="Activite"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v12M12 2v12M2 6h4M10 6h4M2 10h4M10 10h4" />
              </svg>
            }
          >
            <p className="text-xl font-display font-bold tabular-nums">
              {stats.totalWorkouts} seance{stats.totalWorkouts !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-subtle mt-1">
              {stats.avgDurationMins != null
                ? `Moy. ${formatDuration(stats.avgDurationMins * 60)}`
                : "Aucune seance"}
            </p>
          </HubCard>
        </div>
      </div>
    </main>
  );
}
