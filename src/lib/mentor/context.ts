import { prisma } from "@/lib/prisma";
import { getWorkoutStats } from "@/lib/stats/queries";
import { getRecentWellnessLogs } from "@/lib/wellness/queries";
import { listBodyWeightEntries } from "@/lib/bodyweight/queries";

export type MentorContext = {
  user: {
    name: string | null;
    bodyWeightKg: number | null;
    unitSystem: string;
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
  bodyWeight: { date: string; weightKg: number }[];
};

export async function buildMentorContext(userId: string): Promise<MentorContext> {
  // Fetch all data in parallel
  const [user, stats, wellnessLogs, bodyWeightEntries, activeProgram, recentWorkouts] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, unitSystem: true },
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
    ]);

  return {
    user: {
      name: user?.name ?? null,
      bodyWeightKg: bodyWeightEntries.length > 0 ? bodyWeightEntries[0].weightKg : null,
      unitSystem: user?.unitSystem ?? "metric",
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
  };
}
