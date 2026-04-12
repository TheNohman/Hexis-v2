"use client";

import { useState, useTransition } from "react";
import { formatDuration } from "@/lib/format";
import type { WorkoutDetail } from "@/lib/workouts/types";
import type { ExerciseGroup } from "./group-entries";
import { addSetAction, deleteEntryAction } from "@/app/sessions/actions";
import { SetRow } from "./set-row";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";

type Props = {
  workoutId: string;
  blockId: string;
  group: ExerciseGroup;
  onEntryValidated?: (entry: WorkoutDetail["blocks"][number]["entries"][number]) => void;
};

export function ExerciseCard({ workoutId, blockId, group, onEntryValidated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lastSet = group.sets[group.sets.length - 1] ?? null;

  function handleAddSet() {
    if (!lastSet) return;
    startTransition(() => addSetAction(workoutId, blockId, group.exerciseId, lastSet.id));
  }

  function handleDeleteAll() {
    startTransition(async () => {
      await Promise.all(group.sets.map((set) => deleteEntryAction(workoutId, set.id)));
      setMenuOpen(false);
      setConfirmDelete(false);
    });
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{group.exerciseName}</p>
          <p className="text-xs text-muted mt-0.5">{group.sets.length} s&eacute;rie{group.sets.length > 1 ? "s" : ""}</p>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen(!menuOpen)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-subtle hover:text-foreground hover:bg-surface-hover cursor-pointer transition-colors"
            aria-label="Options de l'exercice">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-background shadow-lg py-1">
                <button type="button" disabled={isPending}
                  onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-danger-light cursor-pointer disabled:opacity-50 transition-colors">
                  Supprimer l&apos;exercice
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sets */}
      <div className="divide-y divide-border/50">
        {group.sets.map((set, i) => (
          <SetRow key={set.id} workoutId={workoutId} entry={set} setNumber={i + 1} onValidated={onEntryValidated} />
        ))}
      </div>

      {/* Add set */}
      <button type="button" onClick={handleAddSet} disabled={isPending}
        className="w-full px-4 py-3 text-sm text-muted hover:text-accent border-t border-border cursor-pointer transition-colors disabled:opacity-50">
        + S&eacute;rie
      </button>

      {group.restDurationSecs != null && group.restDurationSecs > 0 && (
        <div className="px-4 py-2 border-t border-border/50 text-xs text-subtle">
          Repos : {formatDuration(group.restDurationSecs)}
        </div>
      )}

      <ConfirmDialog open={confirmDelete} title="Supprimer l'exercice"
        message={`Supprimer toutes les s\u00e9ries de "${group.exerciseName}" ?`}
        confirmLabel="Supprimer" destructive onConfirm={handleDeleteAll} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}
