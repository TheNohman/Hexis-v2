import { prisma } from "@/lib/prisma";
import type { KpiValueInput } from "@/lib/workouts/types";

function assertTemplateOwnership<T extends { userId: string }>(
  entity: T | null,
  userId: string,
): asserts entity is T {
  if (!entity) throw new Error("Not found");
  if (entity.userId !== userId) throw new Error("Forbidden");
}

export async function createTemplate(userId: string, name?: string) {
  return prisma.workoutTemplate.create({
    data: {
      userId,
      name: name?.trim() || "Nouveau template",
    },
  });
}

export async function deleteTemplate(templateId: string, userId: string) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
  });
  assertTemplateOwnership(template, userId);
  return prisma.workoutTemplate.delete({ where: { id: templateId } });
}

export async function renameTemplate(
  templateId: string,
  userId: string,
  name: string,
) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
  });
  assertTemplateOwnership(template, userId);
  return prisma.workoutTemplate.update({
    where: { id: templateId },
    data: { name: name.trim() },
  });
}

export async function addTemplateBlock(
  templateId: string,
  userId: string,
  name: string,
) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    include: { blocks: { select: { displayOrder: true } } },
  });
  assertTemplateOwnership(template, userId);

  const nextOrder =
    template.blocks.length === 0
      ? 0
      : Math.max(...template.blocks.map((b) => b.displayOrder)) + 1;

  return prisma.workoutTemplateBlock.create({
    data: {
      templateId,
      name: name.trim() || "Bloc sans nom",
      displayOrder: nextOrder,
    },
  });
}

export async function renameTemplateBlock(
  blockId: string,
  userId: string,
  name: string,
) {
  const block = await prisma.workoutTemplateBlock.findUnique({
    where: { id: blockId },
    include: { template: { select: { userId: true } } },
  });
  if (!block) throw new Error("Not found");
  if (block.template.userId !== userId) throw new Error("Forbidden");

  return prisma.workoutTemplateBlock.update({
    where: { id: blockId },
    data: { name: name.trim() || "Bloc sans nom" },
  });
}

export async function deleteTemplateBlock(blockId: string, userId: string) {
  const block = await prisma.workoutTemplateBlock.findUnique({
    where: { id: blockId },
    include: { template: { select: { userId: true } } },
  });
  if (!block) throw new Error("Not found");
  if (block.template.userId !== userId) throw new Error("Forbidden");

  return prisma.workoutTemplateBlock.delete({ where: { id: blockId } });
}

export async function reorderTemplateBlocks(
  templateId: string,
  userId: string,
  orderedBlockIds: string[],
) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    include: { blocks: { select: { id: true } } },
  });
  assertTemplateOwnership(template, userId);

  const actualIds = new Set(template.blocks.map((b) => b.id));
  if (
    orderedBlockIds.length !== actualIds.size ||
    !orderedBlockIds.every((id) => actualIds.has(id))
  ) {
    throw new Error("Block ID mismatch");
  }

  await prisma.$transaction(
    orderedBlockIds.map((id, index) =>
      prisma.workoutTemplateBlock.update({
        where: { id },
        data: { displayOrder: index },
      }),
    ),
  );
}

export async function addTemplateEntry(
  blockId: string,
  userId: string,
  data: {
    exerciseId: string;
    values: KpiValueInput[];
    restDurationSecs?: number | null;
  },
) {
  const block = await prisma.workoutTemplateBlock.findUnique({
    where: { id: blockId },
    include: {
      template: { select: { userId: true } },
      entries: { select: { displayOrder: true } },
    },
  });
  if (!block) throw new Error("Not found");
  if (block.template.userId !== userId) throw new Error("Forbidden");

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

  return prisma.workoutTemplateEntry.create({
    data: {
      blockId,
      exerciseId: data.exerciseId,
      displayOrder: nextOrder,
      restDurationSecs: data.restDurationSecs ?? null,
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

export async function duplicateTemplateEntry(
  entryId: string,
  userId: string,
) {
  const entry = await prisma.workoutTemplateEntry.findUnique({
    where: { id: entryId },
    include: {
      block: {
        include: {
          template: { select: { userId: true } },
          entries: { select: { displayOrder: true } },
        },
      },
      values: true,
    },
  });
  if (!entry) throw new Error("Not found");
  if (entry.block.template.userId !== userId) throw new Error("Forbidden");

  const nextOrder =
    Math.max(...entry.block.entries.map((e) => e.displayOrder)) + 1;

  return prisma.workoutTemplateEntry.create({
    data: {
      blockId: entry.blockId,
      exerciseId: entry.exerciseId,
      displayOrder: nextOrder,
      restDurationSecs: entry.restDurationSecs,
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

export async function deleteTemplateEntry(entryId: string, userId: string) {
  const entry = await prisma.workoutTemplateEntry.findUnique({
    where: { id: entryId },
    include: {
      block: { include: { template: { select: { userId: true } } } },
    },
  });
  if (!entry) throw new Error("Not found");
  if (entry.block.template.userId !== userId) throw new Error("Forbidden");

  return prisma.workoutTemplateEntry.delete({ where: { id: entryId } });
}

export async function reorderTemplateEntries(
  blockId: string,
  userId: string,
  orderedEntryIds: string[],
) {
  const block = await prisma.workoutTemplateBlock.findUnique({
    where: { id: blockId },
    include: {
      template: { select: { userId: true } },
      entries: { select: { id: true } },
    },
  });
  if (!block) throw new Error("Not found");
  if (block.template.userId !== userId) throw new Error("Forbidden");

  const actualIds = new Set(block.entries.map((e) => e.id));
  if (
    orderedEntryIds.length !== actualIds.size ||
    !orderedEntryIds.every((id) => actualIds.has(id))
  ) {
    throw new Error("Entry ID mismatch");
  }

  await prisma.$transaction(
    orderedEntryIds.map((id, index) =>
      prisma.workoutTemplateEntry.update({
        where: { id },
        data: { displayOrder: index },
      }),
    ),
  );
}

export async function updateTemplateEntryRest(
  entryId: string,
  userId: string,
  restDurationSecs: number | null,
) {
  const entry = await prisma.workoutTemplateEntry.findUnique({
    where: { id: entryId },
    include: {
      block: { include: { template: { select: { userId: true } } } },
    },
  });
  if (!entry) throw new Error("Not found");
  if (entry.block.template.userId !== userId) throw new Error("Forbidden");

  return prisma.workoutTemplateEntry.update({
    where: { id: entryId },
    data: { restDurationSecs },
  });
}

/**
 * Create a workout from a template, with all entries in PLANNED status.
 * KPI values from the template are stored as plannedNumeric/plannedText.
 */
export async function createWorkoutFromTemplate(
  templateId: string,
  userId: string,
) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    include: {
      blocks: {
        orderBy: { displayOrder: "asc" },
        include: {
          entries: {
            orderBy: { displayOrder: "asc" },
            include: { values: true },
          },
        },
      },
    },
  });
  assertTemplateOwnership(template, userId);

  const now = new Date();
  const defaultName = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return prisma.workout.create({
    data: {
      userId,
      name: `${template.name} — ${defaultName}`,
      startedAt: now,
      templateId,
      blocks: {
        create: template.blocks.map((block) => ({
          name: block.name,
          displayOrder: block.displayOrder,
          entries: {
            create: block.entries.map((entry) => ({
              exerciseId: entry.exerciseId,
              displayOrder: entry.displayOrder,
              status: "PLANNED" as const,
              restDurationSecs: entry.restDurationSecs,
              values: {
                create: entry.values.map((v) => ({
                  kpiDefinitionId: v.kpiDefinitionId,
                  plannedNumeric: v.valueNumeric,
                  plannedText: v.valueText,
                  valueNumeric: v.valueNumeric,
                  valueText: v.valueText,
                })),
              },
            })),
          },
        })),
      },
    },
  });
}
