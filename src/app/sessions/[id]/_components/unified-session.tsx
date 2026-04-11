"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
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
  updateNotesAction,
} from "@/app/sessions/actions";
import { BlockSection } from "./block-section";
import { CompactRestTimer } from "./compact-rest-timer";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";

type Entry = WorkoutDetail["blocks"][number]["entries"][number];

type Props = {
  workout: WorkoutDetail;
  exercises: ExerciseListItem[];
};

export function UnifiedSession({ workout, exercises }: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [showNewBlockInput, setShowNewBlockInput] = useState(false);
  const [showNotes, setShowNotes] = useState(!!workout.notes);
  const [isPending, startTransition] = useTransition();
  const [restTimer, setRestTimer] = useState<{
    durationSecs: number;
  } | null>(null);

  // Optimistic block ordering
  const [optimisticBlocks, setOptimisticBlocks] = useState(workout.blocks);
  useEffect(() => {
    setOptimisticBlocks(workout.blocks);
  }, [workout.blocks]);

  // Progress tracking for template-based sessions
  const allEntries = workout.blocks.flatMap((b) => b.entries);
  const hasPlanned = allEntries.some((e) => e.status === "PLANNED");
  const completedCount = allEntries.filter(
    (e) => e.status === "DONE" || e.status === "SKIPPED",
  ).length;
  const totalCount = allEntries.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
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

  const [confirmFinish, setConfirmFinish] = useState(false);

  function handleFinishClick() {
    const remaining = allEntries.filter((e) => e.status === "PLANNED").length;
    if (remaining > 0 || allEntries.length === 0) {
      setConfirmFinish(true);
    } else {
      startTransition(() => finishWorkoutAction(workout.id));
    }
  }

  function handleFinishConfirmed() {
    setConfirmFinish(false);
    startTransition(() => finishWorkoutAction(workout.id));
  }

  const handleEntryValidated = useCallback((entry: Entry) => {
    if (entry.restDurationSecs && entry.restDurationSecs > 0) {
      setRestTimer({ durationSecs: entry.restDurationSecs });
    }
  }, []);

  const handleRestComplete = useCallback(() => {
    setRestTimer(null);
  }, []);

  return (
    <main className="flex-1 flex flex-col px-4 py-6">
      <div
        className="max-w-2xl w-full mx-auto space-y-5"
        style={{ paddingBottom: restTimer ? 72 : 0 }}
      >
        {/* Header */}
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
            className="text-xs text-foreground/60 hover:text-foreground whitespace-nowrap p-2 -mr-2"
          >
            ← Dashboard
          </Link>
        </header>

        {/* Progress bar for template-based sessions */}
        {hasPlanned && totalCount > 0 && (
          <div className="space-y-1">
            <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="text-xs text-foreground/40 text-right">
              {completedCount} / {totalCount}
            </p>
          </div>
        )}

        {/* Notes */}
        {showNotes ? (
          <textarea
            defaultValue={workout.notes ?? ""}
            placeholder="Notes sur cette séance..."
            rows={2}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val !== (workout.notes ?? "")) {
                startTransition(() => updateNotesAction(workout.id, val));
              }
            }}
            className="w-full rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-sm resize-none focus:outline-none focus:border-foreground/30"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="text-xs text-foreground/40 hover:text-foreground/70 cursor-pointer transition-colors"
          >
            + Ajouter des notes
          </button>
        )}

        {/* Blocks */}
        <div className="space-y-4">
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
                <BlockSection
                  key={block.id}
                  workoutId={workout.id}
                  block={block}
                  exercises={exercises}
                  onEntryValidated={handleEntryValidated}
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

        {/* Finish button */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleFinishClick}
            disabled={isPending}
            className="w-full rounded-xl bg-green-600 text-white py-3 font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            Terminer la séance
          </button>
        </div>
      </div>

      {/* Compact rest timer */}
      {restTimer && (
        <CompactRestTimer
          durationSecs={restTimer.durationSecs}
          onComplete={handleRestComplete}
        />
      )}

      <ConfirmDialog
        open={confirmFinish}
        title="Terminer la séance"
        message={
          allEntries.length === 0
            ? "Cette séance est vide. Terminer quand même ?"
            : `Il reste ${allEntries.filter((e) => e.status === "PLANNED").length} entrée(s) non validée(s). Terminer ?`
        }
        confirmLabel="Terminer"
        onConfirm={handleFinishConfirmed}
        onCancel={() => setConfirmFinish(false)}
      />
    </main>
  );
}
