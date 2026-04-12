import { prisma } from "@/lib/prisma";
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
 * Returns the most recent workouts for the dashboard.
 */
export async function listRecentWorkouts(
  userId: string,
  limit = 10,
): Promise<WorkoutListItem[]> {
  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      blocks: {
        include: { _count: { select: { entries: true } } },
      },
    },
  });

  return workouts.map((w) => {
    let durationMins: number | null = null;
    if (w.finishedAt && w.startedAt) {
      durationMins =
        Math.round(
          ((w.finishedAt.getTime() - w.startedAt.getTime()) / 60000) * 10,
        ) / 10;
    }
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
 * Returns all workouts for the user, optionally limited.
 */
export async function listAllWorkouts(
  userId: string,
  limit?: number,
): Promise<WorkoutListItem[]> {
  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    ...(limit ? { take: limit } : {}),
    include: {
      blocks: {
        include: { _count: { select: { entries: true } } },
      },
    },
  });

  return workouts.map((w) => {
    let durationMins: number | null = null;
    if (w.finishedAt && w.startedAt) {
      durationMins =
        Math.round(
          ((w.finishedAt.getTime() - w.startedAt.getTime()) / 60000) * 10,
        ) / 10;
    }
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
