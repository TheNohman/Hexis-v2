"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertBodyWeight, deleteBodyWeight } from "@/lib/bodyweight/mutations";

const REVALIDATE_PATHS = ["/profile", "/profile/poids", "/profile/mesures", "/stats"];

function revalidateAll() {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
}

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
  revalidateAll();
}

export async function deleteBodyWeightAction(entryId: string) {
  const userId = await getCurrentUserId();
  await deleteBodyWeight(entryId, userId);
  revalidateAll();
}
