"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  addBlock,
  addEntry,
  addSetAfter,
  bulkValidatePlannedEntries,
  cloneWorkoutAsPlanned,
  createWorkout,
  deleteBlock,
  deleteEntry,
  duplicateEntry,
  finishActiveWorkouts,
  finishWorkout,
  incrementCompletedRounds,
  renameBlock,
  reorderBlocks,
  reorderEntries,
  resetInterval,
  skipEntry,
  updateEntryValues,
  updateEntryNotes,
  updateWorkoutName,
  updateWorkoutNotes,
  updateWorkoutStartedAt,
  toggleEntryWarmup,
  validateEntry,
} from "@/lib/workouts/mutations";
import { createTemplateFromWorkout } from "@/lib/templates/from-workout";
import { clearAdviceCache } from "@/lib/mentor/advice";
import { detectAndRecordPRs } from "@/lib/prs/detect";
import type { KpiValueInput } from "@/lib/workouts/types";

export async function createWorkoutAction() {
  const userId = await getCurrentUserId();
  await finishActiveWorkouts(userId);
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

export async function reorderBlocksAction(
  workoutId: string,
  orderedBlockIds: string[],
) {
  const userId = await getCurrentUserId();
  await reorderBlocks(workoutId, userId, orderedBlockIds);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function reorderEntriesAction(
  workoutId: string,
  blockId: string,
  orderedEntryIds: string[],
) {
  const userId = await getCurrentUserId();
  await reorderEntries(blockId, userId, orderedEntryIds);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function validateEntryAction(
  workoutId: string,
  entryId: string,
  values?: KpiValueInput[],
) {
  const userId = await getCurrentUserId();
  await validateEntry(entryId, userId, values);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function skipEntryAction(workoutId: string, entryId: string) {
  const userId = await getCurrentUserId();
  await skipEntry(entryId, userId);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function updateEntryValuesAction(
  workoutId: string,
  entryId: string,
  values: KpiValueInput[],
) {
  const userId = await getCurrentUserId();
  await updateEntryValues(entryId, userId, values);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function addSetAction(
  workoutId: string,
  blockId: string,
  exerciseId: string,
  afterEntryId: string,
  values?: KpiValueInput[],
) {
  const userId = await getCurrentUserId();
  await addSetAfter(blockId, userId, {
    exerciseId,
    afterEntryId,
    values,
  });
  revalidatePath(`/sessions/${workoutId}`);
}

export async function updateNotesAction(workoutId: string, notes: string) {
  const userId = await getCurrentUserId();
  await updateWorkoutNotes(workoutId, userId, notes || null);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function finishWorkoutAction(workoutId: string) {
  const userId = await getCurrentUserId();
  await finishWorkout(workoutId, userId);

  // Scan the finished session for new personal records. Non-blocking
  // in the sense that a detection failure doesn't prevent the redirect.
  let prCount = 0;
  try {
    const prs = await detectAndRecordPRs(workoutId, userId);
    prCount = prs.length;
  } catch (err) {
    console.error("[finishWorkout] PR detection failed", err);
  }

  // Session just ended → the next mentor advice should reflect it.
  await clearAdviceCache(userId);
  revalidatePath("/dashboard");
  // Encode the PR count in the URL so the dashboard can surface a
  // celebratory toast on the next render.
  redirect(prCount > 0 ? `/dashboard?prs=${prCount}` : "/dashboard");
}

/**
 * Mark every PLANNED entry of a workout as DONE, carrying planned values
 * forward. Used for retro entry ("logger ma séance comme prévue").
 * Does NOT finish the workout — the user still terminates it explicitly.
 */
export async function bulkValidateWorkoutAction(workoutId: string) {
  const userId = await getCurrentUserId();
  const result = await bulkValidatePlannedEntries(workoutId, userId);
  revalidatePath(`/sessions/${workoutId}`);
  return result;
}

/**
 * Backdate (or forward-date) a workout. Used when the user logged today
 * but actually trained on a different day.
 */
export async function setWorkoutStartedAtAction(
  workoutId: string,
  isoDateTime: string,
) {
  const userId = await getCurrentUserId();
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  await updateWorkoutStartedAt(workoutId, userId, parsed);
  revalidatePath(`/sessions/${workoutId}`);
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

/**
 * Clone a past workout as a new PLANNED one. Used from the history list
 * with a "Refaire cette séance" button. Optional weightDeltaKg bumps
 * strength-exercise planned weights (progressive overload).
 */
export async function cloneWorkoutAction(
  sourceWorkoutId: string,
  weightDeltaKg?: number,
) {
  const userId = await getCurrentUserId();
  const workout = await cloneWorkoutAsPlanned(sourceWorkoutId, userId, {
    weightDeltaKg,
  });
  revalidatePath("/dashboard");
  redirect(`/sessions/${workout.id}`);
}

/**
 * Bump the completedRounds counter on an interval block. Called by the
 * IntervalRunner once per round transition. Server-side bounded by
 * roundCount so the UI can be fire-and-forget.
 */
export async function completeIntervalRoundAction(
  workoutId: string,
  blockId: string,
) {
  const userId = await getCurrentUserId();
  const block = await incrementCompletedRounds(blockId, userId);
  revalidatePath(`/sessions/${workoutId}`);
  return { completedRounds: block.completedRounds };
}

/**
 * Reset the rounds counter on an interval block (user wants to redo
 * the circuit from the top).
 */
export async function resetIntervalBlockAction(
  workoutId: string,
  blockId: string,
) {
  const userId = await getCurrentUserId();
  await resetInterval(blockId, userId);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function updateEntryNotesAction(
  workoutId: string,
  entryId: string,
  notes: string | null,
) {
  const userId = await getCurrentUserId();
  await updateEntryNotes(entryId, userId, notes);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function toggleEntryWarmupAction(
  workoutId: string,
  entryId: string,
) {
  const userId = await getCurrentUserId();
  await toggleEntryWarmup(entryId, userId);
  revalidatePath(`/sessions/${workoutId}`);
}

export async function saveAsTemplateAction(workoutId: string, name?: string) {
  const userId = await getCurrentUserId();
  const template = await createTemplateFromWorkout(workoutId, userId, name);
  revalidatePath("/templates");
  redirect(`/templates/${template.id}`);
}
