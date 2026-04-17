"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  addIntervalTemplateBlock,
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
import { cloneTemplate } from "@/lib/templates/clone";
import { finishActiveWorkouts } from "@/lib/workouts/mutations";
import { trackEvent } from "@/lib/telemetry/track";
import type { KpiValueInput } from "@/lib/workouts/types";
import {
  assertValid,
  idSchema,
  intervalBlockSchema,
  kpiValuesArraySchema,
  nameSchema,
} from "@/lib/validation/schemas";

const idListSchema = z.array(idSchema).max(200);

export async function createTemplateAction() {
  const userId = await getCurrentUserId();
  const template = await createTemplate(userId);
  await trackEvent(userId, "template_created", { templateId: template.id });
  redirect("/templates/" + template.id);
}

export async function deleteTemplateAction(templateId: string) {
  assertValid(idSchema, templateId);
  const userId = await getCurrentUserId();
  await deleteTemplate(templateId, userId);
  revalidatePath("/templates");
  redirect("/templates");
}

export async function renameTemplateAction(templateId: string, name: string) {
  assertValid(idSchema, templateId);
  assertValid(nameSchema, name);
  const userId = await getCurrentUserId();
  await renameTemplate(templateId, userId, name);
  revalidatePath("/templates/" + templateId);
}

export async function addTemplateBlockAction(templateId: string, name: string) {
  assertValid(idSchema, templateId);
  assertValid(nameSchema, name);
  const userId = await getCurrentUserId();
  await addTemplateBlock(templateId, userId, name);
  revalidatePath("/templates/" + templateId);
}

export async function addIntervalTemplateBlockAction(
  templateId: string,
  data: {
    name: string;
    format: "TABATA" | "INTERVALS";
    workSecs: number;
    restSecs: number;
    roundCount: number;
    playbackOrder: "CYCLE" | "SAME" | "CUSTOM";
    exerciseIds: string[];
    customSequence?: string[];
  },
) {
  assertValid(idSchema, templateId);
  const parsed = assertValid(intervalBlockSchema, data);
  const userId = await getCurrentUserId();
  await addIntervalTemplateBlock(templateId, userId, parsed);
  revalidatePath("/templates/" + templateId);
}

export async function renameTemplateBlockAction(
  templateId: string,
  blockId: string,
  name: string,
) {
  assertValid(idSchema, templateId);
  assertValid(idSchema, blockId);
  assertValid(nameSchema, name);
  const userId = await getCurrentUserId();
  await renameTemplateBlock(blockId, userId, name);
  revalidatePath("/templates/" + templateId);
}

export async function deleteTemplateBlockAction(templateId: string, blockId: string) {
  assertValid(idSchema, templateId);
  assertValid(idSchema, blockId);
  const userId = await getCurrentUserId();
  await deleteTemplateBlock(blockId, userId);
  revalidatePath("/templates/" + templateId);
}

export async function reorderTemplateBlocksAction(
  templateId: string,
  orderedBlockIds: string[],
) {
  assertValid(idSchema, templateId);
  assertValid(idListSchema, orderedBlockIds);
  const userId = await getCurrentUserId();
  await reorderTemplateBlocks(templateId, userId, orderedBlockIds);
  revalidatePath("/templates/" + templateId);
}

export async function addTemplateEntryAction(
  templateId: string,
  blockId: string,
  exerciseId: string,
  values: KpiValueInput[],
  restDurationSecs?: number | null,
) {
  assertValid(idSchema, templateId);
  assertValid(idSchema, blockId);
  assertValid(idSchema, exerciseId);
  assertValid(kpiValuesArraySchema, values);
  if (restDurationSecs !== undefined && restDurationSecs !== null)
    assertValid(z.number().int().min(0).max(3600), restDurationSecs);
  const userId = await getCurrentUserId();
  await addTemplateEntry(blockId, userId, {
    exerciseId,
    values,
    restDurationSecs,
  });
  revalidatePath("/templates/" + templateId);
}

export async function duplicateTemplateEntryAction(templateId: string, entryId: string) {
  assertValid(idSchema, templateId);
  assertValid(idSchema, entryId);
  const userId = await getCurrentUserId();
  await duplicateTemplateEntry(entryId, userId);
  revalidatePath("/templates/" + templateId);
}

export async function deleteTemplateEntryAction(templateId: string, entryId: string) {
  assertValid(idSchema, templateId);
  assertValid(idSchema, entryId);
  const userId = await getCurrentUserId();
  await deleteTemplateEntry(entryId, userId);
  revalidatePath("/templates/" + templateId);
}

export async function reorderTemplateEntriesAction(
  templateId: string,
  blockId: string,
  orderedEntryIds: string[],
) {
  assertValid(idSchema, templateId);
  assertValid(idSchema, blockId);
  assertValid(idListSchema, orderedEntryIds);
  const userId = await getCurrentUserId();
  await reorderTemplateEntries(blockId, userId, orderedEntryIds);
  revalidatePath("/templates/" + templateId);
}

export async function updateTemplateEntryRestAction(
  templateId: string,
  entryId: string,
  restDurationSecs: number | null,
) {
  assertValid(idSchema, templateId);
  assertValid(idSchema, entryId);
  if (restDurationSecs !== null)
    assertValid(z.number().int().min(0).max(3600), restDurationSecs);
  const userId = await getCurrentUserId();
  await updateTemplateEntryRest(entryId, userId, restDurationSecs);
  revalidatePath("/templates/" + templateId);
}

export async function startSessionFromTemplateAction(templateId: string) {
  assertValid(idSchema, templateId);
  const userId = await getCurrentUserId();
  await finishActiveWorkouts(userId);
  const workout = await createWorkoutFromTemplate(templateId, userId);
  redirect("/sessions/" + workout.id);
}

export async function cloneTemplateAction(templateId: string) {
  assertValid(idSchema, templateId);
  const userId = await getCurrentUserId();
  const newTemplate = await cloneTemplate(templateId, userId);
  revalidatePath("/templates");
  redirect("/templates/" + newTemplate.id);
}

export async function updateTemplateTagsAction(templateId: string, tags: string[]) {
  assertValid(idSchema, templateId);
  assertValid(z.array(z.string().max(64)).max(50), tags);
  const userId = await getCurrentUserId();
  const { prisma } = await import("@/lib/prisma");
  const template = await prisma.workoutTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.userId !== userId) throw new Error("Forbidden");
  await prisma.workoutTemplate.update({ where: { id: templateId }, data: { tags } });
  revalidatePath("/templates/" + templateId);
  revalidatePath("/templates");
}
