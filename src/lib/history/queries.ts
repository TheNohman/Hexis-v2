import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// --------------- Types ---------------

export type HistoryFilter = {
  search?: string;
  exerciseId?: string;
  templateId?: string;
  from?: Date;
  to?: Date;
};

export type HistoryItem = {
  id: string;
  name: string;
  startedAt: Date;
  finishedAt: Date | null;
  durationMins: number | null;
  blockCount: number;
  entryCount: number;
  totalVolume: number;
  exerciseNames: string[];
  templateName: string | null;
};

// --------------- Query ---------------

export async function listWorkoutHistory(
  userId: string,
  filters?: HistoryFilter,
  page = 1,
  pageSize = 20,
): Promise<{ items: HistoryItem[]; total: number }> {
  const where: Prisma.WorkoutWhereInput = { userId };

  // Search filter: workout name (case insensitive)
  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  // Exercise filter: workout has at least one entry with this exercise
  if (filters?.exerciseId) {
    where.blocks = {
      some: {
        entries: { some: { exerciseId: filters.exerciseId } },
      },
    };
  }

  // Template filter
  if (filters?.templateId) {
    where.templateId = filters.templateId;
  }

  // Date range filter
  if (filters?.from || filters?.to) {
    where.startedAt = {};
    if (filters?.from) where.startedAt.gte = filters.from;
    if (filters?.to) where.startedAt.lte = filters.to;
  }

  const skip = (page - 1) * pageSize;

  const [total, workouts] = await Promise.all([
    prisma.workout.count({ where }),
    prisma.workout.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        template: { select: { name: true } },
        blocks: {
          include: {
            entries: {
              include: {
                exercise: { select: { name: true } },
                values: {
                  include: {
                    kpiDefinition: { select: { slug: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const items: HistoryItem[] = workouts.map((w) => {
    // Duration
    let durationMins: number | null = null;
    if (w.finishedAt && w.startedAt) {
      durationMins =
        Math.round(
          ((w.finishedAt.getTime() - w.startedAt.getTime()) / 60000) * 10,
        ) / 10;
    }

    // Count blocks and entries
    const blockCount = w.blocks.length;
    let entryCount = 0;
    let totalVolume = 0;
    const exerciseNameSet = new Set<string>();

    for (const block of w.blocks) {
      entryCount += block.entries.length;
      for (const entry of block.entries) {
        exerciseNameSet.add(entry.exercise.name);

        if (entry.status === "DONE") {
          // Compute volume: weight_kg * reps
          let weight: number | null = null;
          let reps: number | null = null;
          for (const v of entry.values) {
            if (v.kpiDefinition.slug === "weight_kg" && v.valueNumeric != null) {
              weight = v.valueNumeric;
            }
            if (v.kpiDefinition.slug === "reps" && v.valueNumeric != null) {
              reps = v.valueNumeric;
            }
          }
          if (weight != null && reps != null) {
            totalVolume += weight * reps;
          }
        }
      }
    }

    return {
      id: w.id,
      name: w.name,
      startedAt: w.startedAt,
      finishedAt: w.finishedAt,
      durationMins,
      blockCount,
      entryCount,
      totalVolume,
      exerciseNames: Array.from(exerciseNameSet),
      templateName: w.template?.name ?? null,
    };
  });

  return { items, total };
}
