import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getSportProfile } from "@/lib/profile/onboarding";
import { OnboardingWizard } from "./_components/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const userId = await getCurrentUserId();
  const profile = await getSportProfile(userId);

  // Already completed? Send them to the dashboard. Users who want to change
  // their profile go through /profile (a future edit form), not through
  // the onboarding wizard.
  if (profile.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return <OnboardingWizard />;
}
