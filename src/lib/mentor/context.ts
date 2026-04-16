import { prisma } from "@/lib/prisma";
import { getWorkoutStats } from "@/lib/stats/queries";
import { getRecentWellnessLogs } from "@/lib/wellness/queries";
import { listBodyWeightEntries } from "@/lib/bodyweight/queries";
import { getActiveWorkout } from "@/lib/workouts/queries";
import { listPersonalBests } from "@/lib/prs/detect";

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
          primarySport: true,
          sportLevel: true,
          sportObjective: true,
          weeklySessionTarget: true,
          sessionDurationMins: true,
          equipmentAccess: true,
          medicalNotes: true,
          fcMax: true,
          fcResting: true,
          vmaKmh: true,
          ftp: true,
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
      prisma.workout.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 10,
        include: {
          blocks: {
            orderBy: { displayOrder: "asc" },
            include: {
              entries: {
                orderBy: { displayOrder: "asc" },
                include: {
                  exercise: { select: { name: true, type: true } },
                  values: {
                    include: {
                      kpiDefinition: { select: { name: true, slug: true } },
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
      primarySport: user?.primarySport ?? null,
      sportLevel: user?.sportLevel ?? null,
      sportObjective: user?.sportObjective ?? null,
      weeklySessionTarget: user?.weeklySessionTarget ?? null,
      sessionDurationMins: user?.sessionDurationMins ?? null,
      equipmentAccess: user?.equipmentAccess ?? [],
      medicalNotes: user?.medicalNotes ?? null,
      fcMax: user?.fcMax ?? null,
      fcResting: user?.fcResting ?? null,
      vmaKmh: user?.vmaKmh ?? null,
      ftp: user?.ftp ?? null,
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
      let durationMins: number | null = null;
      if (w.finishedAt && w.startedAt) {
        durationMins = Math.round(((w.finishedAt.getTime() - w.startedAt.getTime()) / 60000) * 10) / 10;
      }

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
            notes: entry.notes,
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
      notes: l.notes,
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
