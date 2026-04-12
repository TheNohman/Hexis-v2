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

  const [optimisticBlocks, setOptimisticBlocks] = useState(workout.blocks);
  useEffect(() => {
    setOptimisticBlocks(workout.blocks);
  }, [workout.blocks]);

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
        className="max-w-2xl w-full mx-auto space-y-6"
        style={{ paddingBottom: restTimer ? 80 : 0 }}
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
              className="flex-1 text-2xl font-display font-bold bg-transparent outline-none border-b-2 border-accent/50"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="text-2xl font-display font-bold cursor-pointer text-left hover:text-accent transition-colors"
            >
              {workout.name}
            </button>
          )}
          <Link
            href="/dashboard"
            className="text-xs text-subtle hover:text-foreground whitespace-nowrap px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            &larr; Retour
          </Link>
        </header>

        {/* Progress bar */}
        {hasPlanned && totalCount > 0 && (
          <div className="space-y-1.5">
            <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="text-xs text-subtle text-right tabular-nums font-medium">
              {completedCount} / {totalCount}
            </p>
          </div>
        )}

        {/* Notes */}
        {showNotes ? (
          <textarea
            defaultValue={workout.notes ?? ""}
            placeholder="Notes sur cette s\u00e9ance..."
            rows={2}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val !== (workout.notes ?? "")) {
                startTransition(() => updateNotesAction(workout.id, val));
              }
            }}
            className="w-full rounded-2xl border border-surface-border bg-surface px-4 py-3 text-sm resize-none focus:outline-none focus:border-accent/50 transition-colors"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="text-xs text-subtle hover:text-accent cursor-pointer transition-colors"
          >
            + Ajouter des notes
          </button>
        )}

        {/* Blocks */}
        <div className="space-y-5">
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
            <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center">
              <p className="text-sm text-muted">
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
                className="flex-1 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddBlock}
                disabled={isPending}
                className="rounded-xl bg-accent text-background px-5 text-sm font-bold disabled:opacity-50 cursor-pointer hover:bg-accent-dark transition-colors"
              >
                Ajouter
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewBlockInput(true)}
              className="w-full rounded-2xl border border-dashed border-surface-border px-4 py-4 text-sm text-subtle hover:text-accent hover:border-accent/30 cursor-pointer transition-colors"
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
            className="w-full rounded-2xl bg-done text-white py-4 font-bold tracking-wide hover:bg-done/90 transition-colors cursor-pointer disabled:opacity-50 uppercase"
          >
            Terminer la s&eacute;ance
          </button>
        </div>
      </div>

      {restTimer && (
        <CompactRestTimer
          durationSecs={restTimer.durationSecs}
          onComplete={handleRestComplete}
        />
      )}

      <ConfirmDialog
        open={confirmFinish}
        title="Terminer la s\u00e9ance"
        message={
          allEntries.length === 0
            ? "Cette s\u00e9ance est vide. Terminer quand m\u00eame ?"
            : `Il reste ${allEntries.filter((e) => e.status === "PLANNED").length} entr\u00e9e(s) non valid\u00e9e(s). Terminer ?`
        }
        confirmLabel="Terminer"
        onConfirm={handleFinishConfirmed}
        onCancel={() => setConfirmFinish(false)}
      />
    </main>
  );
}
