"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { ExerciseListItem, WorkoutDetail } from "@/lib/workouts/types";
import { formatShortDateTime } from "@/lib/format";
import {
  addBlockAction, bulkValidateWorkoutAction, finishWorkoutAction,
  renameWorkoutAction, reorderBlocksAction, setWorkoutStartedAtAction,
  updateNotesAction,
} from "@/app/sessions/actions";
import { BlockSection } from "./block-section";
import { IntervalBlockSection } from "./interval-block-section";
import { CompactRestTimer } from "./compact-rest-timer";
import { SessionTimer } from "./session-timer";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";

type Entry = WorkoutDetail["blocks"][number]["entries"][number];
type Props = { workout: WorkoutDetail; exercises: ExerciseListItem[]; defaultRestSecs?: number };

export function UnifiedSession({ workout, exercises, defaultRestSecs = 90 }: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [showNewBlockInput, setShowNewBlockInput] = useState(false);
  const [showNotes, setShowNotes] = useState(!!workout.notes);
  const [isPending, startTransition] = useTransition();
  const [restTimer, setRestTimer] = useState<{ durationSecs: number } | null>(null);
  const [optimisticBlocks, setOptimisticBlocks] = useState(workout.blocks);
  const [confirmFinish, setConfirmFinish] = useState(false);

  useEffect(() => { setOptimisticBlocks(workout.blocks); }, [workout.blocks]);

  // Entry-level progress only makes sense for STANDARD blocks. INTERVAL
  // blocks track completion via completedRounds / roundCount separately.
  const standardEntries = workout.blocks
    .filter((b) => b.mode !== "INTERVAL")
    .flatMap((b) => b.entries);
  const allEntries = workout.blocks.flatMap((b) => b.entries);
  const hasPlanned = standardEntries.some((e) => e.status === "PLANNED");
  const plannedCount = standardEntries.filter((e) => e.status === "PLANNED").length;
  const completedCount = standardEntries.filter((e) => e.status === "DONE" || e.status === "SKIPPED").length;
  const totalCount = standardEntries.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  // --- Retro logging: backdate + bulk-validate ---
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const startedDateLabel = formatShortDateTime(workout.startedAt);
  const startedLocalIso = toLocalDatetimeInputValue(workout.startedAt);

  function handleBulkValidate() {
    setConfirmBulk(false);
    startTransition(async () => {
      await bulkValidateWorkoutAction(workout.id);
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleBlockDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = optimisticBlocks.findIndex((b) => b.id === active.id);
    const newIndex = optimisticBlocks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(optimisticBlocks, oldIndex, newIndex);
    setOptimisticBlocks(reordered);
    startTransition(() => reorderBlocksAction(workout.id, reordered.map((b) => b.id)));
  }

  function handleAddBlock() {
    const name = newBlockName.trim() || "Nouveau bloc";
    startTransition(async () => {
      await addBlockAction(workout.id, name);
      setNewBlockName("");
      setShowNewBlockInput(false);
    });
  }

  function handleFinishClick() {
    const remaining = allEntries.filter((e) => e.status === "PLANNED").length;
    if (remaining > 0 || allEntries.length === 0) setConfirmFinish(true);
    else startTransition(() => finishWorkoutAction(workout.id));
  }

  function handleFinishConfirmed() {
    setConfirmFinish(false);
    startTransition(() => finishWorkoutAction(workout.id));
  }

  const handleEntryValidated = useCallback((entry: Entry) => {
    const rest = (entry.restDurationSecs && entry.restDurationSecs > 0)
      ? entry.restDurationSecs
      : defaultRestSecs;
    if (rest > 0) setRestTimer({ durationSecs: rest });
  }, [defaultRestSecs]);

  const handleRestComplete = useCallback(() => { setRestTimer(null); }, []);

  return (
    <main className="flex-1 flex flex-col px-4 py-6">
      <div className="max-w-2xl w-full mx-auto space-y-5" style={{ paddingBottom: restTimer ? 80 : 0 }}>
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            {isEditingName ? (
              <input type="text" defaultValue={workout.name} autoFocus
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== workout.name) startTransition(() => renameWorkoutAction(workout.id, next));
                  setIsEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
                className="w-full text-xl font-display font-bold bg-transparent outline-none border-b-2 border-accent"
              />
            ) : (
              <button type="button" onClick={() => setIsEditingName(true)}
                className="text-xl font-display font-bold cursor-pointer text-left hover:text-accent transition-colors block max-w-full truncate">
                {workout.name}
              </button>
            )}
            {!workout.finishedAt && <SessionTimer startedAt={workout.startedAt} />}
            {/* Backdate affordance. Clicking the date opens a native
                datetime-local input; onBlur saves server-side. */}
            {isEditingDate ? (
              <input
                type="datetime-local"
                defaultValue={startedLocalIso}
                autoFocus
                onBlur={(e) => {
                  const raw = e.target.value;
                  setIsEditingDate(false);
                  if (!raw) return;
                  const iso = new Date(raw).toISOString();
                  startTransition(() => setWorkoutStartedAtAction(workout.id, iso));
                }}
                className="text-xs bg-transparent border-b border-accent outline-none text-muted"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingDate(true)}
                className="text-xs text-subtle hover:text-accent cursor-pointer transition-colors"
                title="Modifier la date de la s\u00e9ance"
              >
                {startedDateLabel}
              </button>
            )}
          </div>
          <Link href="/dashboard" className="text-xs text-muted hover:text-foreground transition-colors py-1 whitespace-nowrap">
            &larr; Retour
          </Link>
        </header>

        {/* Progress */}
        {hasPlanned && totalCount > 0 && (
          <div className="space-y-1">
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="text-xs text-muted text-right tabular-nums">{completedCount} / {totalCount}</p>
          </div>
        )}

        {/* Notes */}
        {showNotes ? (
          <textarea defaultValue={workout.notes ?? ""} placeholder="Notes..." rows={2}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val !== (workout.notes ?? "")) startTransition(() => updateNotesAction(workout.id, val));
            }}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm resize-none focus:outline-none focus:border-accent transition-colors"
          />
        ) : (
          <button type="button" onClick={() => setShowNotes(true)}
            className="text-xs text-muted hover:text-accent cursor-pointer transition-colors">
            + Ajouter des notes
          </button>
        )}

        {/* Blocks */}
        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
            <SortableContext items={optimisticBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {optimisticBlocks.map((block) =>
                block.mode === "INTERVAL" ? (
                  <IntervalBlockSection
                    key={block.id}
                    workoutId={workout.id}
                    block={block}
                  />
                ) : (
                  <BlockSection
                    key={block.id}
                    workoutId={workout.id}
                    block={block}
                    exercises={exercises}
                    onEntryValidated={handleEntryValidated}
                  />
                ),
              )}
            </SortableContext>
          </DndContext>

          {optimisticBlocks.length === 0 && !showNewBlockInput && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted">Commence en ajoutant un premier bloc.</p>
            </div>
          )}

          {showNewBlockInput ? (
            <div className="flex gap-2">
              <input type="text" placeholder='ex. "Haut du corps"' value={newBlockName}
                onChange={(e) => setNewBlockName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddBlock();
                  if (e.key === "Escape") { setShowNewBlockInput(false); setNewBlockName(""); }
                }}
                autoFocus
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
              />
              <button type="button" onClick={handleAddBlock} disabled={isPending}
                className="rounded-xl bg-accent text-white px-5 text-sm font-medium disabled:opacity-50 cursor-pointer hover:bg-accent-hover transition-colors">
                Ajouter
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowNewBlockInput(true)}
              className="w-full rounded-xl border border-dashed border-border px-4 py-3.5 text-sm text-muted hover:text-accent hover:border-accent/40 cursor-pointer transition-colors">
              + Ajouter un bloc
            </button>
          )}
        </div>

        {/* Quick retro validation: visible only when there's still
            planned work to flip and the workout isn't empty. Single
            click logs a session that went as planned. */}
        {plannedCount > 0 && totalCount > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setConfirmBulk(true)}
              disabled={isPending}
              className="w-full rounded-xl border border-accent/40 bg-accent/5 text-accent py-2.5 text-sm font-medium hover:bg-accent/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              Tout valider comme pr&eacute;vu ({plannedCount} s&eacute;rie{plannedCount > 1 ? "s" : ""})
            </button>
          </div>
        )}

        {/* Finish */}
        <div className="pt-2">
          <button type="button" onClick={handleFinishClick} disabled={isPending}
            className="w-full rounded-xl bg-done text-white py-3.5 font-semibold hover:bg-done/90 transition-colors cursor-pointer disabled:opacity-50">
            Terminer la s&eacute;ance
          </button>
        </div>
      </div>

      {restTimer && <CompactRestTimer durationSecs={restTimer.durationSecs} onComplete={handleRestComplete} />}

      <ConfirmDialog open={confirmFinish} title="Terminer la s\u00e9ance"
        message={allEntries.length === 0
          ? "Cette s\u00e9ance est vide. Terminer quand m\u00eame ?"
          : `Il reste ${allEntries.filter((e) => e.status === "PLANNED").length} entr\u00e9e(s) non valid\u00e9e(s). Terminer ?`}
        confirmLabel="Terminer" onConfirm={handleFinishConfirmed} onCancel={() => setConfirmFinish(false)}
      />
      <ConfirmDialog
        open={confirmBulk}
        title="Tout valider comme prévu"
        message={`Toutes les ${plannedCount} entrées planifiées seront marquées comme réalisées avec les valeurs du modèle. Tu peux toujours corriger série par série ensuite.`}
        confirmLabel="Valider tout"
        onConfirm={handleBulkValidate}
        onCancel={() => setConfirmBulk(false)}
      />
    </main>
  );
}

/**
 * Format a Date as the value a <input type="datetime-local"> expects.
 * Browsers ignore timezone info in this input type, so we must produce
 * the user's local wall-clock time as YYYY-MM-DDTHH:MM (no trailing Z).
 */
function toLocalDatetimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}
