"use client";

import { useState } from "react";
import { MeasurementsList } from "./measurements-list";
import { TypeConfigForm } from "./type-config-form";
import { TypeManager } from "./type-manager";
import type { MeasurementData, MeasurementTypeConfigData } from "@/lib/measurements/types";
import { DEFAULT_MEASUREMENT_SUGGESTIONS } from "@/lib/measurements/types";

type Props = {
  typeConfigs: MeasurementTypeConfigData[];
  entries: MeasurementData[];
};

export function MeasurementsPageClient({ typeConfigs, entries }: Props) {
  const [showAddType, setShowAddType] = useState(false);
  const [showManager, setShowManager] = useState(false);

  // Suggestions not yet configured
  const configuredSlugs = new Set(typeConfigs.map((c) => c.slug));
  const suggestions = DEFAULT_MEASUREMENT_SUGGESTIONS.filter(
    (s) => !configuredSlugs.has(s.slug),
  );

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setShowAddType(!showAddType);
            setShowManager(false);
          }}
          className="text-xs text-accent hover:text-accent-hover cursor-pointer transition-colors"
        >
          + Nouveau type
        </button>
        {typeConfigs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setShowManager(!showManager);
              setShowAddType(false);
            }}
            className="text-xs text-muted hover:text-foreground cursor-pointer transition-colors"
          >
            Gerer les types
          </button>
        )}
      </div>

      {/* Add type form */}
      {showAddType && (
        <TypeConfigForm onClose={() => setShowAddType(false)} />
      )}

      {/* Suggestions */}
      {showAddType && suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted">Ou choisissez parmi les suggestions :</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <SuggestionButton key={s.slug} label={s.label} unit={s.unit} />
            ))}
          </div>
        </div>
      )}

      {/* Type manager */}
      {showManager && (
        <TypeManager
          configs={typeConfigs}
          onClose={() => setShowManager(false)}
        />
      )}

      {/* Measurement sections by type */}
      <MeasurementsList entries={entries} typeConfigs={typeConfigs} />
    </div>
  );
}

function SuggestionButton({ label, unit }: { label: string; unit: string }) {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    const { createMeasurementTypeAction } = await import(
      "@/app/measurements/actions"
    );
    await createMeasurementTypeAction({ label, unit });
    setIsPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted hover:text-accent hover:border-accent transition-colors cursor-pointer disabled:opacity-50"
    >
      + {label}
    </button>
  );
}
