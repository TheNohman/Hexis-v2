"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertWellnessLog, deleteWellnessLog } from "@/lib/wellness/mutations";
import { clearAdviceCache } from "@/lib/mentor/advice";

export async function upsertWellnessLogAction(data: {
  date: string;
  mood: number;
  sleep: number;
  energy: number;
  stress: number;
  notes?: string | null;
}) {
  const userId = await getCurrentUserId();
  // Guard: refuse future dates. We allow any past date (UI constrains to 30d).
  const today = new Date().toISOString().slice(0, 10);
  if (data.date > today) {
    throw new Error("Impossible d'enregistrer un bien-être futur");
  }
  await upsertWellnessLog(userId, data);
  // Wellness change materially shifts the advice context; invalidate cache.
  await clearAdviceCache(userId);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function deleteWellnessLogAction(logId: string) {
  const userId = await getCurrentUserId();
  await deleteWellnessLog(logId, userId);
  revalidatePath("/profile");
}
