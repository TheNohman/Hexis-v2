import { prisma } from "@/lib/prisma";
import type { KpiValueInput } from "./types";

function assertOwnership<T extends { userId: string }>(
  entity: T | null,
  userId: string,
): asserts entity is T {
  if (!entity) throw new Error("Not found");
  if (entity.userId !== userId) throw new Error("Forbidden");
}

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
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
  });
  assertOwnership(workout, userId);

  return prisma.workout.update({
    where: { id: workoutId },
    data: { finishedAt: new Date() },
  });
}

export async function updateWorkoutName(
  workoutId: string,
  userId: string,
  name: string,
) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
  });
  assertOwnership(workout, userId);

  return prisma.workout.update({
    where: { id: workoutId },
    data: { name: name.trim() },
  });
}

export async function addBlock(
  workoutId: string,
  userId: string,
  name: string,
) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { blocks: { select: { displayOrder: true } } },
  });
  assertOwnership(workout, userId);

  const nextOrder =
    workout.blocks.length === 0
      ? 0
      : Math.max(...workout.blocks.map((b) => b.displayOrder)) + 1;

  return prisma.workoutBlock.create({
    data: {
      workoutId,
      name: name.trim() || "Bloc sans nom",
      displayOrder: nextOrder,
    },
  });
}

export async function renameBlock(
  blockId: string,
  userId: string,
  name: string,
) {
  const block = await prisma.workoutBlock.findUnique({
    where: { id: blockId },
    include: { workout: { select: { userId: true } } },
  });
  if (!block) throw new Error("Not found");
  if (block.workout.userId !== userId) throw new Error("Forbidden");

  return prisma.workoutBlock.update({
    where: { id: blockId },
    data: { name: name.trim() || "Bloc sans nom" },
  });
}

export async function deleteBlock(blockId: string, userId: string) {
  const block = await prisma.workoutBlock.findUnique({
    where: { id: blockId },
    include: { workout: { select: { userId: true } } },
  });
  if (!block) throw new Error("Not found");
  if (block.workout.userId !== userId) throw new Error("Forbidden");

  return prisma.workoutBlock.delete({ where: { id: blockId } });
}

/**
 * Add an entry (exercise instance with KPI values) to a block.
 * A single entry is one "line" in the session — a single strength set,
 * a single cardio interval, or a rest.
 */
export async function addEntry(
  blockId: string,
  userId: string,
  data: { exerciseId: string; values: KpiValueInput[] },
) {
  const block = await prisma.workoutBlock.findUnique({
    where: { id: blockId },
    include: {
      workout: { select: { userId: true } },
      entries: { select: { displayOrder: true } },
    },
  });
  if (!block) throw new Error("Not found");
  if (block.workout.userId !== userId) throw new Error("Forbidden");

  // Verify the user has access to this exercise (system OR their own)
  const exercise = await prisma.exercise.findUnique({
    where: { id: data.exerciseId },
  });
  if (!exercise) throw new Error("Exercise not found");
  if (!exercise.isSystem && exercise.userId !== userId) {
    throw new Error("Forbidden exercise");
  }

  const nextOrder =
    block.entries.length === 0
      ? 0
      : Math.max(...block.entries.map((e) => e.displayOrder)) + 1;

  return prisma.workoutEntry.create({
    data: {
      blockId,
      exerciseId: data.exerciseId,
      displayOrder: nextOrder,
      values: {
        create: data.values.map((v) => ({
          kpiDefinitionId: v.kpiDefinitionId,
          valueNumeric: v.valueNumeric ?? null,
          valueText: v.valueText ?? null,
        })),
      },
    },
    include: { values: true },
  });
}

/**
 * Duplicate an existing entry at the end of its block, keeping its values.
 */
export async function duplicateEntry(entryId: string, userId: string) {
  const entry = await prisma.workoutEntry.findUnique({
    where: { id: entryId },
    include: {
      block: {
        include: {
          workout: { select: { userId: true } },
          entries: { select: { displayOrder: true } },
        },
      },
      values: true,
    },
  });
  if (!entry) throw new Error("Not found");
  if (entry.block.workout.userId !== userId) throw new Error("Forbidden");

  const nextOrder =
    Math.max(...entry.block.entries.map((e) => e.displayOrder)) + 1;

  return prisma.workoutEntry.create({
    data: {
      blockId: entry.blockId,
      exerciseId: entry.exerciseId,
      displayOrder: nextOrder,
      values: {
        create: entry.values.map((v) => ({
          kpiDefinitionId: v.kpiDefinitionId,
          valueNumeric: v.valueNumeric,
          valueText: v.valueText,
        })),
      },
    },
    include: { values: true },
  });
}

export async function deleteEntry(entryId: string, userId: string) {
  const entry = await prisma.workoutEntry.findUnique({
    where: { id: entryId },
    include: { block: { include: { workout: { select: { userId: true } } } } },
  });
  if (!entry) throw new Error("Not found");
  if (entry.block.workout.userId !== userId) throw new Error("Forbidden");

  return prisma.workoutEntry.delete({ where: { id: entryId } });
}
