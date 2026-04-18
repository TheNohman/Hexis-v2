import { prisma } from "@/lib/prisma";
import { computeDurationMins } from "@/lib/format";
import type {
  ExerciseListItem,
  WorkoutDetail,
  WorkoutListItem,
} from "./types";

/**
 * Returns all exercises visible to the given user:
 * system catalog + the user's own custom exercises.
 */
export async function listExercisesForUser(
  userId: string,
): Promise<ExerciseListItem[]> {
  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [{ isSystem: true }, { userId }],
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      exerciseKpis: {
        orderBy: { displayOrder: "asc" },
        include: { kpiDefinition: true },
      },
    },
  });

  return exercises.map((ex) => ({
    id: ex.id,
    slug: ex.slug,
    name: ex.name,
    type: ex.type,
    isSystem: ex.isSystem,
    description: ex.description,
    kpis: ex.exerciseKpis.map((ek) => ({
      id: ek.id,
      kpiDefinitionId: ek.kpiDefinitionId,
      slug: ek.kpiDefinition.slug,
      name: ek.kpiDefinition.name,
      unit: ek.kpiDefinition.unit,
      dataType: ek.kpiDefinition.dataType,
      isRequired: ek.isRequired,
      displayOrder: ek.displayOrder,
    })),
  }));
}

/**
 * Returns workouts for the given user, ordered by startedAt desc.
 * Pass `limit` to cap the result (used by the dashboard's "recent"
 * panel); omit to fetch all (used by the full history view).
 */
export async function listWorkouts(
  userId: string,
  options: { limit?: number } = {},
): Promise<WorkoutListItem[]> {
  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    ...(options.limit ? { take: options.limit } : {}),
    include: {
      blocks: {
        include: { _count: { select: { entries: true } } },
      },
    },
  });

  return workouts.map((w) => {
    const durationMins = computeDurationMins(w.startedAt, w.finishedAt);
    return {
      id: w.id,
      name: w.name,
      startedAt: w.startedAt,
      finishedAt: w.finishedAt,
      durationMins,
      blockCount: w.blocks.length,
      entryCount: w.blocks.reduce((sum, b) => sum + b._count.entries, 0),
    };
  });
}

/**
 * Returns the currently active workout (not finished) if any.
 * Used by the persistent in-progress banner.
 */
export async function getActiveWorkout(userId: string): Promise<{
  id: string;
  name: string;
  startedAt: Date;
  completedEntries: number;
  totalEntries: number;
} | null> {
  const workout = await prisma.workout.findFirst({
    where: { userId, finishedAt: null },
    orderBy: { startedAt: "desc" },
    include: {
      blocks: {
        include: {
          entries: {
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  if (!workout) return null;

  const allEntries = workout.blocks.flatMap((b) => b.entries);
  const completed = allEntries.filter((e) => e.status === "DONE").length;

  return {
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt,
    completedEntries: completed,
    totalEntries: allEntries.length,
  };
}

/**
 * Returns a full workout with its blocks and entries, for either the
 * capture screen or the read-only view.
 */
export async function getWorkoutById(
  workoutId: string,
  userId: string,
): Promise<WorkoutDetail | null> {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: {
      blocks: {
        orderBy: { displayOrder: "asc" },
        include: {
          intervalConfig: true,
          entries: {
            orderBy: { displayOrder: "asc" },
            include: {
              exercise: true,
              values: {
                include: { kpiDefinition: true },
              },
            },
          },
        },
      },
    },
  });

  if (!workout) return null;

  return {
    id: workout.id,
    userId: workout.userId,
    name: workout.name,
    startedAt: workout.startedAt,
    finishedAt: workout.finishedAt,
    notes: workout.notes,
    templateId: workout.templateId,
    blocks: workout.blocks.map((b) => ({
      id: b.id,
      name: b.name,
      displayOrder: b.displayOrder,
      mode: b.mode,
      // Flatten the 1:1 IntervalConfig back into the block DTO so UI
      // consumers keep reading `block.workSecs` etc. as before.
      intervalFormat: b.intervalConfig?.intervalFormat ?? null,
      workSecs: b.intervalConfig?.workSecs ?? null,
      restSecs: b.intervalConfig?.restSecs ?? null,
      roundCount: b.intervalConfig?.roundCount ?? null,
      playbackOrder: b.intervalConfig?.playbackOrder ?? null,
      countdownLeadSecs: b.intervalConfig?.countdownLeadSecs ?? 10,
      customSequence: b.intervalConfig?.customSequence ?? [],
      completedRounds: b.completedRounds,
      entries: b.entries.map((e) => ({
        id: e.id,
        displayOrder: e.displayOrder,
        status: e.status,
        completedAt: e.completedAt,
        restDurationSecs: e.restDurationSecs,
        notes: e.notes,
        isWarmup: e.isWarmup,
        exercise: {
          id: e.exercise.id,
          slug: e.exercise.slug,
          name: e.exercise.name,
          type: e.exercise.type,
        },
        values: e.values.map((v) => ({
          kpiDefinitionId: v.kpiDefinitionId,
          kpiSlug: v.kpiDefinition.slug,
          kpiName: v.kpiDefinition.name,
          unit: v.kpiDefinition.unit,
          dataType: v.kpiDefinition.dataType,
          valueNumeric: v.valueNumeric,
          valueText: v.valueText,
          plannedNumeric: v.plannedNumeric,
          plannedText: v.plannedText,
        })),
      })),
    })),
  };
}
