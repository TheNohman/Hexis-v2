"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TouchSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { ExerciseListItem } from "@/lib/workouts/types";
import type { TemplateDetail } from "@/lib/templates/types";
import {
  addTemplateEntryAction,
  deleteTemplateBlockAction,
  renameTemplateBlockAction,
} from "@/app/templates/actions";
import { groupEntriesByExercise } from "@/app/sessions/[id]/_components/group-entries";
import { ExercisePicker } from "@/app/sessions/[id]/_components/exercise-picker";
import { TemplateExerciseCard } from "./template-exercise-card";

type Block = TemplateDetail["blocks"][number];

type Props = {
  templateId: string;
  block: Block;
  exercises: ExerciseListItem[];
};

export function TemplateBlockCard({ templateId, block, exercises }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const groups = groupEntriesByExercise(block.entries);

  return (
    <section ref={setNodeRef} style={style} className="space-y-3">
      {/* Block header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            className="cursor-grab touch-none text-subtle hover:text-muted shrink-0 p-3 -ml-3 transition-colors"
            {...attributes}
            {...listeners}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.2" />
              <circle cx="10" cy="3" r="1.2" />
              <circle cx="4" cy="7" r="1.2" />
              <circle cx="10" cy="7" r="1.2" />
              <circle cx="4" cy="11" r="1.2" />
              <circle cx="10" cy="11" r="1.2" />
            </svg>
          </button>
          {isEditingName ? (
            <input
              type="text"
              defaultValue={block.name}
              autoFocus
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== block.name) {
                  startTransition(() =>
                    renameTemplateBlockAction(templateId, block.id, next),
                  );
                }
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setIsEditingName(false);
              }}
              className="text-sm font-bold bg-transparent outline-none border-b-2 border-accent/50 px-1 min-w-0 flex-1 uppercase tracking-wide"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="text-xs font-bold cursor-pointer hover:text-accent transition-colors uppercase tracking-widest"
            >
              {block.name}
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm(`Supprimer le bloc "${block.name}" ?`)) {
              startTransition(() =>
                deleteTemplateBlockAction(templateId, block.id),
              );
            }
          }}
          className="text-xs text-subtle hover:text-danger cursor-pointer disabled:opacity-50 p-2 -mr-2 transition-colors"
        >
          Supprimer
        </button>
      </div>

      {/* Exercise cards */}
      <div className="space-y-3">
        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-border px-4 py-6 text-center text-xs text-subtle">
            Aucun exercice &mdash; ajoute ton premier exercice
          </div>
        ) : (
          groups.map((group) => (
            <TemplateExerciseCard
              key={`${group.exerciseId}-${group.sets[0].id}`}
              templateId={templateId}
              blockId={block.id}
              group={group}
            />
          ))
        )}
      </div>

      {/* Add exercise button */}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full rounded-2xl border border-dashed border-surface-border px-4 py-4 text-sm text-subtle hover:text-accent hover:border-accent/30 cursor-pointer transition-colors"
      >
        + Ajouter un exercice
      </button>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={exercises}
        multiSet
        onPick={async (exercise, values, setCount) => {
          const count = setCount ?? 1;
          for (let i = 0; i < count; i++) {
            await addTemplateEntryAction(
              templateId,
              block.id,
              exercise.id,
              values,
            );
          }
        }}
      />
    </section>
  );
}
