import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getUserProfile } from "@/lib/profile/mutations";
import { listBodyWeightEntries } from "@/lib/bodyweight/queries";
import { getRecentWellnessLogs } from "@/lib/wellness/queries";
import { getWorkoutStats } from "@/lib/stats/queries";
import { getActiveProgram } from "@/lib/programs/queries";
import { listTypeConfigs } from "@/lib/measurements/type-config-queries";
import { listAllMeasurements } from "@/lib/measurements/queries";
import { getSessionAdvice } from "@/lib/mentor/advice";
import { getSportProfile } from "@/lib/profile/onboarding";
import { computeHeartRateZones, computePaceZones } from "@/lib/endurance/zones";
import { ProfileForm } from "./_components/profile-form";
import { ProgramHubCard } from "./_components/program-hub-card";
import { ActivityHubCard } from "./_components/activity-hub-card";
import { WellnessHubCard } from "./_components/wellness-hub-card";
import { RecordsHubCard } from "./_components/records-hub-card";
import { MesuresHubCard, type MeasureRow } from "./_components/mesures-hub-card";
import { MentorAdviceCard } from "./_components/mentor-advice-card";
import { EnduranceRefsCard } from "./_components/endurance-refs-card";

export const dynamic = "force-dynamic";

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
    mentorAdvice,
    sportProfile,
  ] = await Promise.all([
    getUserProfile(userId),
    listBodyWeightEntries(userId),
    listTypeConfigs(userId),
    listAllMeasurements(userId),
    getRecentWellnessLogs(userId, 30),
    getWorkoutStats(userId),
    getActiveProgram(userId),
    getSessionAdvice(userId),
    getSportProfile(userId),
  ]);

  const showEnduranceRefs =
    sportProfile.primarySport === "ENDURANCE" ||
    sportProfile.primarySport === "MULTI_SPORT";
  const heartZones =
    showEnduranceRefs && profile.fcMax
      ? computeHeartRateZones(profile.fcMax, profile.fcResting)
      : null;
  const paceZones =
    showEnduranceRefs && profile.vmaKmh
      ? computePaceZones(profile.vmaKmh)
      : null;

  // ─── Measurements summary ───
  const measureRows: MeasureRow[] = [];

  if (bwEntries.length > 0) {
    const latest = bwEntries[0].weightKg;
    const prev = bwEntries.length >= 2 ? bwEntries[1].weightKg : null;
    const d = prev != null ? latest - prev : null;
    measureRows.push({
      label: "Poids",
      value: `${latest.toFixed(1)} kg`,
      delta: d != null ? `${d > 0 ? "+" : ""}${d.toFixed(1)}` : undefined,
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
    if (!latestByType.has(entry.type)) latestByType.set(entry.type, entry.value);
  }
  for (const config of typeConfigs) {
    const v = latestByType.get(config.slug);
    measureRows.push({
      label: config.label,
      value: v != null ? `${v.toFixed(1)} ${config.unit}` : "—",
    });
  }

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
          {activeProgram && <ProgramHubCard activeProgram={activeProgram} />}
          <ActivityHubCard stats={stats} />
          <WellnessHubCard wellnessLogs={wellnessLogs} />
          <RecordsHubCard prs={prs} />
          <MesuresHubCard rows={measureRows} />
          {mentorAdvice && <MentorAdviceCard advice={mentorAdvice} />}
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
          <div className="mt-2 space-y-4">
            <ProfileForm
              profile={profile}
              showEnduranceRefs={showEnduranceRefs}
              sportProfile={{
                primarySport: sportProfile.primarySport,
                sportLevel: sportProfile.sportLevel,
                sportObjective: sportProfile.sportObjective,
                weeklySessionTarget: sportProfile.weeklySessionTarget,
                sessionDurationMins: sportProfile.sessionDurationMins,
                equipmentAccess: sportProfile.equipmentAccess,
                medicalNotes: sportProfile.medicalNotes,
              }}
            />
            <EnduranceRefsCard heartZones={heartZones} paceZones={paceZones} />
          </div>
        </details>
      </div>
    </main>
  );
}
