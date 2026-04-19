import { prisma } from "@/lib/prisma";
import { nextDisplayOrder } from "@/lib/ordering";
import {
  assertOwnership,
  assertTemplateBlockOwnership,
  assertTemplateEntryOwnership,
} from "@/lib/ownership";
import type { KpiValueInput } from "@/lib/workouts/types";

export async function createTemplate(userId: string, name?: string) {
  return prisma.workoutTemplate.create({
    data: {
      userId,
      name: name?.trim() || "Nouveau modèle",
    },
  });
}

export async function toggleTemplateFavorite(
  templateId: string,
  userId: string,
) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, userId: true, isFavorite: true },
  });
  assertOwnership(template, userId);
  return prisma.workoutTemplate.update({
    where: { id: templateId },
    data: { isFavorite: !template.isFavorite },
  });
}

export async function bulkDeleteTemplates(
  templateIds: string[],
  userId: string,
) {
  if (templateIds.length === 0) return { count: 0 };
  const templates = await prisma.workoutTemplate.findMany({
    where: { id: { in: templateIds } },
    select: { id: true, userId: true },
  });
  if (templates.length !== templateIds.length) {
    throw new Error("Some templates not found");
  }
  for (const t of templates) {
    if (t.userId !== userId) throw new Error("Forbidden");
  }
  return prisma.workoutTemplate.deleteMany({
    where: { id: { in: templateIds }, userId },
  });
}

export async function deleteTemplate(templateId: string, userId: string) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, userId: true },
  });
  assertOwnership(template, userId);
  return prisma.workoutTemplate.delete({ where: { id: templateId } });
}

export async function renameTemplate(
  templateId: string,
  userId: string,
  name: string,
) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, userId: true },
  });
  assertOwnership(template, userId);
  return prisma.workoutTemplate.update({
    where: { id: templateId },
    data: { name: name.trim() },
  });
}

export async function updateTemplateObjective(
  templateId: string,
  userId: string,
  objective: string | null,
) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, userId: true },
  });
  assertOwnership(template, userId);
  const normalized = objective?.trim() || null;
  return prisma.workoutTemplate.update({
    where: { id: templateId },
    data: { objective: normalized },
  });
}

export async function addTemplateBlock(
  templateId: string,
  userId: string,
  name: string,
) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      userId: true,
      blocks: { select: { displayOrder: true } },
    },
  });
  assertOwnership(template, userId);

  const nextOrder = nextDisplayOrder(template.blocks);

  return prisma.workoutTemplateBlock.create({
    data: {
      templateId,
      name: name.trim() || "Bloc sans nom",
      displayOrder: nextOrder,
    },
  });
}

/**
 * Create an INTERVAL-mode template block with an optional initial playlist
 * of exercises and a full HIIT configuration. Used by the "+ Bloc HIIT"
 * button in the template editor. Presets (Tabata, Intervalles libres)
 * are resolved client-side and passed via the `config` argument.
 */
export async function addIntervalTemplateBlock(
  templateId: string,
  userId: string,
  data: {
    name: string;
    format: "TABATA" | "INTERVALS";
    workSecs: number;
    restSecs: number;
    roundCount: number;
    playbackOrder: "CYCLE" | "SAME" | "CUSTOM";
    exerciseIds: string[];
    /** Required when playbackOrder=CUSTOM: exerciseId per round. */
    customSequence?: string[];
  },
) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      userId: true,
      blocks: { select: { displayOrder: true } },
    },
  });
  assertOwnership(template, userId);

  const nextOrder = nextDisplayOrder(template.blocks);

  // Only persist customSequence for CUSTOM mode. Truncate / pad to
  // roundCount so the UI contract stays "length == roundCount".
  let customSequence: string[] = [];
  if (data.playbackOrder === "CUSTOM" && data.customSequence) {
    customSequence = data.customSequence.slice(0, data.roundCount);
    // Fill missing slots with the first exercise to stay consistent.
    while (customSequence.length < data.roundCount && data.exerciseIds[0]) {
      customSequence.push(data.exerciseIds[0]);
    }
  }

  return prisma.workoutTemplateBlock.create({
    data: {
      // Use relation connect rather than raw FK so we can mix with the
      // nested `intervalConfig.create` (Prisma's unchecked input variant
      // doesn't accept relation nested creates).
      template: { connect: { id: templateId } },
      name: data.name.trim() || "Bloc HIIT",
      displayOrder: nextOrder,
      mode: "INTERVAL",
      intervalConfig: {
        create: {
          intervalFormat: data.format,
          workSecs: data.workSecs,
          restSecs: data.restSecs,
          roundCount: data.roundCount,
          playbackOrder: data.playbackOrder,
          customSequence,
        },
      },
      entries: {
        create: data.exerciseIds.map((exerciseId, i) => ({
          exerciseId,
          displayOrder: i,
        })),
      },
    },
  });
}

export async function renameTemplateBlock(
  blockId: string,
  userId: string,
  name: string,
) {
  await assertTemplateBlockOwnership(blockId, userId);

  return prisma.workoutTemplateBlock.update({
    where: { id: blockId },
    data: { name: name.trim() || "Bloc sans nom" },
  });
}

export async function deleteTemplateBlock(blockId: string, userId: string) {
  await assertTemplateBlockOwnership(blockId, userId);

  return prisma.workoutTemplateBlock.delete({ where: { id: blockId } });
}

export async function reorderTemplateBlocks(
  templateId: string,
  userId: string,
  orderedBlockIds: string[],
) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      userId: true,
      blocks: { select: { id: true } },
    },
  });
  assertOwnership(template, userId);

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
  const block = await assertTemplateBlockOwnership<{
    entries: { displayOrder: number }[];
  }>(blockId, userId, {
    entries: { select: { displayOrder: true } },
  });

  const exercise = await prisma.exercise.findUnique({
    where: { id: data.exerciseId },
  });
  if (!exercise) throw new Error("Exercise not found");
  if (!exercise.isSystem && exercise.userId !== userId) {
    throw new Error("Forbidden exercise");
  }

  const nextOrder = nextDisplayOrder(block.entries);

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
  const entry = await assertTemplateEntryOwnership<{
    restDurationSecs: number | null;
    block: { entries: { displayOrder: number }[] };
    values: {
      kpiDefinitionId: string;
      valueNumeric: number | null;
      valueText: string | null;
    }[];
  }>(entryId, userId, {
    restDurationSecs: true,
    block: { select: { entries: { select: { displayOrder: true } } } },
    values: {
      select: {
        kpiDefinitionId: true,
        valueNumeric: true,
        valueText: true,
      },
    },
  });

  const nextOrder = nextDisplayOrder(entry.block.entries);

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
  await assertTemplateEntryOwnership(entryId, userId);

  return prisma.workoutTemplateEntry.delete({ where: { id: entryId } });
}

export async function reorderTemplateEntries(
  blockId: string,
  userId: string,
  orderedEntryIds: string[],
) {
  const block = await assertTemplateBlockOwnership<{
    entries: { id: string }[];
  }>(blockId, userId, {
    entries: { select: { id: true } },
  });

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
  await assertTemplateEntryOwnership(entryId, userId);

  return prisma.workoutTemplateEntry.update({
    where: { id: entryId },
    data: { restDurationSecs },
  });
}

/**
 * Upsert KPI values on a template entry. Used by the program-editor inline
 * panel to tweak planned numbers (weight, reps, duration…) without leaving
 * the program page.
 */
export async function updateTemplateEntryValues(
  entryId: string,
  userId: string,
  values: KpiValueInput[],
) {
  await assertTemplateEntryOwnership(entryId, userId);

  await prisma.$transaction(
    values.map((v) =>
      prisma.templateEntryKpiValue.upsert({
        where: {
          entryId_kpiDefinitionId: {
            entryId,
            kpiDefinitionId: v.kpiDefinitionId,
          },
        },
        create: {
          entryId,
          kpiDefinitionId: v.kpiDefinitionId,
          valueNumeric: v.valueNumeric ?? null,
          valueText: v.valueText ?? null,
        },
        update: {
          valueNumeric: v.valueNumeric ?? null,
          valueText: v.valueText ?? null,
        },
      }),
    ),
  );
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
          intervalConfig: true,
          entries: {
            orderBy: { displayOrder: "asc" },
            include: { values: true },
          },
        },
      },
    },
  });
  assertOwnership(template, userId);

  // If this template corresponds to the user's current slot in their
  // active program, wire up `programSlotId` so the resulting session
  // counts as a program run (summary gets Cycle X · Jour Y context,
  // cursor advances on finish, progressive overload picks it up).
  //
  // We ONLY wire up the CURRENT slot — not any slot referencing this
  // template. Using a same-template alternate slot from the template
  // detail page should stay as a free session, since the user didn't
  // pick "this slot" explicitly. The dashboard "Lancer la séance"
  // path already handles the programmatic slot wiring.
  const activeProgram = await prisma.program.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      currentSlotId: true,
      currentSlot: { select: { templateId: true } },
    },
  });
  const programSlotId =
    activeProgram?.currentSlot?.templateId === templateId
      ? activeProgram.currentSlotId
      : null;

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
      programSlotId,
      blocks: {
        create: template.blocks.map((block) => ({
          name: block.name,
          displayOrder: block.displayOrder,
          // Carry over the interval configuration so HIIT blocks defined
          // in a template stay HIIT blocks in the spawned workout. Each
          // workout block gets its own IntervalConfig row (1:1 relation,
          // rows are not shared across blocks).
          mode: block.mode,
          ...(block.intervalConfig
            ? {
                intervalConfig: {
                  create: {
                    intervalFormat: block.intervalConfig.intervalFormat,
                    workSecs: block.intervalConfig.workSecs,
                    restSecs: block.intervalConfig.restSecs,
                    roundCount: block.intervalConfig.roundCount,
                    playbackOrder: block.intervalConfig.playbackOrder,
                    countdownLeadSecs: block.intervalConfig.countdownLeadSecs,
                    customSequence: block.intervalConfig.customSequence,
                  },
                },
              }
            : {}),
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
