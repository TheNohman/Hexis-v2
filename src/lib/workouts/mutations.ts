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

export async function reorderBlocks(
  workoutId: string,
  userId: string,
  orderedBlockIds: string[],
) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { blocks: { select: { id: true } } },
  });
  assertOwnership(workout, userId);

  const actualIds = new Set(workout.blocks.map((b) => b.id));
  if (
    orderedBlockIds.length !== actualIds.size ||
    !orderedBlockIds.every((id) => actualIds.has(id))
  ) {
    throw new Error("Block ID mismatch");
  }

  await prisma.$transaction(
    orderedBlockIds.map((id, index) =>
      prisma.workoutBlock.update({
        where: { id },
        data: { displayOrder: index },
      }),
    ),
  );
}

export async function reorderEntries(
  blockId: string,
  userId: string,
  orderedEntryIds: string[],
) {
  const block = await prisma.workoutBlock.findUnique({
    where: { id: blockId },
    include: {
      workout: { select: { userId: true } },
      entries: { select: { id: true } },
    },
  });
  if (!block) throw new Error("Not found");
  if (block.workout.userId !== userId) throw new Error("Forbidden");

  const actualIds = new Set(block.entries.map((e) => e.id));
  if (
    orderedEntryIds.length !== actualIds.size ||
    !orderedEntryIds.every((id) => actualIds.has(id))
  ) {
    throw new Error("Entry ID mismatch");
  }

  await prisma.$transaction(
    orderedEntryIds.map((id, index) =>
      prisma.workoutEntry.update({
        where: { id },
        data: { displayOrder: index },
      }),
    ),
  );
}

export async function validateEntry(
  entryId: string,
  userId: string,
  values?: KpiValueInput[],
) {
  const entry = await prisma.workoutEntry.findUnique({
    where: { id: entryId },
    include: {
      block: { include: { workout: { select: { userId: true } } } },
      values: true,
    },
  });
  if (!entry) throw new Error("Not found");
  if (entry.block.workout.userId !== userId) throw new Error("Forbidden");

  // Update KPI values if provided (user adjusted them)
  if (values && values.length > 0) {
    await prisma.$transaction(
      values.map((v) =>
        prisma.entryKpiValue.upsert({
          where: {
            entryId_kpiDefinitionId: {
              entryId,
              kpiDefinitionId: v.kpiDefinitionId,
            },
          },
          update: {
            valueNumeric: v.valueNumeric ?? null,
            valueText: v.valueText ?? null,
          },
          create: {
            entryId,
            kpiDefinitionId: v.kpiDefinitionId,
            valueNumeric: v.valueNumeric ?? null,
            valueText: v.valueText ?? null,
          },
        }),
      ),
    );
  }

  return prisma.workoutEntry.update({
    where: { id: entryId },
    data: { status: "DONE", completedAt: new Date() },
  });
}

export async function skipEntry(entryId: string, userId: string) {
  const entry = await prisma.workoutEntry.findUnique({
    where: { id: entryId },
    include: {
      block: { include: { workout: { select: { userId: true } } } },
    },
  });
  if (!entry) throw new Error("Not found");
  if (entry.block.workout.userId !== userId) throw new Error("Forbidden");

  return prisma.workoutEntry.update({
    where: { id: entryId },
    data: { status: "SKIPPED", completedAt: new Date() },
  });
}

/**
 * Update KPI values of an entry without changing its status.
 * Used for inline editing of values in the unified session view.
 */
export async function updateEntryValues(
  entryId: string,
  userId: string,
  values: KpiValueInput[],
) {
  const entry = await prisma.workoutEntry.findUnique({
    where: { id: entryId },
    include: {
      block: { include: { workout: { select: { userId: true } } } },
    },
  });
  if (!entry) throw new Error("Not found");
  if (entry.block.workout.userId !== userId) throw new Error("Forbidden");

  if (values.length > 0) {
    await prisma.$transaction(
      values.map((v) =>
        prisma.entryKpiValue.upsert({
          where: {
            entryId_kpiDefinitionId: {
              entryId,
              kpiDefinitionId: v.kpiDefinitionId,
            },
          },
          update: {
            valueNumeric: v.valueNumeric ?? null,
            valueText: v.valueText ?? null,
          },
          create: {
            entryId,
            kpiDefinitionId: v.kpiDefinitionId,
            valueNumeric: v.valueNumeric ?? null,
            valueText: v.valueText ?? null,
          },
        }),
      ),
    );
  }
}

/**
 * Add a new set (entry) after a specific entry in the same block,
 * keeping series of the same exercise contiguous.
 * Copies KPI values from the reference entry if no values provided.
 */
export async function addSetAfter(
  blockId: string,
  userId: string,
  data: {
    exerciseId: string;
    afterEntryId: string;
    values?: KpiValueInput[];
  },
) {
  const block = await prisma.workoutBlock.findUnique({
    where: { id: blockId },
    include: {
      workout: { select: { userId: true } },
      entries: {
        orderBy: { displayOrder: "asc" },
        select: { id: true, displayOrder: true },
      },
    },
  });
  if (!block) throw new Error("Not found");
  if (block.workout.userId !== userId) throw new Error("Forbidden");

  const refIndex = block.entries.findIndex((e) => e.id === data.afterEntryId);
  if (refIndex === -1) throw new Error("Reference entry not found");

  const insertOrder = block.entries[refIndex].displayOrder + 1;

  // Shift all entries after the insertion point
  const entriesToShift = block.entries.filter(
    (e) => e.displayOrder >= insertOrder,
  );
  if (entriesToShift.length > 0) {
    await prisma.$transaction(
      entriesToShift.map((e) =>
        prisma.workoutEntry.update({
          where: { id: e.id },
          data: { displayOrder: e.displayOrder + 1 },
        }),
      ),
    );
  }

  // If no values provided, copy from the reference entry
  let kpiValues = data.values;
  if (!kpiValues) {
    const refEntry = await prisma.workoutEntry.findUnique({
      where: { id: data.afterEntryId },
      include: { values: true },
    });
    if (refEntry) {
      kpiValues = refEntry.values.map((v) => ({
        kpiDefinitionId: v.kpiDefinitionId,
        valueNumeric: v.valueNumeric,
        valueText: v.valueText,
      }));
    }
  }

  return prisma.workoutEntry.create({
    data: {
      blockId,
      exerciseId: data.exerciseId,
      displayOrder: insertOrder,
      values: {
        create: (kpiValues ?? []).map((v) => ({
          kpiDefinitionId: v.kpiDefinitionId,
          valueNumeric: v.valueNumeric ?? null,
          valueText: v.valueText ?? null,
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
