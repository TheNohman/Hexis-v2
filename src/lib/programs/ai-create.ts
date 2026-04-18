import { prisma } from "@/lib/prisma";
import type { GeneratedProgram, GeneratedFill } from "@/lib/mentor/parser";

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

// ─── Fill empty slots of an existing program ────────────────────────

export type FillResult = {
  created: number;
  skipped: number;
  reasons: string[];
};

/**
 * Consume AI "fills" and populate empty program slots with freshly-created
 * WorkoutTemplates. Skips fills that don't match any existing empty slot,
 * and skips those whose exercises don't match the user library at all.
 */
export async function materializeProgramFills(
  userId: string,
  programId: string,
  fills: GeneratedFill[],
): Promise<FillResult> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { slots: true },
  });
  if (!program || program.userId !== userId) throw new Error("Forbidden");

  const [allExercises, allKpis] = await Promise.all([
    prisma.exercise.findMany({
      where: { OR: [{ userId }, { isSystem: true }] },
    }),
    prisma.kpiDefinition.findMany(),
  ]);
  const kpiBySlug = new Map(allKpis.map((k) => [k.slug, k]));
  const exerciseByName = new Map(
    allExercises.map((e) => [e.name.toLowerCase(), e]),
  );

  // Index empty slots by (cycle, day) — first match wins per pair to keep
  // things deterministic. Multiple empty slots on the same day are possible;
  // we only fill the first. The user can re-run the action to fill the rest.
  const emptyByKey = new Map<string, string>(); // "cycle:day" -> slotId
  for (const s of program.slots) {
    if (s.templateId) continue;
    const key = `${s.cycle}:${s.day}`;
    if (!emptyByKey.has(key)) emptyByKey.set(key, s.id);
  }

  let created = 0;
  let skipped = 0;
  const reasons: string[] = [];

  for (const fill of fills) {
    const key = `${fill.cycle}:${fill.day}`;
    const slotId = emptyByKey.get(key);
    if (!slotId) {
      skipped++;
      reasons.push(`Slot cycle ${fill.cycle + 1} jour ${fill.day + 1} non vide`);
      continue;
    }

    // Count matched exercises in the generated template
    let matched = 0;
    for (const block of fill.template.blocks) {
      for (const ex of block.exercises) {
        if (exerciseByName.has(ex.name.toLowerCase())) matched++;
      }
    }
    if (matched === 0) {
      skipped++;
      reasons.push(
        `Slot cycle ${fill.cycle + 1} jour ${fill.day + 1} : aucun exercice connu`,
      );
      continue;
    }

    // Create template with matched exercises
    const template = await prisma.workoutTemplate.create({
      data: {
        userId,
        name: fill.template.name,
        blocks: {
          create: fill.template.blocks.map((block, blockIdx) => ({
            name: block.name,
            displayOrder: blockIdx,
            entries: {
              create: block.exercises.flatMap((ex, exIdx) => {
                const exercise = exerciseByName.get(ex.name.toLowerCase());
                if (!exercise) return [];

                const values: {
                  kpiDefinitionId: string;
                  valueNumeric: number | null;
                  valueText: string | null;
                }[] = [];

                if (ex.type === "STRENGTH") {
                  const w = kpiBySlug.get("weight_kg");
                  const r = kpiBySlug.get("reps");
                  if (w && ex.weight_kg != null)
                    values.push({
                      kpiDefinitionId: w.id,
                      valueNumeric: ex.weight_kg,
                      valueText: null,
                    });
                  if (r && ex.reps != null)
                    values.push({
                      kpiDefinitionId: r.id,
                      valueNumeric: ex.reps,
                      valueText: null,
                    });
                } else if (ex.type === "BODYWEIGHT") {
                  const r = kpiBySlug.get("reps");
                  if (r && ex.reps != null)
                    values.push({
                      kpiDefinitionId: r.id,
                      valueNumeric: ex.reps,
                      valueText: null,
                    });
                } else if (ex.type === "CARDIO") {
                  const d = kpiBySlug.get("duration_secs");
                  const dk = kpiBySlug.get("distance_km");
                  if (d && ex.duration_secs != null)
                    values.push({
                      kpiDefinitionId: d.id,
                      valueNumeric: ex.duration_secs,
                      valueText: null,
                    });
                  if (dk && ex.distance_km != null)
                    values.push({
                      kpiDefinitionId: dk.id,
                      valueNumeric: ex.distance_km,
                      valueText: null,
                    });
                } else if (ex.type === "MOBILITY") {
                  const d = kpiBySlug.get("duration_secs");
                  if (d && ex.duration_secs != null)
                    values.push({
                      kpiDefinitionId: d.id,
                      valueNumeric: ex.duration_secs,
                      valueText: null,
                    });
                }

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

    await prisma.programSlot.update({
      where: { id: slotId },
      data: {
        templateId: template.id,
        label: fill.label ?? undefined,
      },
    });

    // Consume the slot so a later fill on the same (cycle,day) doesn't
    // re-fill what we just wrote.
    emptyByKey.delete(key);
    created++;
  }

  return { created, skipped, reasons };
}
