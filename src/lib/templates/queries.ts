import { prisma } from "@/lib/prisma";
import type { TemplateDetail, TemplateListItem } from "./types";

/**
 * Rough estimate of a template's duration in seconds.
 * - Per strength/bodyweight entry: inter-set rest + ~45s execution
 * - Per cardio entry: the explicit duration if any, else rest
 * - Per mobility entry: explicit duration or 30s default
 * Interval blocks use the (work + rest) × rounds computation when configured.
 */
function estimateDurationSecs(blocks: {
  mode: string;
  workSecs: number | null;
  restSecs: number | null;
  roundCount: number | null;
  entries: {
    restDurationSecs: number | null;
    exercise: { type: string };
    values: { kpiSlug: string; valueNumeric: number | null }[];
  }[];
}[]): number {
  let total = 0;
  for (const b of blocks) {
    if (b.mode === "INTERVAL" && b.workSecs && b.restSecs && b.roundCount) {
      total += (b.workSecs + b.restSecs) * b.roundCount;
      continue;
    }
    for (const e of b.entries) {
      const rest = e.restDurationSecs ?? 60;
      const type = e.exercise.type;
      if (type === "STRENGTH" || type === "BODYWEIGHT") {
        total += rest + 45;
      } else if (type === "CARDIO" || type === "MOBILITY") {
        const dur =
          e.values.find((v) => v.kpiSlug === "duration_secs")?.valueNumeric ?? 30;
        total += Math.max(dur, 30) + (rest ?? 0);
      } else {
        total += rest + 30;
      }
    }
  }
  return Math.round(total);
}

export async function listTemplates(
  userId: string,
): Promise<TemplateListItem[]> {
  const templates = await prisma.workoutTemplate.findMany({
    where: { userId },
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    include: {
      blocks: {
        include: {
          entries: {
            include: {
              exercise: { select: { type: true } },
              values: {
                include: { kpiDefinition: { select: { slug: true } } },
              },
            },
          },
        },
      },
      _count: { select: { programSlots: true } },
    },
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    tags: t.tags,
    source: t.source,
    isFavorite: t.isFavorite,
    blockCount: t.blocks.length,
    entryCount: t.blocks.reduce((sum, b) => sum + b.entries.length, 0),
    programUsageCount: t._count.programSlots,
    estimatedDurationSecs: estimateDurationSecs(
      t.blocks.map((b) => ({
        mode: b.mode,
        workSecs: null,
        restSecs: null,
        roundCount: null,
        entries: b.entries.map((e) => ({
          restDurationSecs: e.restDurationSecs,
          exercise: { type: e.exercise.type },
          values: e.values.map((v) => ({
            kpiSlug: v.kpiDefinition.slug,
            valueNumeric: v.valueNumeric,
          })),
        })),
      })),
    ),
    updatedAt: t.updatedAt,
  }));
}

export async function getTemplateById(
  templateId: string,
  userId: string,
): Promise<TemplateDetail | null> {
  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, userId },
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
      _count: { select: { programSlots: true } },
    },
  });

  if (!template) return null;

  const blocks = template.blocks.map((b) => ({
    id: b.id,
    name: b.name,
    displayOrder: b.displayOrder,
    mode: b.mode,
    intervalFormat: b.intervalConfig?.intervalFormat ?? null,
    workSecs: b.intervalConfig?.workSecs ?? null,
    restSecs: b.intervalConfig?.restSecs ?? null,
    roundCount: b.intervalConfig?.roundCount ?? null,
    playbackOrder: b.intervalConfig?.playbackOrder ?? null,
    countdownLeadSecs: b.intervalConfig?.countdownLeadSecs ?? 3,
    customSequence: b.intervalConfig?.customSequence ?? [],
    entries: b.entries.map((e) => ({
      id: e.id,
      displayOrder: e.displayOrder,
      restDurationSecs: e.restDurationSecs,
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
      })),
    })),
  }));

  return {
    id: template.id,
    userId: template.userId,
    name: template.name,
    description: template.description,
    tags: template.tags,
    source: template.source,
    isFavorite: template.isFavorite,
    programUsageCount: template._count.programSlots,
    estimatedDurationSecs: estimateDurationSecs(
      blocks.map((b) => ({
        mode: b.mode,
        workSecs: b.workSecs,
        restSecs: b.restSecs,
        roundCount: b.roundCount,
        entries: b.entries.map((e) => ({
          restDurationSecs: e.restDurationSecs,
          exercise: { type: e.exercise.type },
          values: e.values.map((v) => ({
            kpiSlug: v.kpiSlug,
            valueNumeric: v.valueNumeric,
          })),
        })),
      })),
    ),
    blocks,
  };
}
