"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { computeDurationMins } from "@/lib/format";
import {
  addBlock,
  addEntry,
  addSetAfter,
  bulkValidatePlannedEntries,
  cloneWorkoutAsPlanned,
  createWorkout,
  deleteBlock,
  deleteEntry,
  deleteWorkout,
  duplicateEntry,
  finishActiveWorkouts,
  finishWorkout,
  unfinishWorkout,
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
import { trackEvent } from "@/lib/telemetry/track";
import { prisma } from "@/lib/prisma";
import type { KpiValueInput } from "@/lib/workouts/types";
import {
  assertValid,
  idSchema,
  isoDateSchema,
  kpiValuesArraySchema,
  nameSchema,
  notesSchema,
  optionalNameSchema,
} from "@/lib/validation/schemas";

const idListSchema = z.array(idSchema).max(200);

export async function createWorkoutAction() {
  const userId = await getCurrentUserId();
  await finishActiveWorkouts(userId);
  const workout = await createWorkout(userId);
  await trackEvent(userId, "workout_created", { workoutId: workout.id });
  redirect("/sessions/" + workout.id);
}

export async function renameWorkoutAction(workoutId: string, name: string) {
  assertValid(idSchema, workoutId);
  assertValid(nameSchema, name);
  const userId = await getCurrentUserId();
  await updateWorkoutName(workoutId, userId, name);
  revalidatePath("/sessions/" + workoutId);
}

export async function addBlockAction(workoutId: string, name: string) {
  assertValid(idSchema, workoutId);
  assertValid(nameSchema, name);
  const userId = await getCurrentUserId();
  await addBlock(workoutId, userId, name);
  revalidatePath("/sessions/" + workoutId);
}

export async function renameBlockAction(workoutId: string, blockId: string, name: string) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, blockId);
  assertValid(nameSchema, name);
  const userId = await getCurrentUserId();
  await renameBlock(blockId, userId, name);
  revalidatePath("/sessions/" + workoutId);
}

export async function deleteBlockAction(workoutId: string, blockId: string) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, blockId);
  const userId = await getCurrentUserId();
  await deleteBlock(blockId, userId);
  revalidatePath("/sessions/" + workoutId);
}

export async function addEntryAction(
  workoutId: string,
  blockId: string,
  exerciseId: string,
  values: KpiValueInput[],
) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, blockId);
  assertValid(idSchema, exerciseId);
  assertValid(kpiValuesArraySchema, values);
  const userId = await getCurrentUserId();
  await addEntry(blockId, userId, { exerciseId, values });
  revalidatePath("/sessions/" + workoutId);
}

export async function duplicateEntryAction(workoutId: string, entryId: string) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, entryId);
  const userId = await getCurrentUserId();
  await duplicateEntry(entryId, userId);
  revalidatePath("/sessions/" + workoutId);
}

export async function deleteEntryAction(workoutId: string, entryId: string) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, entryId);
  const userId = await getCurrentUserId();
  await deleteEntry(entryId, userId);
  revalidatePath("/sessions/" + workoutId);
}

export async function reorderBlocksAction(workoutId: string, orderedBlockIds: string[]) {
  assertValid(idSchema, workoutId);
  assertValid(idListSchema, orderedBlockIds);
  const userId = await getCurrentUserId();
  await reorderBlocks(workoutId, userId, orderedBlockIds);
  revalidatePath("/sessions/" + workoutId);
}

export async function reorderEntriesAction(
  workoutId: string,
  blockId: string,
  orderedEntryIds: string[],
) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, blockId);
  assertValid(idListSchema, orderedEntryIds);
  const userId = await getCurrentUserId();
  await reorderEntries(blockId, userId, orderedEntryIds);
  revalidatePath("/sessions/" + workoutId);
}

export async function validateEntryAction(
  workoutId: string,
  entryId: string,
  values?: KpiValueInput[],
) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, entryId);
  if (values !== undefined) assertValid(kpiValuesArraySchema, values);
  const userId = await getCurrentUserId();
  await validateEntry(entryId, userId, values);
  revalidatePath("/sessions/" + workoutId);
}

export async function skipEntryAction(workoutId: string, entryId: string) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, entryId);
  const userId = await getCurrentUserId();
  await skipEntry(entryId, userId);
  revalidatePath("/sessions/" + workoutId);
}

export async function updateEntryValuesAction(
  workoutId: string,
  entryId: string,
  values: KpiValueInput[],
) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, entryId);
  assertValid(kpiValuesArraySchema, values);
  const userId = await getCurrentUserId();
  await updateEntryValues(entryId, userId, values);
  revalidatePath("/sessions/" + workoutId);
}

export async function addSetAction(
  workoutId: string,
  blockId: string,
  exerciseId: string,
  afterEntryId: string,
  values?: KpiValueInput[],
) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, blockId);
  assertValid(idSchema, exerciseId);
  assertValid(idSchema, afterEntryId);
  if (values !== undefined) assertValid(kpiValuesArraySchema, values);
  const userId = await getCurrentUserId();
  await addSetAfter(blockId, userId, { exerciseId, afterEntryId, values });
  revalidatePath("/sessions/" + workoutId);
}

export async function updateNotesAction(workoutId: string, notes: string) {
  assertValid(idSchema, workoutId);
  assertValid(notesSchema, notes);
  const userId = await getCurrentUserId();
  await updateWorkoutNotes(workoutId, userId, notes || null);
  revalidatePath("/sessions/" + workoutId);
}

export async function finishWorkoutAction(workoutId: string) {
  assertValid(idSchema, workoutId);
  const userId = await getCurrentUserId();
  await finishWorkout(workoutId, userId);
  try {
    await detectAndRecordPRs(workoutId, userId);
  } catch (err) {
    console.error("[finishWorkout] PR detection failed", err);
  }
  // Calcule les metrics AVANT le redirect — sinon `redirect()` throws et
  // on perd tout (la télémétrie n'est jamais appelée).
  try {
    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId },
      include: {
        blocks: {
          include: {
            entries: {
              where: { status: "DONE", isWarmup: false },
              include: {
                values: { include: { kpiDefinition: { select: { slug: true } } } },
              },
            },
          },
        },
      },
    });
    let durationMins: number | null = null;
    let totalSets = 0;
    let totalVolume = 0;
    if (workout) {
      durationMins = computeDurationMins(workout.startedAt, workout.finishedAt);
      for (const block of workout.blocks) {
        for (const entry of block.entries) {
          totalSets += 1;
          const weight = entry.values.find((v) => v.kpiDefinition.slug === "weight_kg")
            ?.valueNumeric;
          const reps = entry.values.find((v) => v.kpiDefinition.slug === "reps")?.valueNumeric;
          if (weight != null && reps != null) totalVolume += weight * reps;
        }
      }
    }
    await trackEvent(userId, "workout_finished", {
      workoutId,
      durationMins,
      totalSets,
      totalVolume: Math.round(totalVolume),
    });
  } catch (err) {
    console.error("[finishWorkout] telemetry metrics failed", err);
  }
  await clearAdviceCache(userId);
  revalidatePath("/dashboard");
  redirect("/sessions/" + workoutId + "/summary");
}

export async function bulkValidateWorkoutAction(workoutId: string) {
  assertValid(idSchema, workoutId);
  const userId = await getCurrentUserId();
  const result = await bulkValidatePlannedEntries(workoutId, userId);
  revalidatePath("/sessions/" + workoutId);
  return result;
}

export async function setWorkoutStartedAtAction(workoutId: string, isoDateTime: string) {
  assertValid(idSchema, workoutId);
  assertValid(isoDateSchema, isoDateTime);
  const userId = await getCurrentUserId();
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  await updateWorkoutStartedAt(workoutId, userId, parsed);
  revalidatePath("/sessions/" + workoutId);
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

export async function cloneWorkoutAction(sourceWorkoutId: string, weightDeltaKg?: number) {
  assertValid(idSchema, sourceWorkoutId);
  if (weightDeltaKg !== undefined)
    assertValid(z.number().finite().min(-500).max(500), weightDeltaKg);
  const userId = await getCurrentUserId();
  const workout = await cloneWorkoutAsPlanned(sourceWorkoutId, userId, { weightDeltaKg });
  revalidatePath("/dashboard");
  redirect("/sessions/" + workout.id);
}

export async function completeIntervalRoundAction(workoutId: string, blockId: string) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, blockId);
  const userId = await getCurrentUserId();
  const block = await incrementCompletedRounds(blockId, userId);
  // Track seulement la fin du HIIT (pas chaque round — trop bruyant).
  const roundCount = block.intervalConfig?.roundCount ?? null;
  if (roundCount != null && block.completedRounds >= roundCount) {
    await trackEvent(userId, "hiit_completed", {
      workoutId,
      blockId,
      rounds: roundCount,
    });
  }
  revalidatePath("/sessions/" + workoutId);
  return { completedRounds: block.completedRounds };
}

export async function resetIntervalBlockAction(workoutId: string, blockId: string) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, blockId);
  const userId = await getCurrentUserId();
  await resetInterval(blockId, userId);
  revalidatePath("/sessions/" + workoutId);
}

export async function updateEntryNotesAction(
  workoutId: string,
  entryId: string,
  notes: string | null,
) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, entryId);
  if (notes !== null) assertValid(notesSchema, notes);
  const userId = await getCurrentUserId();
  await updateEntryNotes(entryId, userId, notes);
  revalidatePath("/sessions/" + workoutId);
}

export async function toggleEntryWarmupAction(workoutId: string, entryId: string) {
  assertValid(idSchema, workoutId);
  assertValid(idSchema, entryId);
  const userId = await getCurrentUserId();
  await toggleEntryWarmup(entryId, userId);
  revalidatePath("/sessions/" + workoutId);
}

/**
 * Delete a workout entirely (cascade through blocks/entries/values).
 * Redirects to /history with a flash query param since a toast would be
 * lost across the redirect.
 */
export async function deleteWorkoutAction(workoutId: string) {
  assertValid(idSchema, workoutId);
  const userId = await getCurrentUserId();
  await deleteWorkout(workoutId, userId);
  // History changed → drop cached advice.
  await clearAdviceCache(userId);
  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/history?flash=deleted");
}

/**
 * Re-open a finished workout. Used when a session was terminated by
 * mistake. Finishes any other active workout first to preserve the
 * "one active workout at a time" invariant.
 */
export async function unfinishWorkoutAction(workoutId: string) {
  assertValid(idSchema, workoutId);
  const userId = await getCurrentUserId();
  await unfinishWorkout(workoutId, userId);
  await clearAdviceCache(userId);
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/sessions/${workoutId}`);
  redirect(`/sessions/${workoutId}`);
}

export async function saveAsTemplateAction(workoutId: string, name?: string) {
  assertValid(idSchema, workoutId);
  if (name !== undefined) assertValid(optionalNameSchema, name);
  const userId = await getCurrentUserId();
  const template = await createTemplateFromWorkout(workoutId, userId, name);
  revalidatePath("/templates");
  redirect("/templates/" + template.id);
}
