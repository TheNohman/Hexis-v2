"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { clearAdviceCache, getSessionAdvice } from "@/lib/mentor/advice";

/**
 * Force a regeneration of the current mentor advice. If the user is
 * rate-limited, `getSessionAdvice` falls back to the stale cache — we
 * don't throw so the UI can just re-render and show the rate-limit badge.
 */
export async function regenerateMentorAdviceAction(): Promise<void> {
  const userId = await getCurrentUserId();
  await clearAdviceCache(userId);
  await getSessionAdvice(userId);
  revalidatePath("/mentor");
}
