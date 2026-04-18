"use client";

import type { ExerciseListItem } from "@/lib/workouts/types";

export function ExercisePool({
  exercises,
  selectedExerciseIds,
  query,
  onQueryChange,
  onToggle,
}: {
  exercises: ExerciseListItem[];
  selectedExerciseIds: string[];
  query: string;
  onQueryChange: (q: string) => void;
  onToggle: (id: string) => void;
}) {
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? exercises.filter((e) => e.name.toLowerCase().includes(trimmed))
    : exercises;

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
        Ajouter un exercice
      </h3>
      <label className="block">
        <span className="sr-only">Rechercher un exercice</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
        />
      </label>
      <ul className="max-h-48 overflow-y-auto space-y-1 rounded-2xl border border-border bg-background p-2">
        {filtered.length === 0 && (
          <li className="text-xs text-subtle text-center py-4">
            Aucun exercice trouvé.
          </li>
        )}
        {filtered.map((ex) => {
          const active = selectedExerciseIds.includes(ex.id);
          return (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => onToggle(ex.id)}
                aria-pressed={active}
                className={`w-full text-left rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                  active
                    ? "bg-accent-light text-accent-ink font-semibold"
                    : "hover:bg-surface-hover"
                }`}
              >
                <span className="text-sm">{ex.name}</span>
                {active ? (
                  <span className="text-xs font-semibold" aria-label="Ajouté">
                    <span aria-hidden="true">✓</span> ajouté
                  </span>
                ) : (
                  <span className="text-xs text-subtle" aria-hidden="true">+</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
