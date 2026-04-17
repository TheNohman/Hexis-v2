"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertWellnessLog, deleteWellnessLog } from "@/lib/wellness/mutations";
import { clearAdviceCache } from "@/lib/mentor/advice";
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
  const userId = await getCurrentUserId();
  await upsertWellnessLog(userId, parsed);
  await clearAdviceCache(userId);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function deleteWellnessLogAction(logId: string) {
  assertValid(idSchema, logId);
  const userId = await getCurrentUserId();
  await deleteWellnessLog(logId, userId);
  revalidatePath("/profile");
}
