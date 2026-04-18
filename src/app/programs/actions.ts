"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  createProgram,
  deleteProgram,
  renameProgram,
  updateCycleCount,
  updateCycleDays,
  toggleProgramActive,
  addSlot,
  updateSlot,
  deleteSlot,
  createWorkoutFromProgramSlot,
  createWorkoutFromSpecificSlot,
  skipCurrentSlot,
  updateStartDate,
  updateProgramDescription,
} from "@/lib/programs/mutations";
import {
  materializeProgramFills,
  type FillResult,
} from "@/lib/programs/ai-create";
import { generateFillForProgram } from "@/lib/mentor/openai";
import { parseGeneratedFills } from "@/lib/mentor/parser";
import { buildMentorContext } from "@/lib/mentor/context";
import { generateProgram } from "@/lib/mentor/openai";
import { parseGeneratedProgram } from "@/lib/mentor/parser";
import { materializeAIProgram } from "@/lib/programs/ai-create";
import { finishActiveWorkouts } from "@/lib/workouts/mutations";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/telemetry/track";
import {
  assertValid,
  idSchema,
  nameSchema,
  programSlotDataSchema,
} from "@/lib/validation/schemas";

export async function createProgramAction() {
  const userId = await getCurrentUserId();
  const program = await createProgram(userId);
  await trackEvent(userId, "program_created", { programId: program.id });
  redirect(`/programs/${program.id}`);
}

export async function deleteProgramAction(programId: string) {
  assertValid(idSchema, programId);
  const userId = await getCurrentUserId();
  await deleteProgram(programId, userId);
  revalidatePath("/planning");
  redirect("/planning");
}

export async function renameProgramAction(programId: string, name: string) {
  assertValid(idSchema, programId);
  assertValid(nameSchema, name);
  const userId = await getCurrentUserId();
  await renameProgram(programId, userId, name);
  revalidatePath(`/programs/${programId}`);
  revalidatePath("/planning");
}

export async function updateProgramDescriptionAction(
  programId: string,
  description: string | null,
) {
  assertValid(idSchema, programId);
  assertValid(z.string().max(2000).nullable(), description);
  const userId = await getCurrentUserId();
  await updateProgramDescription(programId, userId, description);
  revalidatePath(`/programs/${programId}`);
}

/**
 * Fill empty slots of a program via AI — uses the program description, the
 * already-assigned slots as context, the user's exercise library, and the
 * user's sport/bien-être context.
 */
export async function fillProgramCyclesAction(programId: string): Promise<{
  error?: string;
  result?: FillResult;
}> {
  assertValid(idSchema, programId);
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mentorEnabled: true },
  });
  if (!user?.mentorEnabled) {
    return { error: "L'IA n'est pas activée sur ton compte." };
  }

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      slots: {
        include: { template: { select: { name: true } } },
      },
    },
  });
  if (!program || program.userId !== userId) {
    return { error: "Programme introuvable." };
  }

  const emptySlots = program.slots
    .filter((s) => !s.templateId)
    .map((s) => ({ cycle: s.cycle, day: s.day }));

  if (emptySlots.length === 0) {
    return {
      error:
        "Aucun slot vide à remplir. Tous les créneaux ont déjà un modèle assigné.",
    };
  }

  const existingSlots = program.slots
    .filter((s) => s.templateId)
    .map((s) => ({
      cycle: s.cycle,
      day: s.day,
      label: s.label,
      templateName: s.template?.name ?? null,
    }));

  const context = await buildMentorContext(userId);
  const raw = await generateFillForProgram(context, program.description, {
    name: program.name,
    cycleCount: program.cycleCount,
    cycleDays: program.cycleDays,
    existingSlots,
    emptySlots,
  });

  if (!raw) {
    return { error: "L'IA n'a pas pu générer de complément." };
  }

  const fills = parseGeneratedFills(raw);
  if (!fills || fills.length === 0) {
    return { error: "L'IA a répondu mais le format est invalide." };
  }

  const result = await materializeProgramFills(userId, programId, fills);
  revalidatePath(`/programs/${programId}`);
  revalidatePath("/dashboard");
  return { result };
}

export async function updateCycleCountAction(programId: string, cycleCount: number) {
  assertValid(idSchema, programId);
  assertValid(z.number().int().min(1).max(52), cycleCount);
  const userId = await getCurrentUserId();
  await updateCycleCount(programId, userId, cycleCount);
  revalidatePath(`/programs/${programId}`);
}

export async function updateCycleDaysAction(programId: string, cycleDays: number) {
  assertValid(idSchema, programId);
  assertValid(z.number().int().min(1).max(30), cycleDays);
  const userId = await getCurrentUserId();
  await updateCycleDays(programId, userId, cycleDays);
  revalidatePath(`/programs/${programId}`);
}

export async function updateStartDateAction(programId: string, iso: string | null) {
  assertValid(idSchema, programId);
  // Accept null OR an ISO date string like "2026-04-20". Parse to Date.
  const schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
  const parsed = assertValid(schema, iso);
  const date = parsed ? new Date(`${parsed}T00:00:00.000Z`) : null;
  const userId = await getCurrentUserId();
  await updateStartDate(programId, userId, date);
  revalidatePath(`/programs/${programId}`);
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function toggleProgramActiveAction(programId: string) {
  assertValid(idSchema, programId);
  const userId = await getCurrentUserId();
  await toggleProgramActive(programId, userId);
  revalidatePath(`/programs/${programId}`);
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function addSlotAction(
  programId: string,
  cycle: number,
  data: { templateId?: string | null; day?: number; startTime?: string | null; label?: string | null },
) {
  assertValid(idSchema, programId);
  // cycle is 0-indexed (cycle 0 = first cycle), max 11 since cycleCount ≤ 12.
  assertValid(z.number().int().min(0).max(11), cycle);
  const parsed = assertValid(programSlotDataSchema, data);
  const userId = await getCurrentUserId();
  await addSlot(programId, userId, cycle, parsed);
  revalidatePath(`/programs/${programId}`);
}

export async function updateSlotAction(
  slotId: string,
  data: { templateId?: string | null; day?: number; startTime?: string | null; label?: string | null },
) {
  assertValid(idSchema, slotId);
  const parsed = assertValid(programSlotDataSchema, data);
  const userId = await getCurrentUserId();
  await updateSlot(slotId, userId, parsed);
  revalidatePath("/programs");
}

export async function deleteSlotAction(slotId: string) {
  assertValid(idSchema, slotId);
  const userId = await getCurrentUserId();
  await deleteSlot(slotId, userId);
  revalidatePath("/programs");
}

export async function startProgramWorkoutAction() {
  const userId = await getCurrentUserId();
  await finishActiveWorkouts(userId);
  const workout = await createWorkoutFromProgramSlot(userId);
  revalidatePath("/dashboard");
  redirect(`/sessions/${workout.id}`);
}

/** Start a workout from a specific program slot (user picked a different session
 * than the scheduled one). Does NOT advance the cursor. */
export async function startSpecificProgramSlotAction(slotId: string) {
  assertValid(idSchema, slotId);
  const userId = await getCurrentUserId();
  await finishActiveWorkouts(userId);
  const workout = await createWorkoutFromSpecificSlot(userId, slotId);
  revalidatePath("/dashboard");
  redirect(`/sessions/${workout.id}`);
}

export async function skipSlotAction() {
  const userId = await getCurrentUserId();
  await skipCurrentSlot(userId);
  revalidatePath("/dashboard");
}

export async function generateAIProgramAction(goals: string): Promise<{ error?: string; preview?: string }> {
  assertValid(z.string().max(2000), goals);
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mentorEnabled: true } });
  if (!user?.mentorEnabled) {
    return { error: "L'IA n'est pas activée sur ton compte." };
  }

  const context = await buildMentorContext(userId);
  const raw = await generateProgram(context, goals);

  if (!raw) {
    return { error: "L'IA n'a pas pu générer de programme." };
  }

  return { preview: raw };
}

export async function confirmAIProgramAction(rawJson: string): Promise<{ error?: string }> {
  assertValid(z.string().max(200000), rawJson);
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mentorEnabled: true } });
  if (!user?.mentorEnabled) {
    return { error: "L'IA n'est pas activée sur ton compte." };
  }

  const parsed = parseGeneratedProgram(rawJson);
  if (!parsed) {
    return { error: "Impossible de lire le programme généré." };
  }

  const programId = await materializeAIProgram(userId, parsed);
  revalidatePath("/planning");
  redirect(`/programs/${programId}`);
}
