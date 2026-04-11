"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  addTemplateBlock,
  addTemplateEntry,
  createTemplate,
  createWorkoutFromTemplate,
  deleteTemplate,
  deleteTemplateBlock,
  deleteTemplateEntry,
  duplicateTemplateEntry,
  renameTemplate,
  renameTemplateBlock,
  reorderTemplateBlocks,
  reorderTemplateEntries,
  updateTemplateEntryRest,
} from "@/lib/templates/mutations";
import type { KpiValueInput } from "@/lib/workouts/types";

export async function createTemplateAction() {
  const userId = await getCurrentUserId();
  const template = await createTemplate(userId);
  redirect(`/templates/${template.id}`);
}

export async function deleteTemplateAction(templateId: string) {
  const userId = await getCurrentUserId();
  await deleteTemplate(templateId, userId);
  revalidatePath("/templates");
  redirect("/templates");
}

export async function renameTemplateAction(
  templateId: string,
  name: string,
) {
  const userId = await getCurrentUserId();
  await renameTemplate(templateId, userId, name);
  revalidatePath(`/templates/${templateId}`);
}

export async function addTemplateBlockAction(
  templateId: string,
  name: string,
) {
  const userId = await getCurrentUserId();
  await addTemplateBlock(templateId, userId, name);
  revalidatePath(`/templates/${templateId}`);
}

export async function renameTemplateBlockAction(
  templateId: string,
  blockId: string,
  name: string,
) {
  const userId = await getCurrentUserId();
  await renameTemplateBlock(blockId, userId, name);
  revalidatePath(`/templates/${templateId}`);
}

export async function deleteTemplateBlockAction(
  templateId: string,
  blockId: string,
) {
  const userId = await getCurrentUserId();
  await deleteTemplateBlock(blockId, userId);
  revalidatePath(`/templates/${templateId}`);
}

export async function reorderTemplateBlocksAction(
  templateId: string,
  orderedBlockIds: string[],
) {
  const userId = await getCurrentUserId();
  await reorderTemplateBlocks(templateId, userId, orderedBlockIds);
  revalidatePath(`/templates/${templateId}`);
}

export async function addTemplateEntryAction(
  templateId: string,
  blockId: string,
  exerciseId: string,
  values: KpiValueInput[],
  restDurationSecs?: number | null,
) {
  const userId = await getCurrentUserId();
  await addTemplateEntry(blockId, userId, {
    exerciseId,
    values,
    restDurationSecs,
  });
  revalidatePath(`/templates/${templateId}`);
}

export async function duplicateTemplateEntryAction(
  templateId: string,
  entryId: string,
) {
  const userId = await getCurrentUserId();
  await duplicateTemplateEntry(entryId, userId);
  revalidatePath(`/templates/${templateId}`);
}

export async function deleteTemplateEntryAction(
  templateId: string,
  entryId: string,
) {
  const userId = await getCurrentUserId();
  await deleteTemplateEntry(entryId, userId);
  revalidatePath(`/templates/${templateId}`);
}

export async function reorderTemplateEntriesAction(
  templateId: string,
  blockId: string,
  orderedEntryIds: string[],
) {
  const userId = await getCurrentUserId();
  await reorderTemplateEntries(blockId, userId, orderedEntryIds);
  revalidatePath(`/templates/${templateId}`);
}

export async function updateTemplateEntryRestAction(
  templateId: string,
  entryId: string,
  restDurationSecs: number | null,
) {
  const userId = await getCurrentUserId();
  await updateTemplateEntryRest(entryId, userId, restDurationSecs);
  revalidatePath(`/templates/${templateId}`);
}

export async function startSessionFromTemplateAction(templateId: string) {
  const userId = await getCurrentUserId();
  const workout = await createWorkoutFromTemplate(templateId, userId);
  redirect(`/sessions/${workout.id}`);
}
