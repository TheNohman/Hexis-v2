import { prisma } from "@/lib/prisma";
import type { TemplateDetail, TemplateListItem } from "./types";

export async function listTemplates(
  userId: string,
): Promise<TemplateListItem[]> {
  const templates = await prisma.workoutTemplate.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      blocks: {
        include: { _count: { select: { entries: true } } },
      },
    },
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    blockCount: t.blocks.length,
    entryCount: t.blocks.reduce((sum, b) => sum + b._count.entries, 0),
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

  if (!template) return null;

  return {
    id: template.id,
    userId: template.userId,
    name: template.name,
    blocks: template.blocks.map((b) => ({
      id: b.id,
      name: b.name,
      displayOrder: b.displayOrder,
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
    })),
  };
}
