import { prisma } from "@/lib/prisma";
import { getWorkoutStats } from "@/lib/stats/queries";
import { getRecentWellnessLogs } from "@/lib/wellness/queries";
import { listBodyWeightEntries } from "@/lib/bodyweight/queries";
import { getActiveWorkout } from "@/lib/workouts/queries";
import { listPersonalBests } from "@/lib/prs/detect";
import { sanitiseForPrompt } from "@/lib/mentor/sanitize";
import { computeDurationMins } from "@/lib/format";

export type MentorContext = {
  user: {
    name: string | null;
    bodyWeightKg: number | null;
    unitSystem: string;
    primarySport: string | null;
    sportLevel: string | null;
    sportObjective: string | null;
    weeklySessionTarget: number | null;
    sessionDurationMins: number | null;
    equipmentAccess: string[];
    medicalNotes: string | null;
    /** Endurance reference values (null if user never set them). */
    fcMax: number | null;
    fcResting: number | null;
    vmaKmh: number | null;
    ftp: number | null;
  };
  stats: {
    totalWorkouts: number;
    totalFinished: number;
    totalSetsDone: number;
    avgDurationMins: number | null;
    totalVolume: number;
    weeklyActivity: { weekStart: string; count: number }[];
    weeklyVolume: { weekStart: string; volume: number }[];
  };
  recentWorkouts: {
    name: string;
    date: string;
    durationMins: number | null;
    exercises: {
      name: string;
      type: string;
      sets: {
        status: string;
        isWarmup: boolean;
        notes: string | null;
        values: { kpiName: string; slug: string; value: number | null; planned: number | null }[];
      }[];
    }[];
  }[];
  currentProgram: {
    name: string;
    cycleCount: number;
    cycleDays: number;
    currentSlotId: string | null;
    slots: { cycle: number; day: number; label: string | null; templateName: string | null }[];
  } | null;
  wellness: {
    date: string;
    mood: number;
    sleep: number;
    energy: number;
    stress: number;
    notes: string | null;
  }[];
  wellnessTrends: {
    avgSleepLast3Days: number | null;
    avgStressLast3Days: number | null;
    avgEnergyLast3Days: number | null;
    poorSleepNightsLast7: number;
    highStressDaysLast7: number;
  };
  bodyWeight: { date: string; weightKg: number }[];
  activeWorkout: {
    name: string;
    startedAt: string;
    completedEntries: number;
    totalEntries: number;
  } | null;
  personalBests: {
    exerciseName: string;
    weightKg: number;
    reps: number;
    estimated1RM: number;
    achievedAt: string;
  }[];
  strengthTrends: {
    /** Count of STRENGTH sets done in the last 7 days with RPE >= 9. */
    highRpeSetsLast7: number;
    /** Average RPE on STRENGTH sets in the last 7 days (null if none). */
    avgRpeLast7: number | null;
  };
};

export async function buildMentorContext(userId: string): Promise<MentorContext> {
  // Fetch all data in parallel
  const [
    user,
    stats,
    wellnessLogs,
    bodyWeightEntries,
    activeProgram,
    recentWorkouts,
    activeWorkout,
    personalBests,
  ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          unitSystem: true,
          sportProfile: {
            select: {
              primarySport: true,
              sportLevel: true,
              sportObjective: true,
              weeklySessionTarget: true,
              sessionDurationMins: true,
              equipmentAccess: true,
              medicalNotes: true,
            },
          },
          enduranceRefs: {
            select: {
              fcMax: true,
              fcResting: true,
              vmaKmh: true,
              ftp: true,
            },
          },
        },
      }),
      getWorkoutStats(userId),
      getRecentWellnessLogs(userId, 14),
      listBodyWeightEntries(userId),
      prisma.program.findFirst({
        where: { userId, isActive: true },
        include: {
          slots: {
            orderBy: [{ cycle: "asc" }, { day: "asc" }],
            include: { template: { select: { name: true } } },
          },
        },
      }),
      // Slim projection: only the fields used downstream (status,
      // isWarmup, notes + per-value numerics and kpi slug/name). Earlier
      // revisions eagerly pulled the full row tree which produced ~500
      // rows across 10 workouts with all KPI metadata.
      prisma.workout.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        // 5 sessions is enough context for a 2-sentence advice and
        // halves the row footprint vs. the previous take: 10.
        take: 5,
        select: {
          name: true,
          startedAt: true,
          finishedAt: true,
          blocks: {
            orderBy: { displayOrder: "asc" },
            select: {
              id: true,
              name: true,
              entries: {
                orderBy: { displayOrder: "asc" },
                select: {
                  status: true,
                  isWarmup: true,
                  notes: true,
                  exercise: { select: { name: true, type: true } },
                  values: {
                    select: {
                      valueNumeric: true,
                      plannedNumeric: true,
                      kpiDefinition: { select: { slug: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      getActiveWorkout(userId),
      listPersonalBests(userId, 5),
    ]);

  // Destructure the new element added to Promise.all above. TypeScript
  // will keep us honest if the order drifts.

  // Compute strength trends from recent workouts (last 7 days). Mentor
  // uses this to suggest a deload if RPE stays at 9+ across multiple sets.
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let highRpeSetsLast7 = 0;
  const rpeValues: number[] = [];
  for (const w of recentWorkouts) {
    if (w.startedAt.getTime() < sevenDaysAgo) continue;
    for (const block of w.blocks) {
      for (const entry of block.entries) {
        if (entry.status !== "DONE" || entry.exercise.type !== "STRENGTH") continue;
        if (entry.isWarmup) continue;
        const rpe = entry.values.find((v) => v.kpiDefinition.slug === "rpe")?.valueNumeric;
        if (rpe == null) continue;
        rpeValues.push(rpe);
        if (rpe >= 9) highRpeSetsLast7 += 1;
      }
    }
  }
  const avgRpeLast7 =
    rpeValues.length > 0
      ? Math.round((rpeValues.reduce((s, n) => s + n, 0) / rpeValues.length) * 10) / 10
      : null;

  // Compute wellness trends up-front so the prompt doesn't need to
  // re-average the raw array.
  const last3 = wellnessLogs.slice(0, 3);
  const last7 = wellnessLogs.slice(0, 7);
  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null;
  const wellnessTrends = {
    avgSleepLast3Days: avg(last3.map((l) => l.sleep)),
    avgStressLast3Days: avg(last3.map((l) => l.stress)),
    avgEnergyLast3Days: avg(last3.map((l) => l.energy)),
    poorSleepNightsLast7: last7.filter((l) => l.sleep <= 2).length,
    highStressDaysLast7: last7.filter((l) => l.stress <= 2).length, // stress: 1=très stressé, 5=très détendu
  };

  return {
    user: {
      name: user?.name ?? null,
      bodyWeightKg: bodyWeightEntries.length > 0 ? bodyWeightEntries[0].weightKg : null,
      unitSystem: user?.unitSystem ?? "metric",
      primarySport: user?.sportProfile?.primarySport ?? null,
      sportLevel: user?.sportProfile?.sportLevel ?? null,
      sportObjective: user?.sportProfile?.sportObjective ?? null,
      weeklySessionTarget: user?.sportProfile?.weeklySessionTarget ?? null,
      sessionDurationMins: user?.sportProfile?.sessionDurationMins ?? null,
      equipmentAccess: user?.sportProfile?.equipmentAccess ?? [],
      medicalNotes: user?.sportProfile?.medicalNotes ?? null,
      fcMax: user?.enduranceRefs?.fcMax ?? null,
      fcResting: user?.enduranceRefs?.fcResting ?? null,
      vmaKmh: user?.enduranceRefs?.vmaKmh ?? null,
      ftp: user?.enduranceRefs?.ftp ?? null,
    },
    stats: {
      totalWorkouts: stats.totalWorkouts,
      totalFinished: stats.totalFinished,
      totalSetsDone: stats.totalSetsDone,
      avgDurationMins: stats.avgDurationMins,
      totalVolume: stats.totalVolume,
      weeklyActivity: stats.weeklyActivity,
      weeklyVolume: stats.weeklyVolume,
    },
    recentWorkouts: recentWorkouts.map((w) => {
      const durationMins = computeDurationMins(w.startedAt, w.finishedAt);

      // Group entries by exercise
      const exerciseMap = new Map<string, {
        name: string;
        type: string;
        sets: {
          status: string;
          isWarmup: boolean;
          notes: string | null;
          values: { kpiName: string; slug: string; value: number | null; planned: number | null }[];
        }[];
      }>();

      for (const block of w.blocks) {
        for (const entry of block.entries) {
          const key = entry.exercise.name;
          if (!exerciseMap.has(key)) {
            exerciseMap.set(key, { name: entry.exercise.name, type: entry.exercise.type, sets: [] });
          }
          exerciseMap.get(key)!.sets.push({
            status: entry.status,
            isWarmup: entry.isWarmup,
            notes: sanitiseForPrompt(entry.notes),
            values: entry.values.map((v) => ({
              kpiName: v.kpiDefinition.name,
              slug: v.kpiDefinition.slug,
              value: v.valueNumeric,
              planned: v.plannedNumeric,
            })),
          });
        }
      }

      return {
        name: w.name,
        date: w.startedAt.toISOString().slice(0, 10),
        durationMins,
        exercises: Array.from(exerciseMap.values()),
      };
    }),
    currentProgram: activeProgram
      ? {
          name: activeProgram.name,
          cycleCount: activeProgram.cycleCount,
          cycleDays: activeProgram.cycleDays,
          currentSlotId: activeProgram.currentSlotId,
          slots: activeProgram.slots.map((s) => ({
            cycle: s.cycle,
            day: s.day,
            label: s.label,
            templateName: s.template?.name ?? null,
          })),
        }
      : null,
    wellness: wellnessLogs.map((l) => ({
      date: l.date instanceof Date ? l.date.toISOString().slice(0, 10) : String(l.date),
      mood: l.mood,
      sleep: l.sleep,
      energy: l.energy,
      stress: l.stress,
      notes: sanitiseForPrompt(l.notes),
    })),
    bodyWeight: bodyWeightEntries.map((e) => ({
      date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date),
      weightKg: e.weightKg,
    })),
    wellnessTrends,
    activeWorkout: activeWorkout
      ? {
          name: activeWorkout.name,
          startedAt: activeWorkout.startedAt.toISOString(),
          completedEntries: activeWorkout.completedEntries,
          totalEntries: activeWorkout.totalEntries,
        }
      : null,
    personalBests: personalBests.map((pb) => ({
      exerciseName: pb.exerciseName,
      weightKg: pb.weightKg,
      reps: pb.reps,
      estimated1RM: pb.estimated1RM,
      achievedAt:
        pb.achievedAt instanceof Date
          ? pb.achievedAt.toISOString()
          : String(pb.achievedAt),
    })),
    strengthTrends: {
      highRpeSetsLast7,
      avgRpeLast7,
    },
  };
}
