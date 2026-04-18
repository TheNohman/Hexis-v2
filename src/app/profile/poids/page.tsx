import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listBodyWeightEntries } from "@/lib/bodyweight/queries";
import { BodyWeightSection } from "../_components/bodyweight-section";

export const dynamic = "force-dynamic";

export default async function PoidsPage() {
  const userId = await getCurrentUserId();
  const entries = await listBodyWeightEntries(userId);

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] tracking-tight">
              Poids corporel
            </h1>
            <p className="text-xs text-muted mt-1">
              {entries.length} entrée{entries.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/profile"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Profil
          </Link>
        </header>

        <BodyWeightSection entries={entries} />
      </div>
    </main>
  );
}
