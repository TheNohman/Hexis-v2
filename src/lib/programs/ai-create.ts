import { prisma } from "@/lib/prisma";
import type { GeneratedProgram, GeneratedFill } from "@/lib/mentor/parser";

/**
 * Find the best matching exercise for a name the AI generated, starting
 * with strict equality and falling back to progressively looser rules
 * (contains, prefix, substring). Returns null if nothing plausible
 * matches — callers drop the entry silently in that case.
 *
 * Historically the matcher was exact case-insensitive only, which meant
 * any AI variation ("Squats" vs "Squat barre", "Soulevé de terre sumo"
 * vs "Soulevé de terre") dropped the entry on the floor, producing
 * programs with empty templates. This resolver salvages the common
 * cases without being clever enough to match the wrong exercise.
 */
function resolveExercise<T extends { name: string }>(
  candidates: T[],
  rawName: string,
): T | null {
  const target = rawName.trim().toLowerCase();
  if (!target) return null;
  // 1. Exact (case-insensitive).
  const exact = candidates.find((c) => c.name.toLowerCase() === target);
  if (exact) return exact;
  // 2. One contains the other (handles "Squats" ↔ "Squat barre",
  //    "Soulevé de terre sumo" ↔ "Soulevé de terre").
  const bidirectional = candidates.find((c) => {
    const n = c.name.toLowerCase();
    return n.includes(target) || target.includes(n);
  });
  if (bidirectional) return bidirectional;
  // 3. First word match (fallback for "Pompes inclinées" ↔ "Pompes").
  const firstWord = target.split(/\s+/)[0];
  if (firstWord.length >= 4) {
    const byWord = candidates.find((c) =>
      c.name.toLowerCase().split(/\s+/).includes(firstWord),
    );
    if (byWord) return byWord;
  }
  return null;
}

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
      source: "AI",
    },
  });

  // 3. For each slot, create template + slot
  let firstSlotId: string | null = null;

  for (const slot of generated.slots) {
    const tpl = slot.template;

    // Create template with blocks and entries. Keep blocks that have at
    // least one resolvable exercise — dropping fully-unresolvable blocks
    // (e.g. "Cardio liberte" with no matching exercise) so the detail
    // view doesn't render empty placeholder cards.
    const populatedBlocks = tpl.blocks.filter((block) =>
      block.exercises.some((ex) => resolveExercise(allExercises, ex.name) != null),
    );
    const template = await prisma.workoutTemplate.create({
      data: {
        userId,
        name: tpl.name,
        source: "AI",
        blocks: {
          create: populatedBlocks.map((block, blockIdx) => ({
            name: block.name,
            displayOrder: blockIdx,
            entries: {
              create: block.exercises.flatMap((ex, exIdx) => {
                // Resolve AI-proposed name against the catalog (strict →
                // contains → first word). Drops the entry if nothing
                // matches rather than creating an orphan template row.
                const exercise = resolveExercise(allExercises, ex.name);

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

                // Create N sets for this exercise. Guard against the AI
                // omitting `sets` for BODYWEIGHT/MOBILITY (observed in
                // production: "Tractions" persisted as 0 sets because
                // Array.from({length: undefined}) === []). Same
                // clamp as the fill path below.
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
  createForKey?: Set<string>,
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

  // Index empty slots by (cycle, day) — first match wins per pair to keep
  // things deterministic. Multiple empty slots on the same day are possible;
  // we only fill the first. The user can re-run the action to fill the rest.
  const emptyByKey = new Map<string, string>(); // "cycle:day" -> slotId
  for (const s of program.slots) {
    if (s.templateId) continue;
    const key = `${s.cycle}:${s.day}`;
    if (!emptyByKey.has(key)) emptyByKey.set(key, s.id);
  }
  const createKeys = new Set(createForKey ?? []);

  let created = 0;
  let skipped = 0;
  const reasons: string[] = [];

  for (const fill of fills) {
    const key = `${fill.cycle}:${fill.day}`;
    const slotId = emptyByKey.get(key);
    const canCreate = !slotId && createKeys.has(key);
    if (!slotId && !canCreate) {
      skipped++;
      reasons.push(`Slot cycle ${fill.cycle + 1} jour ${fill.day + 1} non vide`);
      continue;
    }
    // Bounds check for new slot creation
    if (canCreate) {
      if (
        fill.cycle < 0 ||
        fill.cycle >= program.cycleCount ||
        fill.day < 0 ||
        fill.day >= program.cycleDays
      ) {
        skipped++;
        reasons.push(
          `Slot cycle ${fill.cycle + 1} jour ${fill.day + 1} hors limites`,
        );
        continue;
      }
    }

    // Count matched exercises in the generated template
    let matched = 0;
    for (const block of fill.template.blocks) {
      for (const ex of block.exercises) {
        if (resolveExercise(allExercises, ex.name) != null) matched++;
      }
    }
    if (matched === 0) {
      skipped++;
      reasons.push(
        `Slot cycle ${fill.cycle + 1} jour ${fill.day + 1} : aucun exercice connu`,
      );
      continue;
    }

    // Create template with matched exercises — skip blocks with 0 matches
    // so the detail view isn't polluted with empty placeholder blocks.
    const populatedBlocks = fill.template.blocks.filter((block) =>
      block.exercises.some((ex) =>
        resolveExercise(allExercises, ex.name) != null,
      ),
    );
    const template = await prisma.workoutTemplate.create({
      data: {
        userId,
        name: fill.template.name,
        source: "AI",
        blocks: {
          create: populatedBlocks.map((block, blockIdx) => ({
            name: block.name,
            displayOrder: blockIdx,
            entries: {
              create: block.exercises.flatMap((ex, exIdx) => {
                const exercise = resolveExercise(allExercises, ex.name);
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

    if (slotId) {
      await prisma.programSlot.update({
        where: { id: slotId },
        data: {
          templateId: template.id,
          label: fill.label ?? undefined,
        },
      });
      emptyByKey.delete(key);
    } else {
      await prisma.programSlot.create({
        data: {
          programId,
          cycle: fill.cycle,
          day: fill.day,
          templateId: template.id,
          label: fill.label ?? null,
        },
      });
      createKeys.delete(key);
    }
    created++;
  }

  return { created, skipped, reasons };
}
