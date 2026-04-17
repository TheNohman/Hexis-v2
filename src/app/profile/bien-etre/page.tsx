import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getRecentWellnessLogs } from "@/lib/wellness/queries";
import { WellnessHistorySection } from "../_components/wellness-history";

export const dynamic = "force-dynamic";

export default async function BienEtrePage() {
  const userId = await getCurrentUserId();
  const logs = await getRecentWellnessLogs(userId, 90);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              Bien-être
            </h1>
            <p className="text-xs text-muted mt-1">
              90 derniers jours
            </p>
          </div>
          <Link
            href="/profile"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Profil
          </Link>
        </header>

        <Link
          href="/dashboard#wellness"
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Ajouter un jour (rattrapage)
        </Link>

        <WellnessHistorySection logs={logs} />
      </div>
    </main>
  );
}
