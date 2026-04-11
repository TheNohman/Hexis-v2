"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ExerciseListItem } from "@/lib/workouts/types";
import type { TemplateDetail } from "@/lib/templates/types";
import {
  addTemplateEntryAction,
  deleteTemplateBlockAction,
  deleteTemplateEntryAction,
  duplicateTemplateEntryAction,
  renameTemplateBlockAction,
  reorderTemplateEntriesAction,
} from "@/app/templates/actions";
import { ExercisePicker } from "@/app/sessions/[id]/_components/exercise-picker";
import { TemplateEntryRow } from "./template-entry-row";

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

  const [optimisticEntries, setOptimisticEntries] = useState(block.entries);
  useEffect(() => {
    setOptimisticEntries(block.entries);
  }, [block.entries]);

  const entrySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleEntryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = optimisticEntries.findIndex((e) => e.id === active.id);
    const newIndex = optimisticEntries.findIndex((e) => e.id === over.id);
    const reordered = arrayMove(optimisticEntries, oldIndex, newIndex);

    setOptimisticEntries(reordered);
    startTransition(() =>
      reorderTemplateEntriesAction(
        templateId,
        block.id,
        reordered.map((e) => e.id),
      ),
    );
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-foreground/10 overflow-hidden"
    >
      <header className="flex items-center justify-between p-3 border-b border-foreground/10 bg-foreground/[0.02]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            className="cursor-grab touch-none text-foreground/30 hover:text-foreground/60 shrink-0"
            {...attributes}
            {...listeners}
          >
            ⠿
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
              className="text-sm font-semibold bg-transparent outline-none border-b border-foreground/30 px-1 min-w-0 flex-1"
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
          className="text-xs text-foreground/50 hover:text-red-500 cursor-pointer disabled:opacity-50"
        >
          Supprimer
        </button>
      </header>

      <DndContext
        sensors={entrySensors}
        collisionDetection={closestCenter}
        onDragEnd={handleEntryDragEnd}
      >
        <SortableContext
          items={optimisticEntries.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="p-2">
            {optimisticEntries.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-foreground/40">
                Aucune entrée — ajoute ton premier exercice
              </li>
            ) : (
              optimisticEntries.map((entry) => (
                <TemplateEntryRow
                  key={entry.id}
                  templateId={templateId}
                  entry={entry}
                  onDuplicate={async () => {
                    await duplicateTemplateEntryAction(templateId, entry.id);
                  }}
                  onDelete={async () => {
                    await deleteTemplateEntryAction(templateId, entry.id);
                  }}
                />
              ))
            )}
          </ul>
        </SortableContext>
      </DndContext>

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
          await addTemplateEntryAction(
            templateId,
            block.id,
            exercise.id,
            values,
          );
        }}
      />
    </section>
  );
}
