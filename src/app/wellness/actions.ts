"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertWellnessLog, deleteWellnessLog } from "@/lib/wellness/mutations";

export async function upsertWellnessLogAction(data: {
  date: string;
  mood: number;
  sleep: number;
  energy: number;
  stress: number;
  notes?: string | null;
}) {
  const userId = await getCurrentUserId();
  await upsertWellnessLog(userId, data);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function deleteWellnessLogAction(logId: string) {
  const userId = await getCurrentUserId();
  await deleteWellnessLog(logId, userId);
  revalidatePath("/profile");
}
