"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  createProgram,
  deleteProgram,
  renameProgram,
  updateWeekCount,
  toggleProgramActive,
  upsertSlot,
  deleteSlot,
  createWorkoutFromProgramSlot,
  skipCurrentSlot,
} from "@/lib/programs/mutations";

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

export async function updateWeekCountAction(programId: string, weekCount: number) {
  const userId = await getCurrentUserId();
  await updateWeekCount(programId, userId, weekCount);
  revalidatePath(`/programs/${programId}`);
}

export async function toggleProgramActiveAction(programId: string) {
  const userId = await getCurrentUserId();
  await toggleProgramActive(programId, userId);
  revalidatePath(`/programs/${programId}`);
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function upsertSlotAction(
  programId: string,
  week: number,
  day: number,
  data: { templateId?: string | null; label?: string | null; startTime?: string | null },
) {
  const userId = await getCurrentUserId();
  await upsertSlot(programId, userId, week, day, data);
  revalidatePath(`/programs/${programId}`);
}

export async function deleteSlotAction(programId: string, week: number, day: number) {
  const userId = await getCurrentUserId();
  await deleteSlot(programId, userId, week, day);
  revalidatePath(`/programs/${programId}`);
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
