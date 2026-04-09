"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  addBlock,
  addEntry,
  createWorkout,
  deleteBlock,
  deleteEntry,
  duplicateEntry,
  finishWorkout,
  renameBlock,
  updateWorkoutName,
} from "@/lib/workouts/mutations";
import type { KpiValueInput } from "@/lib/workouts/types";

export async function createWorkoutAction() {
  const userId = await getCurrentUserId();
  const workout = await createWorkout(userId);
  redirect(`/sessions/${workout.id}`);
}

export async function renameWorkoutAction(workoutId: string, name: string) {
  const userId = await getCurrentUserId();
  await updateWorkoutName(workoutId, userId, name);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function addBlockAction(workoutId: string, name: string) {
  const userId = await getCurrentUserId();
  await addBlock(workoutId, userId, name);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function renameBlockAction(
  workoutId: string,
  blockId: string,
  name: string,
) {
  const userId = await getCurrentUserId();
  await renameBlock(blockId, userId, name);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function deleteBlockAction(workoutId: string, blockId: string) {
  const userId = await getCurrentUserId();
  await deleteBlock(blockId, userId);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function addEntryAction(
  workoutId: string,
  blockId: string,
  exerciseId: string,
  values: KpiValueInput[],
) {
  const userId = await getCurrentUserId();
  await addEntry(blockId, userId, { exerciseId, values });
  revalidatePath(`/sessions/${workoutId}`);
}

export async function duplicateEntryAction(
  workoutId: string,
  entryId: string,
) {
  const userId = await getCurrentUserId();
  await duplicateEntry(entryId, userId);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function deleteEntryAction(workoutId: string, entryId: string) {
  const userId = await getCurrentUserId();
  await deleteEntry(entryId, userId);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function finishWorkoutAction(workoutId: string) {
  const userId = await getCurrentUserId();
  await finishWorkout(workoutId, userId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
