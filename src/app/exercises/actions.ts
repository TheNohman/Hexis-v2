"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { createExercise, deleteExercise, updateExercise } from "@/lib/exercises/mutations";
import type { ExerciseType } from "@/generated/prisma/enums";
import { assertValid, exerciseTypeEnum, idSchema, nameSchema } from "@/lib/validation/schemas";

export async function createExerciseAction(formData: FormData) {
  const userId = await getCurrentUserId();

  const raw = {
    name: ((formData.get("name") as string | null) ?? "").trim(),
    description: ((formData.get("description") as string | null) ?? "").trim() || undefined,
    type: formData.get("type") as string | null,
  };

  const schema = z.object({
    name: nameSchema,
    description: z.string().max(2000).optional(),
    type: exerciseTypeEnum,
  });

  const parsed = assertValid(schema, raw);

  await createExercise(userId, {
    name: parsed.name,
    description: parsed.description,
    type: parsed.type as ExerciseType,
  });

  revalidatePath("/exercises");
}

export async function deleteExerciseAction(exerciseId: string) {
  assertValid(idSchema, exerciseId);
  const userId = await getCurrentUserId();
  await deleteExercise(exerciseId, userId);
  revalidatePath("/exercises");
}

export async function updateExerciseAction(
  exerciseId: string,
  data: { name?: string; description?: string | null },
) {
  assertValid(idSchema, exerciseId);
  const schema = z.object({
    name: z.string().trim().min(1).max(500).optional(),
    description: z.string().max(2000).nullable().optional(),
  });
  const parsed = assertValid(schema, data);
  const userId = await getCurrentUserId();
  await updateExercise(exerciseId, userId, parsed);
  revalidatePath("/exercises");
}
