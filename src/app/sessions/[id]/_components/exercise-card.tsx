"use client";

import { useState, useTransition } from "react";
import { formatDuration } from "@/lib/format";
import type { WorkoutDetail } from "@/lib/workouts/types";
import type { ExerciseGroup } from "./group-entries";
import {
  addSetAction,
  deleteEntryAction,
} from "@/app/sessions/actions";
import { SetRow } from "./set-row";

type Props = {
  workoutId: string;
  blockId: string;
  group: ExerciseGroup;
  onEntryValidated?: (entry: WorkoutDetail["blocks"][number]["entries"][number]) => void;
};

export function ExerciseCard({
  workoutId,
  blockId,
  group,
  onEntryValidated,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const lastSet = group.sets[group.sets.length - 1];

  function handleAddSet() {
    startTransition(() =>
      addSetAction(
        workoutId,
        blockId,
        group.exerciseId,
        lastSet.id,
      ),
    );
  }

  function handleDeleteAll() {
    if (
      !confirm(
        `Supprimer toutes les séries de "${group.exerciseName}" ?`,
      )
    )
      return;
    startTransition(async () => {
      for (const set of group.sets) {
        await deleteEntryAction(workoutId, set.id);
      }
    });
    setMenuOpen(false);
  }

  return (
    <div className="rounded-xl border border-foreground/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-foreground/10 bg-foreground/[0.02]">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">
            {group.exerciseName}
          </p>
          <p className="text-xs text-foreground/40 mt-0.5">
            {group.sets.length} série{group.sets.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Menu button (always visible, no hover-only) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 cursor-pointer transition-colors"
          >
            ···
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-foreground/10 bg-background shadow-lg py-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDeleteAll}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-500/10 cursor-pointer disabled:opacity-50"
                >
                  Supprimer l'exercice
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sets */}
      <div className="divide-y divide-foreground/5">
        {group.sets.map((set, i) => (
          <SetRow
            key={set.id}
            workoutId={workoutId}
            entry={set}
            setNumber={i + 1}
            onValidated={onEntryValidated}
          />
        ))}
      </div>

      {/* Add set button */}
      <button
        type="button"
        onClick={handleAddSet}
        disabled={isPending}
        className="w-full px-3 py-3 text-sm text-foreground/50 hover:bg-foreground/5 border-t border-foreground/10 cursor-pointer transition-colors disabled:opacity-50"
      >
        + Série
      </button>

      {/* Rest indicator */}
      {group.restDurationSecs != null && group.restDurationSecs > 0 && (
        <div className="px-3 py-2 border-t border-foreground/5 text-xs text-foreground/30">
          Repos : {formatDuration(group.restDurationSecs)}
        </div>
      )}
    </div>
  );
}
