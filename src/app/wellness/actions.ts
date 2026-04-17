"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertWellnessLog, deleteWellnessLog } from "@/lib/wellness/mutations";
import { clearAdviceCache } from "@/lib/mentor/advice";
import { trackEvent } from "@/lib/telemetry/track";
import { assertValid, idSchema, wellnessUpsertSchema } from "@/lib/validation/schemas";

export async function upsertWellnessLogAction(data: {
  date: string;
  mood: number;
  sleep: number;
  energy: number;
  stress: number;
  notes?: string | null;
}) {
  const parsed = assertValid(wellnessUpsertSchema, data);
  // Guard: refuse future dates. Past dates allowed (UI constrains to 30 d).
  const today = new Date().toISOString().slice(0, 10);
  if (parsed.date > today) {
    throw new Error("Impossible d'enregistrer un bien-être futur");
  }
  const userId = await getCurrentUserId();
  await upsertWellnessLog(userId, parsed);
  // Wellness change materially shifts the advice context; invalidate cache.
  await clearAdviceCache(userId);
  await trackEvent(userId, "wellness_checkin", {
    mood: parsed.mood,
    sleep: parsed.sleep,
    energy: parsed.energy,
    stress: parsed.stress,
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function deleteWellnessLogAction(logId: string) {
  assertValid(idSchema, logId);
  const userId = await getCurrentUserId();
  await deleteWellnessLog(logId, userId);
  revalidatePath("/profile");
}
