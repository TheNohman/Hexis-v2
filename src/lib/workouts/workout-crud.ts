import { prisma } from "@/lib/prisma";
import { assertOwnership, assertWorkoutOwnership } from "@/lib/ownership";

/**
 * Create an empty workout for the given user.
 * Blocks and entries are added incrementally via other mutations.
 */
export async function createWorkout(
  userId: string,
  data: { name?: string } = {},
) {
  const now = new Date();
  const defaultName = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return prisma.workout.create({
    data: {
      userId,
      name: data.name?.trim() || `Séance du ${defaultName}`,
      startedAt: now,
    },
  });
}

export async function finishWorkout(workoutId: string, userId: string) {
  await assertWorkoutOwnership(workoutId, userId);
  return prisma.workout.update({
    where: { id: workoutId },
    data: { finishedAt: new Date() },
  });
}

/**
 * Finish all active (unfinished) workouts for the given user.
 * Called automatically when a new workout is started so there is
 * at most one active workout at a time.
 */
export async function finishActiveWorkouts(userId: string) {
  return prisma.workout.updateMany({
    where: { userId, finishedAt: null },
    data: { finishedAt: new Date() },
  });
}

export async function updateWorkoutName(
  workoutId: string,
  userId: string,
  name: string,
) {
  await assertWorkoutOwnership(workoutId, userId);
  return prisma.workout.update({
    where: { id: workoutId },
    data: { name: name.trim() },
  });
}

/**
 * Move a workout's startedAt (and optionally finishedAt) to a different
 * date. Used for retroactive logging: "I did this Tuesday, logging today."
 * If the workout is already finished, we shift finishedAt by the same delta
 * so duration is preserved.
 */
export async function updateWorkoutStartedAt(
  workoutId: string,
  userId: string,
  newStartedAt: Date,
) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { userId: true, startedAt: true, finishedAt: true },
  });
  if (!workout) throw new Error("Not found");
  if (workout.userId !== userId) throw new Error("Forbidden");

  const delta = newStartedAt.getTime() - workout.startedAt.getTime();
  const newFinishedAt =
    workout.finishedAt != null
      ? new Date(workout.finishedAt.getTime() + delta)
      : null;

  return prisma.workout.update({
    where: { id: workoutId },
    data: {
      startedAt: newStartedAt,
      ...(newFinishedAt !== null && { finishedAt: newFinishedAt }),
    },
  });
}

export async function updateWorkoutNotes(
  workoutId: string,
  userId: string,
  notes: string | null,
) {
  await assertWorkoutOwnership(workoutId, userId);
  return prisma.workout.update({
    where: { id: workoutId },
    data: { notes },
  });
}

/**
 * Mark all PLANNED entries of a workout as DONE, carrying the planned
 * values (plannedNumeric / plannedText) over to the actual values if
 * the user hasn't already entered something. Used to "log a session that
 * went as planned" in one click — typical for retro entry.
 *
 * Does NOT touch entries that are already DONE or SKIPPED, and does NOT
 * mark the workout as finished (the user still controls that with the
 * Terminer button).
 */
export async function bulkValidatePlannedEntries(
  workoutId: string,
  userId: string,
) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      blocks: {
        include: {
          entries: {
            where: { status: "PLANNED" },
            include: { values: true },
          },
        },
      },
    },
  });
  assertOwnership(workout, userId);

  const now = new Date();
  let validatedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const block of workout.blocks) {
      for (const entry of block.entries) {
        for (const v of entry.values) {
          const alreadyFilled =
            v.valueNumeric !== null || v.valueText !== null;
          if (alreadyFilled) continue;
          if (v.plannedNumeric !== null || v.plannedText !== null) {
            await tx.entryKpiValue.update({
              where: { id: v.id },
              data: {
                valueNumeric: v.plannedNumeric,
                valueText: v.plannedText,
              },
            });
          }
        }
        await tx.workoutEntry.update({
          where: { id: entry.id },
          data: { status: "DONE", completedAt: now },
        });
        validatedCount += 1;
      }
    }
  });

  return { validatedCount };
}

/**
 * Clone an existing (past) workout as a fresh PLANNED workout.
 * Used from the history to "redo this session" in one click. Preserves
 * block structure, exercises, and per-entry KPI targets (the old actual
 * values become the new planned values — implementing progressive overload
 * baseline). Optional weight bump applied across all STRENGTH entries.
 */
export async function cloneWorkoutAsPlanned(
  workoutId: string,
  userId: string,
  options: { weightDeltaKg?: number } = {},
) {
  const source = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      blocks: {
        orderBy: { displayOrder: "asc" },
        include: {
          entries: {
            orderBy: { displayOrder: "asc" },
            include: {
              exercise: true,
              values: { include: { kpiDefinition: true } },
            },
          },
        },
      },
    },
  });
  assertOwnership(source, userId);

  // Finish any in-progress workout first (same invariant as creating new).
  await finishActiveWorkouts(userId);

  const bump = options.weightDeltaKg ?? 0;

  return prisma.workout.create({
    data: {
      userId,
      name: source.name,
      startedAt: new Date(),
      blocks: {
        create: source.blocks.map((b) => ({
          name: b.name,
          displayOrder: b.displayOrder,
          entries: {
            create: b.entries.map((e) => ({
              exerciseId: e.exerciseId,
              displayOrder: e.displayOrder,
              status: "PLANNED" as const,
              restDurationSecs: e.restDurationSecs,
              isWarmup: e.isWarmup,
              values: {
                create: e.values.map((v) => {
                  const isWeightKpi = v.kpiDefinition.slug === "weight_kg";
                  const isStrength = e.exercise.type === "STRENGTH";
                  const base = v.valueNumeric ?? v.plannedNumeric;
                  const nextPlannedNumeric =
                    isWeightKpi && isStrength && base != null
                      ? base + bump
                      : base;
                  return {
                    kpiDefinitionId: v.kpiDefinitionId,
                    plannedNumeric: nextPlannedNumeric,
                    plannedText: v.valueText ?? v.plannedText,
                  };
                }),
              },
            })),
          },
        })),
      },
    },
  });
}
