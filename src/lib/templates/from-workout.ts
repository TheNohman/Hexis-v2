import { prisma } from "@/lib/prisma";
import { assertOwnership } from "@/lib/ownership";

export async function createTemplateFromWorkout(
  workoutId: string,
  userId: string,
  templateName?: string,
): Promise<{ id: string }> {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      blocks: {
        orderBy: { displayOrder: "asc" },
        include: {
          entries: {
            orderBy: { displayOrder: "asc" },
            include: {
              values: true,
              exercise: { select: { id: true } },
            },
          },
        },
      },
    },
  });
  assertOwnership(workout, userId);

  // Filter entries: keep only DONE, non-warmup entries
  const template = await prisma.workoutTemplate.create({
    data: {
      userId,
      name: templateName?.trim() || `Template — ${workout.name}`,
      blocks: {
        create: workout.blocks
          .filter((block) =>
            block.entries.some(
              (e) => e.status === "DONE" && !e.isWarmup,
            ),
          )
          .map((block, blockIdx) => ({
            name: block.name,
            displayOrder: blockIdx,
            entries: {
              create: block.entries
                .filter((e) => e.status === "DONE" && !e.isWarmup)
                .map((entry, entryIdx) => ({
                  exerciseId: entry.exerciseId,
                  displayOrder: entryIdx,
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

  return { id: template.id };
}
