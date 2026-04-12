import { prisma } from "@/lib/prisma";
import type { ExerciseType } from "@/generated/prisma/enums";

// --------------- CRUD ---------------

export async function createProgram(userId: string, name = "Nouveau programme") {
  return prisma.program.create({
    data: { userId, name, weekCount: 1 },
  });
}

export async function deleteProgram(programId: string, userId: string) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  return prisma.program.delete({ where: { id: programId } });
}

export async function renameProgram(programId: string, userId: string, name: string) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  return prisma.program.update({ where: { id: programId }, data: { name } });
}

export async function updateWeekCount(programId: string, userId: string, weekCount: number) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  if (weekCount < 1 || weekCount > 12) throw new Error("Invalid week count");

  // Delete slots for weeks beyond the new count
  if (weekCount < program.weekCount) {
    await prisma.programSlot.deleteMany({
      where: { programId, week: { gte: weekCount } },
    });
  }

  return prisma.program.update({
    where: { id: programId },
    data: {
      weekCount,
      currentWeek: Math.min(program.currentWeek, weekCount - 1),
    },
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
  }

  return prisma.program.update({
    where: { id: programId },
    data: { isActive: !program.isActive },
  });
}

// --------------- Slot management ---------------

export async function upsertSlot(
  programId: string,
  userId: string,
  week: number,
  day: number,
  data: { templateId?: string | null; label?: string | null },
) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");
  if (week < 0 || week >= program.weekCount) throw new Error("Invalid week");

  return prisma.programSlot.upsert({
    where: { programId_week_day: { programId, week, day } },
    create: {
      programId,
      week,
      day,
      templateId: data.templateId ?? null,
      label: data.label ?? null,
    },
    update: {
      templateId: data.templateId !== undefined ? data.templateId : undefined,
      label: data.label !== undefined ? data.label : undefined,
    },
  });
}

export async function deleteSlot(programId: string, userId: string, week: number, day: number) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.userId !== userId) throw new Error("Forbidden");

  return prisma.programSlot.delete({
    where: { programId_week_day: { programId, week, day } },
  });
}

// --------------- Create workout from program slot ---------------

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

export async function createWorkoutFromProgramSlot(userId: string) {
  // 1. Get active program
  const program = await prisma.program.findFirst({
    where: { userId, isActive: true },
    include: {
      slots: {
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

  if (!program) throw new Error("No active program");

  const slot = program.slots.find(
    (s) => s.week === program.currentWeek && s.day === program.currentDay,
  );

  if (!slot?.template) throw new Error("No template for current slot");

  const template = slot.template;

  // 2. Find the last completed workout for this same slot position
  const lastWorkout = await prisma.workout.findFirst({
    where: {
      programId: program.id,
      programWeek: program.currentWeek,
      programDay: program.currentDay,
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

  // 3. Build a map of last values: exerciseId+displayOrder -> { allDone, values }
  type LastEntryData = {
    allDone: boolean;
    exerciseType: ExerciseType;
    values: Map<string, { slug: string; valueNumeric: number | null; valueText: string | null }>;
  };

  const lastDataMap = new Map<string, LastEntryData>();

  if (lastWorkout) {
    // Group entries by exercise+order to check if all sets were done
    const exerciseGroups = new Map<string, { done: number; total: number; type: ExerciseType }>();

    for (const block of lastWorkout.blocks) {
      for (const entry of block.entries) {
        const groupKey = entry.exerciseId;
        const existing = exerciseGroups.get(groupKey) ?? { done: 0, total: 0, type: "STRENGTH" as ExerciseType };
        existing.total++;
        if (entry.status === "DONE") existing.done++;
        exerciseGroups.set(groupKey, existing);
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

        lastDataMap.set(key, {
          allDone,
          exerciseType: (group ? "STRENGTH" : "STRENGTH") as ExerciseType,
          values,
        });
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
      programWeek: program.currentWeek,
      programDay: program.currentDay,
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

                    // If we have data from the last workout, use it
                    if (lastData) {
                      const lastVal = lastData.values.get(v.kpiDefinitionId);
                      if (lastVal) {
                        if (lastVal.valueNumeric != null) {
                          const suggested = applySuggestion(
                            exerciseType,
                            lastData.allDone,
                            lastVal.slug,
                            lastVal.valueNumeric,
                          );
                          valueNumeric = suggested;
                          plannedNumeric = suggested;
                        }
                        if (lastVal.valueText != null) {
                          valueText = lastVal.valueText;
                          plannedText = lastVal.valueText;
                        }
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

  // 5. Advance the cursor
  await advanceCursor(program.id);

  return workout;
}

// --------------- Cursor management ---------------

export async function advanceCursor(programId: string) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { slots: { orderBy: [{ week: "asc" }, { day: "asc" }] } },
  });

  if (!program) throw new Error("Program not found");

  let { currentWeek, currentDay } = program;

  // Try to find the next slot with a template
  const maxAttempts = program.weekCount * 20; // safety limit
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Move to next day
    currentDay++;

    // Find max day for this week
    const weekSlots = program.slots.filter((s) => s.week === currentWeek);
    const maxDay = weekSlots.length > 0 ? Math.max(...weekSlots.map((s) => s.day)) : -1;

    if (currentDay > maxDay) {
      // Move to next week
      currentWeek = (currentWeek + 1) % program.weekCount;
      currentDay = 0;
    }

    // Check if this slot has a template
    const nextSlot = program.slots.find(
      (s) => s.week === currentWeek && s.day === currentDay && s.templateId != null,
    );
    if (nextSlot) break;
  }

  return prisma.program.update({
    where: { id: programId },
    data: { currentWeek, currentDay },
  });
}

export async function skipCurrentSlot(userId: string) {
  const program = await prisma.program.findFirst({
    where: { userId, isActive: true },
  });

  if (!program) throw new Error("No active program");

  return advanceCursor(program.id);
}
