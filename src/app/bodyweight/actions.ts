"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertBodyWeight, deleteBodyWeight } from "@/lib/bodyweight/mutations";

export async function addBodyWeightAction(data: {
  date: string; // ISO date string
  weightKg: number;
  notes?: string;
}) {
  const userId = await getCurrentUserId();
  await upsertBodyWeight(userId, {
    date: new Date(data.date),
    weightKg: data.weightKg,
    notes: data.notes ?? null,
  });
  revalidatePath("/profile");
  revalidatePath("/stats");
}

export async function deleteBodyWeightAction(entryId: string) {
  const userId = await getCurrentUserId();
  await deleteBodyWeight(entryId, userId);
  revalidatePath("/profile");
  revalidatePath("/stats");
}
