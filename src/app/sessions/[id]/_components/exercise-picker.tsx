"use client";

import { useMemo, useState, useTransition } from "react";
import { formatExerciseType } from "@/lib/format";
import type { ExerciseListItem } from "@/lib/workouts/types";
import { KpiInput } from "./kpi-input";

type Props = {
  open: boolean;
  onClose: () => void;
  exercises: ExerciseListItem[];
  onPick: (
    exercise: ExerciseListItem,
    values: {
      kpiDefinitionId: string;
      valueNumeric: number | null;
      valueText: string | null;
    }[],
  ) => Promise<void>;
};

/**
 * Two-step drawer: first pick an exercise, then enter its KPI values.
 * The drawer stays mounted so the "values" phase can use fresh DOM state.
 */
export function ExercisePicker({ open, onClose, exercises, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ExerciseListItem | null>(null);
  const [values, setValues] = useState<
    Record<string, { valueNumeric: number | null; valueText: string | null }>
  >({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return exercises;
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) =>
      ex.name.toLowerCase().includes(q) || ex.slug.toLowerCase().includes(q),
    );
  }, [exercises, query]);

  function handleSelectExercise(ex: ExerciseListItem) {
    setSelected(ex);
    // Initialise empty values for each KPI
    const init: typeof values = {};
    for (const k of ex.kpis) {
      init[k.kpiDefinitionId] = { valueNumeric: null, valueText: null };
    }
    setValues(init);
    setError(null);
  }

  function handleBack() {
    setSelected(null);
    setValues({});
    setError(null);
  }

  function handleClose() {
    setQuery("");
    setSelected(null);
    setValues({});
    setError(null);
    onClose();
  }

  function handleSubmit() {
    if (!selected) return;
    // Validate required KPIs
    for (const kpi of selected.kpis) {
      if (!kpi.isRequired) continue;
      const v = values[kpi.kpiDefinitionId];
      const hasValue =
        v && (v.valueNumeric != null || (v.valueText && v.valueText.trim() !== ""));
      if (!hasValue) {
        setError(`Le champ "${kpi.name}" est requis.`);
        return;
      }
    }
    setError(null);
    startTransition(async () => {
      try {
        await onPick(
          selected,
          selected.kpis.map((k) => ({
            kpiDefinitionId: k.kpiDefinitionId,
            valueNumeric: values[k.kpiDefinitionId]?.valueNumeric ?? null,
            valueText: values[k.kpiDefinitionId]?.valueText ?? null,
          })),
        );
        handleClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-background border-t sm:border sm:rounded-2xl border-foreground/10 max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-foreground/10">
          <h2 className="text-base font-semibold">
            {selected ? selected.name : "Choisir un exercice"}
          </h2>
          <button
            type="button"
            onClick={selected ? handleBack : handleClose}
            className="text-sm text-foreground/60 hover:text-foreground cursor-pointer"
          >
            {selected ? "← Retour" : "Annuler"}
          </button>
        </header>

        {!selected && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4">
              <input
                type="search"
                placeholder="Rechercher un exercice…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full rounded-lg bg-foreground/5 border border-foreground/10 px-4 py-2 text-sm focus:outline-none focus:border-foreground/40"
              />
            </div>
            <ul className="flex-1 overflow-y-auto px-2 pb-4">
              {filtered.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-foreground/50">
                  Aucun exercice
                </li>
              ) : (
                filtered.map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectExercise(ex)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{ex.name}</span>
                        <span className="text-[10px] uppercase tracking-wide text-foreground/50">
                          {formatExerciseType(ex.type)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {selected && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {selected.kpis.map((kpi, idx) => (
                <KpiInput
                  key={kpi.id}
                  kpi={kpi}
                  valueNumeric={values[kpi.kpiDefinitionId]?.valueNumeric ?? null}
                  valueText={values[kpi.kpiDefinitionId]?.valueText ?? null}
                  autoFocus={idx === 0}
                  onChange={(next) =>
                    setValues((prev) => ({
                      ...prev,
                      [kpi.kpiDefinitionId]: next,
                    }))
                  }
                />
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full rounded-xl bg-foreground text-background py-3 font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Ajout…" : "Ajouter à la séance"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
