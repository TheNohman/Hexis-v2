import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listAllMeasurements } from "@/lib/measurements/queries";
import { listTypeConfigs } from "@/lib/measurements/type-config-queries";
import { listBodyWeightEntries } from "@/lib/bodyweight/queries";
import { MeasurementsPageClient } from "./_components/measurements-page-client";
import type { MeasurementData, MeasurementTypeConfigData } from "@/lib/measurements/types";

export const dynamic = "force-dynamic";

const POIDS_CONFIG: MeasurementTypeConfigData = {
  id: "__poids__",
  slug: "poids",
  label: "Poids",
  unit: "kg",
  color: null,
  sortOrder: -1,
  archived: false,
};

export default async function MesuresPage() {
  const userId = await getCurrentUserId();
  const [typeConfigs, entries, bwEntries] = await Promise.all([
    listTypeConfigs(userId),
    listAllMeasurements(userId),
    listBodyWeightEntries(userId),
  ]);

  // Convert body weight entries to MeasurementData
  const bwAsMeasurements: MeasurementData[] = bwEntries.map((e) => ({
    id: e.id,
    type: "poids",
    date: e.date,
    value: e.weightKg,
    notes: e.notes,
  }));

  // Merge: poids config first, then user-configured types
  const allConfigs = [POIDS_CONFIG, ...typeConfigs];
  const allEntries = [...bwAsMeasurements, ...entries];

  const totalTypes = allConfigs.length;

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] tracking-tight">
              Mesures corporelles
            </h1>
            <p className="text-xs text-muted mt-1">
              {totalTypes} type{totalTypes !== 1 ? "s" : ""} suivi{totalTypes !== 1 ? "s" : ""}
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
          typeConfigs={allConfigs}
          entries={allEntries}
        />
      </div>
    </main>
  );
}
