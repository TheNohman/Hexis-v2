import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listAllMeasurements } from "@/lib/measurements/queries";
import { listTypeConfigs } from "@/lib/measurements/type-config-queries";
import { MeasurementsPageClient } from "./_components/measurements-page-client";

export const dynamic = "force-dynamic";

export default async function MesuresPage() {
  const userId = await getCurrentUserId();
  const [typeConfigs, entries] = await Promise.all([
    listTypeConfigs(userId),
    listAllMeasurements(userId),
  ]);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              Mesures corporelles
            </h1>
            <p className="text-xs text-muted mt-1">
              {typeConfigs.length} type{typeConfigs.length !== 1 ? "s" : ""} suivi{typeConfigs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/profile"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Profil
          </Link>
        </header>

        <MeasurementsPageClient
          typeConfigs={typeConfigs}
          entries={entries}
        />
      </div>
    </main>
  );
}
