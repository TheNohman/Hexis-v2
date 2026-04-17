import { prisma } from "@/lib/prisma";
import {
  assertBlockOwnership,
  assertEntryOwnership,
} from "@/lib/ownership";
import type { KpiValueInput } from "./types";

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
  const block = await assertBlockOwnership<{
    entries: { displayOrder: number }[];
  }>(blockId, userId, {
    entries: { select: { displayOrder: true } },
  });

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
  const entry = await assertEntryOwnership<{
    block: { entries: { displayOrder: number }[] };
    values: {
      kpiDefinitionId: string;
      valueNumeric: number | null;
      valueText: string | null;
    }[];
  }>(entryId, userId, {
    block: { select: { entries: { select: { displayOrder: true } } } },
    values: {
      select: {
        kpiDefinitionId: true,
        valueNumeric: true,
        valueText: true,
      },
    },
  });

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

export async function reorderEntries(
  blockId: string,
  userId: string,
  orderedEntryIds: string[],
) {
  const block = await assertBlockOwnership<{
    entries: { id: string }[];
  }>(blockId, userId, { entries: { select: { id: true } } });

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
  await assertEntryOwnership(entryId, userId);

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
  await assertEntryOwnership(entryId, userId);
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
  await assertEntryOwnership(entryId, userId);

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
  const block = await assertBlockOwnership<{
    entries: { id: string; displayOrder: number }[];
  }>(blockId, userId, {
    entries: {
      orderBy: { displayOrder: "asc" },
      select: { id: true, displayOrder: true },
    },
  });

  const refIndex = block.entries.findIndex((e) => e.id === data.afterEntryId);
  if (refIndex === -1) throw new Error("Reference entry not found");

  const insertOrder = block.entries[refIndex].displayOrder + 1;

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

export async function updateEntryNotes(
  entryId: string,
  userId: string,
  notes: string | null,
) {
  await assertEntryOwnership(entryId, userId);
  return prisma.workoutEntry.update({
    where: { id: entryId },
    data: { notes },
  });
}

export async function toggleEntryWarmup(entryId: string, userId: string) {
  const entry = await assertEntryOwnership<{ isWarmup: boolean }>(
    entryId,
    userId,
    { isWarmup: true },
  );
  return prisma.workoutEntry.update({
    where: { id: entryId },
    data: { isWarmup: !entry.isWarmup },
  });
}

export async function deleteEntry(entryId: string, userId: string) {
  await assertEntryOwnership(entryId, userId);
  return prisma.workoutEntry.delete({ where: { id: entryId } });
}
