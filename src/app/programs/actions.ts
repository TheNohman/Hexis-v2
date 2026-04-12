"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { prisma } from "@/lib/prisma";

export async function createProgramAction() {
  const userId = await getCurrentUserId();
  const program = await createProgram(userId);
  redirect(`/programs/${program.id}`);
}

export async function deleteProgramAction(programId: string) {
  const userId = await getCurrentUserId();
  await deleteProgram(programId, userId);
  revalidatePath("/planning");
  redirect("/planning");
}

export async function renameProgramAction(programId: string, name: string) {
  const userId = await getCurrentUserId();
  await renameProgram(programId, userId, name);
  revalidatePath(`/programs/${programId}`);
  revalidatePath("/planning");
}

export async function updateCycleCountAction(programId: string, cycleCount: number) {
  const userId = await getCurrentUserId();
  await updateCycleCount(programId, userId, cycleCount);
  revalidatePath(`/programs/${programId}`);
}

export async function updateCycleDaysAction(programId: string, cycleDays: number) {
  const userId = await getCurrentUserId();
  await updateCycleDays(programId, userId, cycleDays);
  revalidatePath(`/programs/${programId}`);
}

export async function toggleProgramActiveAction(programId: string) {
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
  const userId = await getCurrentUserId();
  await addSlot(programId, userId, cycle, data);
  revalidatePath(`/programs/${programId}`);
}

export async function updateSlotAction(
  slotId: string,
  data: { templateId?: string | null; day?: number; startTime?: string | null; label?: string | null },
) {
  const userId = await getCurrentUserId();
  await updateSlot(slotId, userId, data);
  revalidatePath("/programs");
}

export async function deleteSlotAction(slotId: string) {
  const userId = await getCurrentUserId();
  await deleteSlot(slotId, userId);
  revalidatePath("/programs");
}

export async function startProgramWorkoutAction() {
  const userId = await getCurrentUserId();
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
  const userId = await getCurrentUserId();

  // Check if user has mentor enabled (paid feature)
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
