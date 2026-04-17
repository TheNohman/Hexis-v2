"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { createExercise, deleteExercise, updateExercise } from "@/lib/exercises/mutations";
import { addManualPR } from "@/lib/prs/detect";
import type { ExerciseType } from "@/generated/prisma/enums";

const VALID_TYPES = new Set<ExerciseType>([
  "STRENGTH",
  "BODYWEIGHT",
  "CARDIO",
  "MOBILITY",
  "REST",
]);

export async function createExerciseAction(formData: FormData) {
  const userId = await getCurrentUserId();

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) throw new Error("Le nom est requis");

  const description = (formData.get("description") as string | null)?.trim() || undefined;
  const type = formData.get("type") as string;

  if (!VALID_TYPES.has(type as ExerciseType)) {
    throw new Error("Type d'exercice invalide");
  }

  await createExercise(userId, {
    name,
    description,
    type: type as ExerciseType,
  });

  revalidatePath("/exercises");
}

export async function deleteExerciseAction(exerciseId: string) {
  const userId = await getCurrentUserId();
  await deleteExercise(exerciseId, userId);
  revalidatePath("/exercises");
}

export async function addManualPRAction(input: {
  exerciseId: string;
  weightKg: number;
  reps: number;
  achievedAt?: Date;
}) {
  const userId = await getCurrentUserId();
  await addManualPR(userId, input);
  revalidatePath(`/exercises/${input.exerciseId}`);
}

export async function updateExerciseAction(
  exerciseId: string,
  data: { name?: string; description?: string | null },
) {
  const userId = await getCurrentUserId();
  await updateExercise(exerciseId, userId, data);
  revalidatePath("/exercises");
}
