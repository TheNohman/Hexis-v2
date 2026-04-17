"use client";

import { GripVertical } from "lucide-react";
import { SortableList } from "@/app/_components/sortable-list";
import type { ExerciseListItem } from "@/lib/workouts/types";
import type { PlaybackOrder } from "./interval-dialog-presets";

export function PlaylistEditor({
  selectedExerciseIds,
  playbackOrder,
  exerciseById,
  onReorder,
  onRemove,
}: {
  selectedExerciseIds: string[];
  playbackOrder: PlaybackOrder;
  exerciseById: Map<string, ExerciseListItem>;
  onReorder: (next: string[]) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center justify-between">
        <span>
          {playbackOrder === "SAME"
            ? `Exercice (${selectedExerciseIds.length})`
            : `Playlist (${selectedExerciseIds.length})`}
        </span>
        {playbackOrder === "CYCLE" && selectedExerciseIds.length > 1 && (
          <span className="text-[10px] normal-case text-subtle">
            Glisse pour réordonner
          </span>
        )}
      </h3>
      {selectedExerciseIds.length === 0 ? (
        <p className="text-xs text-subtle italic">
          Choisis au moins un exercice ci-dessous.
        </p>
      ) : (
        <SortableList
          items={selectedExerciseIds}
          keyFor={(id) => id}
          onReorder={onReorder}
          className="space-y-1 rounded-xl border border-border bg-surface p-2"
          renderItem={(id, i, handle) => (
            <li className="flex items-center gap-2 rounded-lg bg-background border border-border/50 pl-1 pr-2 py-1.5">
              <button
                type="button"
                {...handle.attributes}
                {...handle.listeners}
                aria-label="Déplacer"
                className="cursor-grab active:cursor-grabbing text-subtle hover:text-foreground px-2 py-1 touch-none"
              >
                <GripVertical className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-subtle w-5 text-center">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm truncate">
                {exerciseById.get(id)?.name ?? id}
              </span>
              <button
                type="button"
                onClick={() => onRemove(id)}
                className="text-xs text-danger hover:underline cursor-pointer"
              >
                Retirer
              </button>
            </li>
          )}
        />
      )}
    </section>
  );
}
