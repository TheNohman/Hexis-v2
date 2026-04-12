import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getUserProfile } from "@/lib/profile/mutations";
import { listBodyWeightEntries } from "@/lib/bodyweight/queries";
import { ProfileForm } from "./_components/profile-form";
import { BodyWeightSection } from "./_components/bodyweight-section";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  const profile = await getUserProfile(userId);
  const bodyWeightEntries = await listBodyWeightEntries(userId, 6);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              Profil
            </h1>
            <p className="text-xs text-muted mt-1">
              {profile.name ?? profile.email ?? ""}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Retour
          </Link>
        </header>

        <ProfileForm profile={profile} />
        <BodyWeightSection entries={bodyWeightEntries} />
      </div>
    </main>
  );
}
