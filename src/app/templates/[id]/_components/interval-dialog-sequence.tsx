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
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs"
          >
            {exerciseById.get(id)?.name ?? id}
            <button
              type="button"
              onClick={() => onRemove(id)}
              aria-label="Retirer"
              className="text-subtle hover:text-danger cursor-pointer"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Séquence des rounds
        </h3>
        <button
          type="button"
          onClick={onSyncCycle}
          className="text-[10px] normal-case text-accent hover:underline cursor-pointer"
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
        className="space-y-1 rounded-xl border border-border bg-surface p-2"
        renderItem={(slot, i, handle) => (
          <li className="flex items-center gap-2 rounded-lg bg-background border border-border/50 pl-1 pr-2 py-1.5">
            <button
              type="button"
              {...handle.attributes}
              {...handle.listeners}
              aria-label="Déplacer ce round"
              className="cursor-grab active:cursor-grabbing text-subtle hover:text-foreground px-2 py-1 touch-none"
            >
              ⠿
            </button>
            <span className="text-[10px] font-mono text-accent w-10 text-center">
              R{String(i + 1).padStart(2, "0")}
            </span>
            <select
              value={slot.exerciseId}
              onChange={(e) => onSetSlot(i, e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent"
            >
              {selectedExerciseIds.map((id) => (
                <option key={id} value={id}>
                  {exerciseById.get(id)?.name ?? id}
                </option>
              ))}
            </select>
          </li>
        )}
      />
    </section>
  );
}
