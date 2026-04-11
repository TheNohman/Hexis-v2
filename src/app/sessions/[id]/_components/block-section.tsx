"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ExerciseListItem, WorkoutDetail } from "@/lib/workouts/types";
import {
  addEntryAction,
  deleteBlockAction,
  renameBlockAction,
} from "@/app/sessions/actions";
import { groupEntriesByExercise } from "./group-entries";
import { ExerciseCard } from "./exercise-card";
import { ExercisePicker } from "./exercise-picker";

type Block = WorkoutDetail["blocks"][number];
type Entry = Block["entries"][number];

type Props = {
  workoutId: string;
  block: Block;
  exercises: ExerciseListItem[];
  onEntryValidated?: (entry: Entry) => void;
};

export function BlockSection({
  workoutId,
  block,
  exercises,
  onEntryValidated,
}: Props) {
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

  // For DnD, we use the first entry ID of each group as the sortable item ID
  const groupIds = groups.map((g) => g.sets[0].id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleExerciseDragEnd(_event: DragEndEvent) {
    // TODO: implement exercise group reordering
    // This requires moving all entries of a group together
  }

  return (
    <section ref={setNodeRef} style={style} className="space-y-3">
      {/* Block header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            className="cursor-grab touch-none text-foreground/30 hover:text-foreground/60 shrink-0 p-3 -ml-3"
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
                    renameBlockAction(workoutId, block.id, next),
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
              startTransition(() => deleteBlockAction(workoutId, block.id));
            }
          }}
          className="text-xs text-foreground/50 hover:text-red-500 cursor-pointer disabled:opacity-50 p-2 -mr-2"
        >
          Supprimer
        </button>
      </div>

      {/* Exercise cards */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleExerciseDragEnd}
      >
        <SortableContext
          items={groupIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {groups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-foreground/20 px-3 py-4 text-center text-xs text-foreground/40">
                Aucun exercice — ajoute ton premier exercice
              </div>
            ) : (
              groups.map((group) => (
                <ExerciseCard
                  key={`${group.exerciseId}-${group.sets[0].id}`}
                  workoutId={workoutId}
                  blockId={block.id}
                  group={group}
                  onEntryValidated={onEntryValidated}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add exercise button */}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full rounded-xl border border-dashed border-foreground/20 px-4 py-3 text-sm text-foreground/60 hover:bg-foreground/5 cursor-pointer transition-colors"
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
            await addEntryAction(workoutId, block.id, exercise.id, values);
          }
        }}
      />
    </section>
  );
}
