"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
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
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { ExerciseListItem, WorkoutDetail } from "@/lib/workouts/types";
import {
  addBlockAction,
  finishWorkoutAction,
  renameWorkoutAction,
  reorderBlocksAction,
} from "@/app/sessions/actions";
import { BlockCard } from "./block-card";

type Props = {
  workout: WorkoutDetail;
  exercises: ExerciseListItem[];
};

export function WorkoutEditor({ workout, exercises }: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [showNewBlockInput, setShowNewBlockInput] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Optimistic block ordering
  const [optimisticBlocks, setOptimisticBlocks] = useState(workout.blocks);
  useEffect(() => {
    setOptimisticBlocks(workout.blocks);
  }, [workout.blocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleBlockDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = optimisticBlocks.findIndex((b) => b.id === active.id);
    const newIndex = optimisticBlocks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(optimisticBlocks, oldIndex, newIndex);

    setOptimisticBlocks(reordered);
    startTransition(() =>
      reorderBlocksAction(
        workout.id,
        reordered.map((b) => b.id),
      ),
    );
  }

  function handleAddBlock() {
    const name = newBlockName.trim() || "Nouveau bloc";
    startTransition(async () => {
      await addBlockAction(workout.id, name);
      setNewBlockName("");
      setShowNewBlockInput(false);
    });
  }

  function handleFinish() {
    if (workout.blocks.length === 0) {
      if (!confirm("Cette séance est vide. Terminer quand même ?")) return;
    }
    startTransition(() => finishWorkoutAction(workout.id));
  }

  return (
    <main className="flex-1 flex flex-col px-4 py-6">
      <div className="max-w-2xl w-full mx-auto space-y-5">
        <header className="flex items-start justify-between gap-3">
          {isEditingName ? (
            <input
              type="text"
              defaultValue={workout.name}
              autoFocus
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== workout.name) {
                  startTransition(() =>
                    renameWorkoutAction(workout.id, next),
                  );
                }
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setIsEditingName(false);
              }}
              className="flex-1 text-2xl font-bold bg-transparent outline-none border-b border-foreground/30"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="text-2xl font-bold cursor-pointer text-left hover:text-foreground/80"
            >
              {workout.name}
            </button>
          )}
          <Link
            href="/dashboard"
            className="text-xs text-foreground/60 hover:text-foreground whitespace-nowrap"
          >
            ← Dashboard
          </Link>
        </header>

        <div className="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleBlockDragEnd}
          >
            <SortableContext
              items={optimisticBlocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {optimisticBlocks.map((block) => (
                <BlockCard
                  key={block.id}
                  workoutId={workout.id}
                  block={block}
                  exercises={exercises}
                />
              ))}
            </SortableContext>
          </DndContext>

          {optimisticBlocks.length === 0 && !showNewBlockInput && (
            <div className="rounded-xl border border-dashed border-foreground/20 p-6 text-center">
              <p className="text-sm text-foreground/60">
                Commence en ajoutant un premier bloc.
              </p>
            </div>
          )}

          {showNewBlockInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder='ex. "Haut du corps"'
                value={newBlockName}
                onChange={(e) => setNewBlockName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddBlock();
                  if (e.key === "Escape") {
                    setShowNewBlockInput(false);
                    setNewBlockName("");
                  }
                }}
                autoFocus
                className="flex-1 rounded-xl border border-foreground/20 bg-transparent px-4 py-3 text-sm outline-none focus:border-foreground/50"
              />
              <button
                type="button"
                onClick={handleAddBlock}
                disabled={isPending}
                className="rounded-xl bg-foreground text-background px-4 text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                Ajouter
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewBlockInput(true)}
              className="w-full rounded-xl border border-dashed border-foreground/20 px-4 py-3 text-sm text-foreground/60 hover:bg-foreground/5 cursor-pointer transition-colors"
            >
              + Ajouter un bloc
            </button>
          )}
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={handleFinish}
            disabled={isPending}
            className="w-full rounded-xl bg-green-600 text-white py-3 font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            Terminer la séance
          </button>
        </div>
      </div>
    </main>
  );
}
