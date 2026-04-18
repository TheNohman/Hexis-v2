import { prisma } from "@/lib/prisma";
import type { GeneratedTemplate } from "@/lib/mentor/parser";

/**
 * Materialize an AI-generated template into the database.
 * Creates: WorkoutTemplate + blocks + entries + KPI values, matching
 * exercise names against the user's existing + system exercises.
 *
 * Returns the new template id.
 * Throws if the template has 0 matched exercises (avoids creating an empty shell).
 */
export async function materializeAITemplate(
  userId: string,
  generated: GeneratedTemplate,
): Promise<string> {
  const [allExercises, allKpis] = await Promise.all([
    prisma.exercise.findMany({
      where: { OR: [{ userId }, { isSystem: true }] },
      include: { exerciseKpis: { include: { kpiDefinition: true } } },
    }),
    prisma.kpiDefinition.findMany(),
  ]);

  const kpiBySlug = new Map(allKpis.map((k) => [k.slug, k]));
  const exerciseByName = new Map(
    allExercises.map((e) => [e.name.toLowerCase(), e]),
  );

  // Pre-flight: count how many exercises will match. If zero, bail early.
  let matchedCount = 0;
  for (const block of generated.blocks) {
    for (const ex of block.exercises) {
      if (exerciseByName.has(ex.name.toLowerCase())) matchedCount++;
    }
  }
  if (matchedCount === 0) {
    throw new Error(
      "Aucun exercice du modèle généré ne correspond à ta bibliothèque. Essaie de décrire les exercices autrement.",
    );
  }

  // Filter out blocks where NO exercise matches the user library — avoids
  // persisting empty placeholder blocks that litter the detail view.
  const populatedBlocks = generated.blocks.filter((block) =>
    block.exercises.some((ex) =>
      exerciseByName.has(ex.name.toLowerCase()),
    ),
  );

  const template = await prisma.workoutTemplate.create({
    data: {
      userId,
      name: generated.name,
      source: "AI",
      blocks: {
        create: populatedBlocks.map((block, blockIdx) => ({
          name: block.name,
          displayOrder: blockIdx,
          entries: {
            create: block.exercises.flatMap((ex, exIdx) => {
              const exercise = exerciseByName.get(ex.name.toLowerCase());
              if (!exercise) return [];

              // Build KPI values per exercise type
              const values: {
                kpiDefinitionId: string;
                valueNumeric: number | null;
                valueText: string | null;
              }[] = [];

              if (ex.type === "STRENGTH") {
                const weightKpi = kpiBySlug.get("weight_kg");
                const repsKpi = kpiBySlug.get("reps");
                if (weightKpi && ex.weight_kg != null) {
                  values.push({
                    kpiDefinitionId: weightKpi.id,
                    valueNumeric: ex.weight_kg,
                    valueText: null,
                  });
                }
                if (repsKpi && ex.reps != null) {
                  values.push({
                    kpiDefinitionId: repsKpi.id,
                    valueNumeric: ex.reps,
                    valueText: null,
                  });
                }
              } else if (ex.type === "BODYWEIGHT") {
                const repsKpi = kpiBySlug.get("reps");
                if (repsKpi && ex.reps != null) {
                  values.push({
                    kpiDefinitionId: repsKpi.id,
                    valueNumeric: ex.reps,
                    valueText: null,
                  });
                }
              } else if (ex.type === "CARDIO") {
                const durKpi = kpiBySlug.get("duration_secs");
                const distKpi = kpiBySlug.get("distance_km");
                if (durKpi && ex.duration_secs != null) {
                  values.push({
                    kpiDefinitionId: durKpi.id,
                    valueNumeric: ex.duration_secs,
                    valueText: null,
                  });
                }
                if (distKpi && ex.distance_km != null) {
                  values.push({
                    kpiDefinitionId: distKpi.id,
                    valueNumeric: ex.distance_km,
                    valueText: null,
                  });
                }
              } else if (ex.type === "MOBILITY") {
                const durKpi = kpiBySlug.get("duration_secs");
                if (durKpi && ex.duration_secs != null) {
                  values.push({
                    kpiDefinitionId: durKpi.id,
                    valueNumeric: ex.duration_secs,
                    valueText: null,
                  });
                }
              }

              // Create N sets for this exercise (one template-entry per set).
              const sets = Math.max(1, Math.min(10, ex.sets ?? 3));
              return Array.from({ length: sets }, (_, setIdx) => ({
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

  return template.id;
}
