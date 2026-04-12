import { prisma } from "@/lib/prisma";
import type { GeneratedProgram } from "@/lib/mentor/parser";

/**
 * Materialize an AI-generated program into the database.
 * Creates: Program + WorkoutTemplates (with blocks/entries/values) + ProgramSlots.
 */
export async function materializeAIProgram(
  userId: string,
  generated: GeneratedProgram,
): Promise<string> {
  // 1. Load all exercises and KPI definitions for matching
  const [allExercises, allKpis] = await Promise.all([
    prisma.exercise.findMany({
      where: { OR: [{ userId }, { isSystem: true }] },
      include: { exerciseKpis: { include: { kpiDefinition: true } } },
    }),
    prisma.kpiDefinition.findMany(),
  ]);

  const kpiBySlug = new Map(allKpis.map((k) => [k.slug, k]));

  // 2. Create the program
  const program = await prisma.program.create({
    data: {
      userId,
      name: generated.name,
      cycleCount: generated.cycleCount,
      cycleDays: generated.cycleDays,
    },
  });

  // 3. For each slot, create template + slot
  let firstSlotId: string | null = null;

  for (const slot of generated.slots) {
    const tpl = slot.template;

    // Create template with blocks and entries
    const template = await prisma.workoutTemplate.create({
      data: {
        userId,
        name: tpl.name,
        blocks: {
          create: tpl.blocks.map((block, blockIdx) => ({
            name: block.name,
            displayOrder: blockIdx,
            entries: {
              create: block.exercises.flatMap((ex, exIdx) => {
                // Find matching exercise
                const exercise = allExercises.find(
                  (e) => e.name.toLowerCase() === ex.name.toLowerCase(),
                );

                if (!exercise) return [];

                // Build KPI values based on exercise type
                const values: { kpiDefinitionId: string; valueNumeric: number | null; valueText: string | null }[] = [];

                if (ex.type === "STRENGTH") {
                  const weightKpi = kpiBySlug.get("weight_kg");
                  const repsKpi = kpiBySlug.get("reps");
                  if (weightKpi && ex.weight_kg != null) {
                    values.push({ kpiDefinitionId: weightKpi.id, valueNumeric: ex.weight_kg, valueText: null });
                  }
                  if (repsKpi && ex.reps != null) {
                    values.push({ kpiDefinitionId: repsKpi.id, valueNumeric: ex.reps, valueText: null });
                  }
                } else if (ex.type === "BODYWEIGHT") {
                  const repsKpi = kpiBySlug.get("reps");
                  if (repsKpi && ex.reps != null) {
                    values.push({ kpiDefinitionId: repsKpi.id, valueNumeric: ex.reps, valueText: null });
                  }
                } else if (ex.type === "CARDIO") {
                  const durKpi = kpiBySlug.get("duration_secs");
                  const distKpi = kpiBySlug.get("distance_km");
                  if (durKpi && ex.duration_secs != null) {
                    values.push({ kpiDefinitionId: durKpi.id, valueNumeric: ex.duration_secs, valueText: null });
                  }
                  if (distKpi && ex.distance_km != null) {
                    values.push({ kpiDefinitionId: distKpi.id, valueNumeric: ex.distance_km, valueText: null });
                  }
                } else if (ex.type === "MOBILITY") {
                  const durKpi = kpiBySlug.get("duration_secs");
                  if (durKpi && ex.duration_secs != null) {
                    values.push({ kpiDefinitionId: durKpi.id, valueNumeric: ex.duration_secs, valueText: null });
                  }
                }

                // Create N sets for this exercise
                return Array.from({ length: ex.sets }, (_, setIdx) => ({
                  exerciseId: exercise.id,
                  displayOrder: exIdx * 100 + setIdx,
                  values: {
                    create: values.map((v) => ({
                      kpiDefinitionId: v.kpiDefinitionId,
                      valueNumeric: v.valueNumeric,
                      valueText: v.valueText,
                    })),
                  },
                }));
              }),
            },
          })),
        },
      },
    });

    // Create program slot linked to this template
    const programSlot = await prisma.programSlot.create({
      data: {
        programId: program.id,
        cycle: slot.cycle,
        day: slot.day,
        startTime: slot.startTime,
        label: slot.label,
        templateId: template.id,
      },
    });

    if (!firstSlotId) firstSlotId = programSlot.id;
  }

  // 4. Set cursor to first slot and activate
  if (firstSlotId) {
    // Deactivate other programs
    await prisma.program.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    await prisma.program.update({
      where: { id: program.id },
      data: { currentSlotId: firstSlotId, isActive: true },
    });
  }

  return program.id;
}
