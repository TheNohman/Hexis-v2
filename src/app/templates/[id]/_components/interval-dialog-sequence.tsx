"use client";

import { X as XIcon } from "lucide-react";
import { SortableList } from "@/app/_components/sortable-list";
import type { ExerciseListItem } from "@/lib/workouts/types";

export function SequenceEditor({
  selectedExerciseIds,
  customSequence,
  roundCount,
  exerciseById,
  onRemove,
  onReorderSlots,
  onSetSlot,
  onSyncCycle,
}: {
  selectedExerciseIds: string[];
  customSequence: string[];
  roundCount: number;
  exerciseById: Map<string, ExerciseListItem>;
  onRemove: (id: string) => void;
  onReorderSlots: (next: string[]) => void;
  onSetSlot: (index: number, exerciseId: string) => void;
  onSyncCycle: () => void;
}) {
  if (selectedExerciseIds.length === 0) {
    return (
      <section className="space-y-3">
        <p className="text-xs text-subtle italic">
          Choisis au moins un exercice ci-dessous.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {selectedExerciseIds.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-light text-accent-ink px-2.5 py-1 text-xs font-semibold"
          >
            {exerciseById.get(id)?.name ?? id}
            <button
              type="button"
              onClick={() => onRemove(id)}
              aria-label={`Retirer ${exerciseById.get(id)?.name ?? id}`}
              className="text-accent-ink/70 hover:text-danger cursor-pointer"
            >
              <XIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
          Séquence des rounds
        </h3>
        <button
          type="button"
          onClick={onSyncCycle}
          className="text-[11px] font-semibold text-accent-ink hover:underline cursor-pointer"
        >
          Pré-remplir en cycle
        </button>
      </div>
      <p className="text-[11px] text-subtle -mt-1">
        Glisse les slots pour réordonner ou sélectionne un exo différent par round.
      </p>

      <SortableList
        items={Array.from({ length: roundCount }).map((_, i) => ({
          slotIndex: i,
          exerciseId:
            customSequence[i] ??
            selectedExerciseIds[i % selectedExerciseIds.length] ??
            "",
        }))}
        keyFor={(slot) => `seq-${slot.slotIndex}`}
        onReorder={(next) => onReorderSlots(next.map((s) => s.exerciseId))}
        className="space-y-1 rounded-2xl border border-border bg-background p-2"
        renderItem={(slot, i, handle) => (
          <li className="flex items-center gap-2 rounded-lg bg-surface border border-border/60 pl-1 pr-2 py-1.5">
            <button
              type="button"
              {...handle.attributes}
              {...handle.listeners}
              aria-label={`Déplacer le round ${i + 1}`}
              className="cursor-grab active:cursor-grabbing text-subtle hover:text-foreground px-2 py-1 touch-none"
            >
              <span aria-hidden="true">⠿</span>
            </button>
            <span className="text-[10px] font-mono font-bold text-accent-ink w-10 text-center tabular-nums">
              R{String(i + 1).padStart(2, "0")}
            </span>
            <label className="flex-1">
              <span className="sr-only">Exercice du round {i + 1}</span>
              <select
                value={slot.exerciseId}
                onChange={(e) => onSetSlot(i, e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent"
              >
                {selectedExerciseIds.map((id) => (
                  <option key={id} value={id}>
                    {exerciseById.get(id)?.name ?? id}
                  </option>
                ))}
              </select>
            </label>
          </li>
        )}
      />
    </section>
  );
}
