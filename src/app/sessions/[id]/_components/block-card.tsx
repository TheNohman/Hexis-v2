"use client";

import { useState, useTransition } from "react";
import type { ExerciseListItem, WorkoutDetail } from "@/lib/workouts/types";
import {
  addEntryAction,
  deleteBlockAction,
  deleteEntryAction,
  duplicateEntryAction,
  renameBlockAction,
} from "@/app/sessions/actions";
import { ExercisePicker } from "./exercise-picker";
import { EntryRow } from "./entry-row";

type Block = WorkoutDetail["blocks"][number];

type Props = {
  workoutId: string;
  block: Block;
  exercises: ExerciseListItem[];
};

export function BlockCard({ workoutId, block, exercises }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-xl border border-foreground/10 overflow-hidden">
      <header className="flex items-center justify-between p-3 border-b border-foreground/10 bg-foreground/[0.02]">
        {isEditingName ? (
          <input
            type="text"
            defaultValue={block.name}
            autoFocus
            onBlur={(e) => {
              const next = e.target.value.trim();
              if (next && next !== block.name) {
                startTransition(() =>
                  renameBlockAction(workoutId, block.id, next),
                );
              }
              setIsEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setIsEditingName(false);
            }}
            className="text-sm font-semibold bg-transparent outline-none border-b border-foreground/30 px-1"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="text-sm font-semibold cursor-pointer hover:text-foreground/80"
          >
            {block.name}
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm(`Supprimer le bloc "${block.name}" ?`)) {
              startTransition(() => deleteBlockAction(workoutId, block.id));
            }
          }}
          className="text-xs text-foreground/50 hover:text-red-500 cursor-pointer disabled:opacity-50"
        >
          Supprimer
        </button>
      </header>

      <ul className="p-2">
        {block.entries.length === 0 ? (
          <li className="px-3 py-4 text-center text-xs text-foreground/40">
            Aucune entrée — ajoute ton premier exercice
          </li>
        ) : (
          block.entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onDuplicate={async () => {
                await duplicateEntryAction(workoutId, entry.id);
              }}
              onDelete={async () => {
                await deleteEntryAction(workoutId, entry.id);
              }}
            />
          ))
        )}
      </ul>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full px-3 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 border-t border-foreground/10 cursor-pointer transition-colors"
      >
        + Ajouter une entrée
      </button>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={exercises}
        onPick={async (exercise, values) => {
          await addEntryAction(workoutId, block.id, exercise.id, values);
        }}
      />
    </section>
  );
}
