"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { formatExerciseType } from "@/lib/format";
import type { ExerciseListItem } from "@/lib/workouts/types";
import { KpiInput } from "./kpi-input";

type KpiValueState = Record<
  string,
  { valueNumeric: number | null; valueText: string | null }
>;

type Props = {
  open: boolean;
  onClose: () => void;
  exercises: ExerciseListItem[];
  multiSet?: boolean;
  addLabel?: string;
  onPick: (
    exercise: ExerciseListItem,
    values: {
      kpiDefinitionId: string;
      valueNumeric: number | null;
      valueText: string | null;
    }[],
    setCount?: number,
  ) => Promise<void>;
};

export function ExercisePicker({ open, onClose, exercises, multiSet, addLabel, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ExerciseListItem | null>(null);
  const [values, setValues] = useState<KpiValueState>({});
  const valuesRef = useRef<KpiValueState>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [setCount, setSetCount] = useState(3);

  function updateValue(
    kpiDefinitionId: string,
    next: { valueNumeric: number | null; valueText: string | null },
  ) {
    valuesRef.current = { ...valuesRef.current, [kpiDefinitionId]: next };
    setValues(valuesRef.current);
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return exercises;
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) =>
      ex.name.toLowerCase().includes(q) || ex.slug.toLowerCase().includes(q),
    );
  }, [exercises, query]);

  function handleSelectExercise(ex: ExerciseListItem) {
    setSelected(ex);
    const init: KpiValueState = {};
    for (const k of ex.kpis) {
      init[k.kpiDefinitionId] = { valueNumeric: null, valueText: null };
    }
    valuesRef.current = init;
    setValues(init);
    setSetCount(3);
    setError(null);
  }

  function handleBack() {
    setSelected(null);
    valuesRef.current = {};
    setValues({});
    setError(null);
  }

  function handleClose() {
    setQuery("");
    setSelected(null);
    valuesRef.current = {};
    setValues({});
    setError(null);
    onClose();
  }

  function handleSubmit() {
    if (!selected) return;
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }
    const current = valuesRef.current;
    for (const kpi of selected.kpis) {
      if (!kpi.isRequired) continue;
      const v = current[kpi.kpiDefinitionId];
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
            valueNumeric: current[k.kpiDefinitionId]?.valueNumeric ?? null,
            valueText: current[k.kpiDefinitionId]?.valueText ?? null,
          })),
          multiSet ? setCount : undefined,
        );
        handleBack();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={selected ? `Configurer ${selected.name}` : "Choisir un exercice"}
    >
      <div className="w-full sm:max-w-lg bg-surface border-t sm:border sm:rounded-2xl border-border max-h-[90vh] flex flex-col shadow-hero">
        <header className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display font-bold text-lg tracking-tight">
            {selected ? selected.name : "Choisir un exercice"}
          </h2>
          <button
            type="button"
            onClick={selected ? handleBack : handleClose}
            className="text-sm text-muted hover:text-foreground cursor-pointer px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
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
                aria-label="Rechercher un exercice"
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full rounded-xl bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <ul className="flex-1 overflow-y-auto px-2 pb-4">
              {filtered.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-muted">
                  Aucun exercice
                </li>
              ) : (
                filtered.map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectExercise(ex)}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{ex.name}</span>
                        <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">
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
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {selected.kpis.map((kpi, idx) => (
                <KpiInput
                  key={kpi.id}
                  kpi={kpi}
                  valueNumeric={values[kpi.kpiDefinitionId]?.valueNumeric ?? null}
                  valueText={values[kpi.kpiDefinitionId]?.valueText ?? null}
                  autoFocus={idx === 0}
                  onChange={(next) => updateValue(kpi.kpiDefinitionId, next)}
                />
              ))}
            </div>
            {multiSet && (
              <div className="flex items-center justify-between rounded-2xl bg-background p-4 border border-border">
                <span className="text-sm text-muted font-medium">Nombre de séries</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSetCount((c) => Math.max(1, c - 1))}
                    aria-label="Diminuer le nombre de séries"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface border border-border text-lg font-bold cursor-pointer hover:border-accent transition-colors"
                  >
                    −
                  </button>
                  <span className="font-display font-black text-3xl tabular-nums w-10 text-center text-accent-ink">
                    {setCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSetCount((c) => Math.min(10, c + 1))}
                    aria-label="Augmenter le nombre de séries"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface border border-border text-lg font-bold cursor-pointer hover:border-accent transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            {error && (
              <p className="text-sm text-danger font-medium" role="alert">{error}</p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full rounded-xl bg-accent text-accent-foreground py-4 font-bold tracking-widest hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 uppercase"
            >
              {isPending ? "Ajout…" : addLabel ?? "Ajouter à la séance"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
