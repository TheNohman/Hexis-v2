"use server";

import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { saveSportProfile, type SportProfileInput } from "@/lib/profile/onboarding";
import { clearAdviceCache } from "@/lib/mentor/advice";
import { assertValid, sportProfileInputSchema } from "@/lib/validation/schemas";

export async function completeOnboardingAction(data: SportProfileInput) {
  assertValid(sportProfileInputSchema, data);
  const userId = await getCurrentUserId();
  await saveSportProfile(userId, data);
  await clearAdviceCache(userId);
  redirect("/dashboard");
}
