import { prisma } from "@/lib/prisma";
import type { ExerciseType } from "@/generated/prisma/enums";

// --------------- Helpers ---------------

/** Get all slots sorted by (week, day, startTime) — the canonical order. */
async function getSortedSlots(programId: string) {
  return prisma.programSlot.findMany({
    where: { programId, templateId: { not: null } },
    orderBy: [{ cycle: "asc" }, { day: "asc" }, { startTime: "asc" }],
  });
}

// --------------- CRUD ---------------

export async function createProgram(userId: string, name = "Nouveau programme") {
  return prisma.program.create({
    data: { userId, name, cycleCount: 1, cycleDays: 7 },
  });
}

export async function deleteProgram(programId: string, userId: string) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  return prisma.program.delete({ where: { id: programId } });
}

export async function bulkDeletePrograms(
  programIds: string[],
  userId: string,
) {
  if (programIds.length === 0) return { count: 0 };
  const programs = await prisma.program.findMany({
    where: { id: { in: programIds } },
    select: { id: true, userId: true },
  });
  if (programs.length !== programIds.length) {
    throw new Error("Some programs not found");
  }
  for (const p of programs) {
    if (p.userId !== userId) throw new Error("Forbidden");
  }
  return prisma.program.deleteMany({
    where: { id: { in: programIds }, userId },
  });
}

export async function toggleProgramFavorite(
  programId: string,
  userId: string,
) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, userId: true, isFavorite: true },
  });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  return prisma.program.update({
    where: { id: programId },
    data: { isFavorite: !program.isFavorite },
  });
}

export async function updateProgramTags(
  programId: string,
  userId: string,
  tags: string[],
) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, userId: true },
  });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  return prisma.program.update({
    where: { id: programId },
    data: { tags },
  });
}

export async function renameProgram(programId: string, userId: string, name: string) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  return prisma.program.update({ where: { id: programId }, data: { name } });
}

export async function updateProgramObjective(
  programId: string,
  userId: string,
  objective: string | null,
) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  const normalized = objective?.trim() || null;
  return prisma.program.update({
    where: { id: programId },
    data: { objective: normalized },
  });
}

export async function updateCycleCount(programId: string, userId: string, cycleCount: number) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  if (cycleCount < 1 || cycleCount > 12) throw new Error("Invalid cycle count");

  if (cycleCount < program.cycleCount) {
    await prisma.programSlot.deleteMany({
      where: { programId, cycle: { gte: cycleCount } },
    });
  }

  return prisma.program.update({
    where: { id: programId },
    data: { cycleCount },
  });
}

export async function updateCycleDays(programId: string, userId: string, cycleDays: number) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  if (cycleDays < 1 || cycleDays > 30) throw new Error("Invalid cycle days");

  // Delete slots that exceed new day count
  if (cycleDays < program.cycleDays) {
    await prisma.programSlot.deleteMany({
      where: { programId, day: { gte: cycleDays } },
    });
  }

  return prisma.program.update({
    where: { id: programId },
    data: { cycleDays },
  });
}

/**
 * Set (or clear) the program's start date — the calendar anchor for cycle 1 day 1.
 * Passing null clears it and returns the program to the legacy day-of-week mode.
 */
export async function updateStartDate(
  programId: string,
  userId: string,
  startDate: Date | null,
) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  return prisma.program.update({
    where: { id: programId },
    data: { startDate },
  });
}

export async function toggleProgramActive(programId: string, userId: string) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");

  if (!program.isActive) {
    // Deactivate all other programs first
    await prisma.program.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    // Auto-set cursor to first slot if not set
    if (!program.currentSlotId) {
      const firstSlot = await prisma.programSlot.findFirst({
        where: { programId, templateId: { not: null } },
        orderBy: [{ cycle: "asc" }, { day: "asc" }, { startTime: "asc" }],
      });
      if (firstSlot) {
        return prisma.program.update({
          where: { id: programId },
          data: { isActive: true, currentSlotId: firstSlot.id },
        });
      }
    }
  }

  return prisma.program.update({
    where: { id: programId },
    data: { isActive: !program.isActive },
  });
}

// --------------- Slot management ---------------

/** Add a new slot to a week. Returns the created slot. */
export async function addSlot(
  programId: string,
  userId: string,
  week: number,
  data: { templateId?: string | null; day?: number; startTime?: string | null; label?: string | null },
) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  if (week < 0 || week >= program.cycleCount) throw new Error("Invalid cycle");

  return prisma.programSlot.create({
    data: {
      programId,
      cycle: week,
      day: data.day ?? 0,
      startTime: data.startTime ?? null,
      label: data.label ?? null,
      templateId: data.templateId ?? null,
    },
  });
}

/** Update an existing slot's day, time, template, or label. */
export async function updateSlot(
  slotId: string,
  userId: string,
  data: { templateId?: string | null; day?: number; startTime?: string | null; label?: string | null },
) {
  const slot = await prisma.programSlot.findUnique({
    where: { id: slotId },
    include: { program: { select: { userId: true } } },
  });
  if (!slot || slot.program.userId !== userId) throw new Error("Forbidden");

  return prisma.programSlot.update({
    where: { id: slotId },
    data: {
      ...(data.templateId !== undefined && { templateId: data.templateId }),
      ...(data.day !== undefined && { day: data.day }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.label !== undefined && { label: data.label }),
    },
  });
}

/** Delete a slot. */
export async function deleteSlot(slotId: string, userId: string) {
  const slot = await prisma.programSlot.findUnique({
    where: { id: slotId },
    include: { program: { select: { userId: true, id: true, currentSlotId: true } } },
  });
  if (!slot || slot.program.userId !== userId) throw new Error("Forbidden");

  // If this was the current slot, advance cursor first
  if (slot.program.currentSlotId === slotId) {
    await advanceCursor(slot.program.id);
  }

  return prisma.programSlot.delete({ where: { id: slotId } });
}

/**
 * Clone all slots from `sourceCycle` into `targetCycle`. If `targetCycle` is
 * outside the current cycle count, the program's `cycleCount` is grown first.
 * Existing slots on the target cycle are preserved — clones are added on top.
 */
export async function cloneCycle(
  programId: string,
  userId: string,
  sourceCycle: number,
  targetCycle: number,
) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  if (sourceCycle < 0 || sourceCycle >= program.cycleCount) {
    throw new Error("Invalid source cycle");
  }
  if (targetCycle < 0 || targetCycle > 11) throw new Error("Invalid target cycle");
  if (sourceCycle === targetCycle) throw new Error("Source and target are identical");

  // Grow cycleCount if needed
  if (targetCycle >= program.cycleCount) {
    await prisma.program.update({
      where: { id: programId },
      data: { cycleCount: targetCycle + 1 },
    });
  }

  const sourceSlots = await prisma.programSlot.findMany({
    where: { programId, cycle: sourceCycle },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  if (sourceSlots.length === 0) return { copied: 0 };

  await prisma.programSlot.createMany({
    data: sourceSlots.map((s) => ({
      programId,
      cycle: targetCycle,
      day: s.day,
      startTime: s.startTime,
      label: s.label,
      templateId: s.templateId,
    })),
  });

  return { copied: sourceSlots.length };
}

// --------------- Create workout from current program slot ---------------

function applySuggestion(
  exerciseType: ExerciseType,
  allSetsDone: boolean,
  kpiSlug: string,
  lastValue: number,
): number {
  if (!allSetsDone) return lastValue;

  if (exerciseType === "STRENGTH" && kpiSlug === "weight_kg") {
    return lastValue + 2.5;
  }
  if (exerciseType === "BODYWEIGHT" && kpiSlug === "reps") {
    return lastValue + 1;
  }
  return lastValue;
}

/**
 * Internal helper: build + persist a new workout from a hydrated (slot, template)
 * pair, applying progressive-overload suggestions from the last completed workout
 * of the same slot. Callers control cursor advancement.
 */
async function buildWorkoutFromSlot(
  userId: string,
  program: { id: string },
  slot: {
    id: string;
    templateId: string | null;
    template: {
      name: string;
      blocks: Array<{
        name: string;
        displayOrder: number;
        entries: Array<{
          exerciseId: string;
          displayOrder: number;
          restDurationSecs: number | null;
          exercise: { type: ExerciseType };
          values: Array<{
            kpiDefinitionId: string;
            valueNumeric: number | null;
            valueText: string | null;
          }>;
        }>;
      }>;
    } | null;
  },
) {
  if (!slot.template) throw new Error("No template for slot");
  const template = slot.template;

  // 2. Find last completed workout for this same slot
  const lastWorkout = await prisma.workout.findFirst({
    where: {
      programSlotId: slot.id,
      finishedAt: { not: null },
    },
    orderBy: { startedAt: "desc" },
    include: {
      blocks: {
        orderBy: { displayOrder: "asc" },
        include: {
          entries: {
            orderBy: { displayOrder: "asc" },
            include: {
              values: { include: { kpiDefinition: { select: { slug: true } } } },
            },
          },
        },
      },
    },
  });

  // 3. Build map of last values
  type LastEntryData = {
    allDone: boolean;
    values: Map<string, { slug: string; valueNumeric: number | null; valueText: string | null }>;
  };

  const lastDataMap = new Map<string, LastEntryData>();

  if (lastWorkout) {
    const exerciseGroups = new Map<string, { done: number; total: number }>();
    for (const block of lastWorkout.blocks) {
      for (const entry of block.entries) {
        const existing = exerciseGroups.get(entry.exerciseId) ?? { done: 0, total: 0 };
        existing.total++;
        if (entry.status === "DONE") existing.done++;
        exerciseGroups.set(entry.exerciseId, existing);
      }
    }

    for (const block of lastWorkout.blocks) {
      for (const entry of block.entries) {
        const key = `${entry.exerciseId}:${entry.displayOrder}`;
        const group = exerciseGroups.get(entry.exerciseId);
        const allDone = group ? group.done === group.total : false;
        const values = new Map<string, { slug: string; valueNumeric: number | null; valueText: string | null }>();
        for (const v of entry.values) {
          values.set(v.kpiDefinitionId, {
            slug: v.kpiDefinition.slug,
            valueNumeric: v.valueNumeric,
            valueText: v.valueText,
          });
        }
        lastDataMap.set(key, { allDone, values });
      }
    }
  }

  // 4. Create the workout
  const now = new Date();
  const defaultName = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const workout = await prisma.workout.create({
    data: {
      userId,
      name: `${template.name} — ${defaultName}`,
      startedAt: now,
      templateId: slot.templateId,
      programId: program.id,
      programSlotId: slot.id,
      blocks: {
        create: template.blocks.map((block) => ({
          name: block.name,
          displayOrder: block.displayOrder,
          entries: {
            create: block.entries.map((entry) => {
              const lastKey = `${entry.exerciseId}:${entry.displayOrder}`;
              const lastData = lastDataMap.get(lastKey);
              const exerciseType = entry.exercise.type;

              return {
                exerciseId: entry.exerciseId,
                displayOrder: entry.displayOrder,
                status: "PLANNED" as const,
                restDurationSecs: entry.restDurationSecs,
                values: {
                  create: entry.values.map((v) => {
                    let valueNumeric = v.valueNumeric;
                    let valueText = v.valueText;
                    let plannedNumeric = v.valueNumeric;
                    let plannedText = v.valueText;

                    if (lastData) {
                      const lastVal = lastData.values.get(v.kpiDefinitionId);
                      if (lastVal?.valueNumeric != null) {
                        const suggested = applySuggestion(
                          exerciseType,
                          lastData.allDone,
                          lastVal.slug,
                          lastVal.valueNumeric,
                        );
                        valueNumeric = suggested;
                        plannedNumeric = suggested;
                      }
                      if (lastVal?.valueText != null) {
                        valueText = lastVal.valueText;
                        plannedText = lastVal.valueText;
                      }
                    }

                    return {
                      kpiDefinitionId: v.kpiDefinitionId,
                      plannedNumeric,
                      plannedText,
                      valueNumeric,
                      valueText,
                    };
                  }),
                },
              };
            }),
          },
        })),
      },
    },
  });

  return workout;
}

/**
 * Create a workout from the CURRENT program cursor slot, then advance the cursor.
 * Used by "Lancer la séance" on the dashboard.
 */
export async function createWorkoutFromProgramSlot(userId: string) {
  const program = await prisma.program.findFirst({
    where: { userId, isActive: true },
    include: {
      currentSlot: {
        include: {
          template: {
            include: {
              blocks: {
                orderBy: { displayOrder: "asc" },
                include: {
                  entries: {
                    orderBy: { displayOrder: "asc" },
                    include: {
                      values: true,
                      exercise: { select: { type: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!program?.currentSlot?.template) throw new Error("No template for current slot");

  const workout = await buildWorkoutFromSlot(userId, program, program.currentSlot);
  await advanceCursor(program.id);
  return workout;
}

/**
 * Create a workout from a SPECIFIC program slot (user chose a different session
 * than the scheduled one). Does NOT advance the cursor — the user's scheduled
 * next session stays as-is for their next launch.
 */
export async function createWorkoutFromSpecificSlot(userId: string, slotId: string) {
  const slot = await prisma.programSlot.findUnique({
    where: { id: slotId },
    include: {
      program: { select: { userId: true, id: true } },
      template: {
        include: {
          blocks: {
            orderBy: { displayOrder: "asc" },
            include: {
              entries: {
                orderBy: { displayOrder: "asc" },
                include: {
                  values: true,
                  exercise: { select: { type: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!slot || slot.program.userId !== userId) throw new Error("Forbidden");
  if (!slot.template) throw new Error("No template for slot");

  return buildWorkoutFromSlot(userId, { id: slot.program.id }, slot);
}

// --------------- Cursor management ---------------

export async function advanceCursor(programId: string) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) throw new Error("Program not found");

  const sortedSlots = await getSortedSlots(programId);
  if (sortedSlots.length === 0) {
    return prisma.program.update({
      where: { id: programId },
      data: { currentSlotId: null },
    });
  }

  // Find current slot index
  const currentIdx = sortedSlots.findIndex((s) => s.id === program.currentSlotId);
  // Next slot wraps around
  const nextIdx = (currentIdx + 1) % sortedSlots.length;

  return prisma.program.update({
    where: { id: programId },
    data: { currentSlotId: sortedSlots[nextIdx].id },
  });
}

export async function skipCurrentSlot(userId: string) {
  const program = await prisma.program.findFirst({
    where: { userId, isActive: true },
  });
  if (!program) throw new Error("No active program");
  return advanceCursor(program.id);
}
