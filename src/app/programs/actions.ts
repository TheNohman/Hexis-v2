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
  skipCurrentSlot,
} from "@/lib/programs/mutations";
import { buildMentorContext } from "@/lib/mentor/context";
import { generateProgram } from "@/lib/mentor/openai";
import { parseGeneratedProgram } from "@/lib/mentor/parser";
import { materializeAIProgram } from "@/lib/programs/ai-create";
import { finishActiveWorkouts } from "@/lib/workouts/mutations";
import { prisma } from "@/lib/prisma";
import {
  assertValid,
  idSchema,
  nameSchema,
  programSlotDataSchema,
} from "@/lib/validation/schemas";

export async function createProgramAction() {
  const userId = await getCurrentUserId();
  const program = await createProgram(userId);
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
  assertValid(z.number().int().min(1).max(52), cycle);
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
