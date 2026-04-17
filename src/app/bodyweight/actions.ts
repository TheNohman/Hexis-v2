"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertBodyWeight, deleteBodyWeight } from "@/lib/bodyweight/mutations";
import { assertValid, bodyWeightInputSchema, idSchema } from "@/lib/validation/schemas";

const REVALIDATE_PATHS = ["/profile", "/profile/poids", "/profile/mesures", "/stats"];

function revalidateAll() {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
}

export async function addBodyWeightAction(data: {
  date: string;
  weightKg: number;
  notes?: string;
}) {
  const parsed = assertValid(bodyWeightInputSchema, data);
  const userId = await getCurrentUserId();
  await upsertBodyWeight(userId, {
    date: new Date(parsed.date),
    weightKg: parsed.weightKg,
    notes: parsed.notes ?? null,
  });
  revalidateAll();
}

export async function deleteBodyWeightAction(entryId: string) {
  assertValid(idSchema, entryId);
  const userId = await getCurrentUserId();
  await deleteBodyWeight(entryId, userId);
  revalidateAll();
}
