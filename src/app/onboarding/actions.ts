"use server";

import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { saveSportProfile, type SportProfileInput } from "@/lib/profile/onboarding";
import { clearAdviceCache } from "@/lib/mentor/advice";

export async function completeOnboardingAction(data: SportProfileInput) {
  const userId = await getCurrentUserId();
  await saveSportProfile(userId, data);
  // Fresh profile = fresh advice context.
  await clearAdviceCache(userId);
  redirect("/dashboard");
}
