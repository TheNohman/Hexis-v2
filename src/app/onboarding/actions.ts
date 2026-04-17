"use server";

import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { saveSportProfile, type SportProfileInput } from "@/lib/profile/onboarding";
import { clearAdviceCache } from "@/lib/mentor/advice";
import { trackEvent } from "@/lib/telemetry/track";
import { assertValid, sportProfileInputSchema } from "@/lib/validation/schemas";

export async function completeOnboardingAction(data: SportProfileInput) {
  assertValid(sportProfileInputSchema, data);
  const userId = await getCurrentUserId();
  await saveSportProfile(userId, data);
  await clearAdviceCache(userId);
  await trackEvent(userId, "onboarding_completed", {
    primarySport: data.primarySport,
    sportLevel: data.sportLevel,
  });
  redirect("/dashboard");
}
