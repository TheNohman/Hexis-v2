import { prisma } from "@/lib/prisma";
import { assertOwnership } from "@/lib/ownership";

export async function cloneTemplate(
  templateId: string,
  userId: string,
  newName?: string,
): Promise<{ id: string }> {
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
  assertOwnership(template, userId);

  const cloned = await prisma.workoutTemplate.create({
    data: {
      userId,
      name: newName?.trim() || `Copie de ${template.name}`,
      tags: template.tags,
      blocks: {
        create: template.blocks.map((block) => ({
          name: block.name,
          displayOrder: block.displayOrder,
          entries: {
            create: block.entries.map((entry) => ({
              exerciseId: entry.exerciseId,
              displayOrder: entry.displayOrder,
              restDurationSecs: entry.restDurationSecs,
              values: {
                create: entry.values.map((v) => ({
                  kpiDefinitionId: v.kpiDefinitionId,
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

  return { id: cloned.id };
}
