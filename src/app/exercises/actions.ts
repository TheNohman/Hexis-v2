"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { createExercise, deleteExercise, updateExercise } from "@/lib/exercises/mutations";
import { addManualPR } from "@/lib/prs/detect";
import type { ExerciseType } from "@/generated/prisma/enums";
import { assertValid, exerciseTypeEnum, idSchema, nameSchema } from "@/lib/validation/schemas";

export async function createExerciseAction(formData: FormData) {
  const userId = await getCurrentUserId();

  // Equipment is posted as a JSON-stringified string[] via hidden input,
  // populated by the <EquipmentChipPicker> client component. Parse
  // defensively — empty/missing = no equipment.
  let equipment: string[] = [];
  const rawEquipment = formData.get("equipment");
  if (typeof rawEquipment === "string" && rawEquipment.trim()) {
    try {
      const parsed = JSON.parse(rawEquipment);
      if (Array.isArray(parsed)) {
        equipment = parsed
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
      }
    } catch {
      // fall through with empty array
    }
  }

  const raw = {
    name: ((formData.get("name") as string | null) ?? "").trim(),
    description: ((formData.get("description") as string | null) ?? "").trim() || undefined,
    type: formData.get("type") as string | null,
    equipment,
  };

  const schema = z.object({
    name: nameSchema,
    description: z.string().max(2000).optional(),
    type: exerciseTypeEnum,
    equipment: z.array(z.string().min(1).max(40)).max(10),
  });

  const parsed = assertValid(schema, raw);

  await createExercise(userId, {
    name: parsed.name,
    description: parsed.description,
    type: parsed.type as ExerciseType,
    equipment: parsed.equipment,
  });

  revalidatePath("/exercises");
}

export async function deleteExerciseAction(exerciseId: string) {
  assertValid(idSchema, exerciseId);
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
  data: {
    name?: string;
    description?: string | null;
    equipment?: string[];
  },
) {
  assertValid(idSchema, exerciseId);
  const schema = z.object({
    name: z.string().trim().min(1).max(500).optional(),
    description: z.string().max(2000).nullable().optional(),
    equipment: z.array(z.string().min(1).max(40)).max(10).optional(),
  });
  const parsed = assertValid(schema, data);
  const userId = await getCurrentUserId();
  await updateExercise(exerciseId, userId, parsed);
  revalidatePath("/exercises");
  revalidatePath(`/exercises/${exerciseId}`);
}
