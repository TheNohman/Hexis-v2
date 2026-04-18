"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  addIntervalTemplateBlock,
  addTemplateBlock,
  addTemplateEntry,
  bulkDeleteTemplates,
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
  toggleTemplateFavorite,
  updateTemplateDescription,
  updateTemplateEntryRest,
  updateTemplateEntryValues,
} from "@/lib/templates/mutations";
import { getTemplateById } from "@/lib/templates/queries";
import type { TemplateDetail } from "@/lib/templates/types";
import { cloneTemplate } from "@/lib/templates/clone";
import { materializeAITemplate } from "@/lib/templates/ai-create";
import { finishActiveWorkouts } from "@/lib/workouts/mutations";
import { trackEvent } from "@/lib/telemetry/track";
import { buildMentorContext } from "@/lib/mentor/context";
import { generateTemplate } from "@/lib/mentor/openai";
import { parseGeneratedTemplate } from "@/lib/mentor/parser";
import { prisma } from "@/lib/prisma";
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

export async function updateTemplateDescriptionAction(
  templateId: string,
  description: string | null,
) {
  assertValid(idSchema, templateId);
  assertValid(z.string().max(2000).nullable(), description);
  const userId = await getCurrentUserId();
  await updateTemplateDescription(templateId, userId, description);
  revalidatePath("/templates/" + templateId);
  revalidatePath("/templates");
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

export async function updateTemplateEntryValuesAction(
  templateId: string,
  entryId: string,
  values: KpiValueInput[],
) {
  assertValid(idSchema, templateId);
  assertValid(idSchema, entryId);
  assertValid(kpiValuesArraySchema, values);
  const userId = await getCurrentUserId();
  await updateTemplateEntryValues(entryId, userId, values);
  revalidatePath("/templates/" + templateId);
  // Revalidate program pages too — the inline panel on /programs/[id]
  // reads the same template detail and needs fresh values after an edit.
  revalidatePath("/programs", "layout");
}

/**
 * Fetch a single template's full detail. Used by the program-editor's inline
 * slot panel to lazy-load entries on expand (keeps the initial /programs/[id]
 * payload small).
 */
export async function getTemplateDetailAction(
  templateId: string,
): Promise<TemplateDetail | null> {
  assertValid(idSchema, templateId);
  const userId = await getCurrentUserId();
  return getTemplateById(templateId, userId);
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

// ─── AI generation ────────────────────────────────────────────────

/**
 * Ask the AI to generate a template based on user's goals + existing exercises.
 * Returns the raw JSON preview (not yet persisted) so the user can review.
 */
export async function generateAITemplateAction(goals: string): Promise<{
  error?: string;
  preview?: string;
}> {
  assertValid(z.string().max(2000), goals);
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mentorEnabled: true },
  });
  if (!user?.mentorEnabled) {
    return { error: "L'IA n'est pas activée sur ton compte." };
  }

  const context = await buildMentorContext(userId);
  const raw = await generateTemplate(context, {
    duration: 60,
    intensity: "MODERATE",
    equipment: [],
    targetZones: [],
    freeform: goals,
  });

  if (!raw) {
    return { error: "L'IA n'a pas pu générer de modèle." };
  }

  return { preview: raw };
}

const templateVariantsParamsSchema = z.object({
  duration: z.number().int().min(15).max(120),
  intensity: z.enum(["LIGHT", "MODERATE", "INTENSE"]),
  equipment: z.array(z.string().min(1).max(64)).max(20),
  targetZones: z.array(z.string().min(1).max(64)).max(20),
  freeform: z.string().max(2000),
});

export type GenerateTemplateVariantsParams = z.infer<
  typeof templateVariantsParamsSchema
>;

/**
 * Generate 3 template variants in parallel with slight temperature variation.
 * Returns as many raw JSON strings as succeeded (≥1 required).
 */
export async function generateAITemplateVariantsAction(
  params: GenerateTemplateVariantsParams,
): Promise<{ previews: string[]; error?: string }> {
  const parsed = assertValid(templateVariantsParamsSchema, params);
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mentorEnabled: true },
  });
  if (!user?.mentorEnabled) {
    return { previews: [], error: "L'IA n'est pas activée sur ton compte." };
  }

  if (parsed.equipment.length === 0 && parsed.targetZones.length === 0 && !parsed.freeform.trim()) {
    return {
      previews: [],
      error: "Ajoute au moins une zone, un équipement, ou des précisions libres.",
    };
  }

  const context = await buildMentorContext(userId);

  const temperatures = [0.6, 0.75, 0.9];
  const settled = await Promise.allSettled(
    temperatures.map((t) => generateTemplate(context, parsed, t)),
  );

  const previews = settled
    .filter(
      (r): r is PromiseFulfilledResult<string> =>
        r.status === "fulfilled" && typeof r.value === "string" && r.value.length > 0,
    )
    .map((r) => r.value)
    // Keep only those that parse successfully.
    .filter((raw) => parseGeneratedTemplate(raw) !== null);

  if (previews.length === 0) {
    return { previews: [], error: "L'IA n'a pas pu générer de variante exploitable. Réessaie." };
  }

  return { previews };
}

/**
 * Confirm and persist an AI-generated template from its raw JSON preview.
 */
export async function confirmAITemplateAction(rawJson: string): Promise<{
  error?: string;
}> {
  assertValid(z.string().max(100000), rawJson);
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mentorEnabled: true },
  });
  if (!user?.mentorEnabled) {
    return { error: "L'IA n'est pas activée sur ton compte." };
  }

  const parsed = parseGeneratedTemplate(rawJson);
  if (!parsed) {
    return { error: "Impossible de lire le modèle généré." };
  }

  let templateId: string;
  try {
    templateId = await materializeAITemplate(userId, parsed);
  } catch (e) {
    if (e instanceof Error && e.message.includes("Aucun exercice")) {
      return { error: e.message };
    }
    throw e;
  }

  await trackEvent(userId, "template_created", { templateId, source: "ai" });
  revalidatePath("/templates");
  redirect(`/templates/${templateId}`);
}

export async function toggleTemplateFavoriteAction(templateId: string) {
  assertValid(idSchema, templateId);
  const userId = await getCurrentUserId();
  await toggleTemplateFavorite(templateId, userId);
  revalidatePath("/templates");
  revalidatePath("/templates/" + templateId);
  revalidatePath("/planning");
}

export async function bulkDeleteTemplatesAction(templateIds: string[]) {
  assertValid(z.array(idSchema).min(1).max(50), templateIds);
  const userId = await getCurrentUserId();
  await bulkDeleteTemplates(templateIds, userId);
  revalidatePath("/templates");
  revalidatePath("/planning");
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
