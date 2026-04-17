"use client";

import { useMemo, useState, useTransition } from "react";
import type { ExerciseListItem } from "@/lib/workouts/types";
import { formatDuration } from "@/lib/format";
import { addIntervalTemplateBlockAction } from "@/app/templates/actions";
import {
  PRESETS,
  defaultNameForPreset,
  PresetPicker,
  type Preset,
  type PlaybackOrder,
} from "./interval-dialog-presets";
import { CadenceFields } from "./interval-dialog-cadence";
import { PlaybackOrderPicker } from "./interval-dialog-playback";
import { PlaylistEditor } from "./interval-dialog-playlist";
import { SequenceEditor } from "./interval-dialog-sequence";
import { ExercisePool } from "./interval-dialog-exercise-picker";

type Props = {
  open: boolean;
  onClose: () => void;
  templateId: string;
  exercises: ExerciseListItem[];
};

export function IntervalBlockDialog({
  open,
  onClose,
  templateId,
  exercises,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [name, setName] = useState<string>("");
  const [workSecs, setWorkSecs] = useState<number>(PRESETS[0].workSecs);
  const [restSecs, setRestSecs] = useState<number>(PRESETS[0].restSecs);
  const [roundCount, setRoundCount] = useState<number>(PRESETS[0].roundCount);
  const [playbackOrder, setPlaybackOrder] = useState<PlaybackOrder>(
    PRESETS[0].playbackOrder,
  );
  // Ordered array of selected exercise IDs. The ORDER IS THE PLAYLIST.
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  // When playbackOrder=CUSTOM, one exerciseId per round.
  const [customSequence, setCustomSequence] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const exerciseById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e] as const)),
    [exercises],
  );

  const totalSecs = (workSecs + restSecs) * roundCount;
  const totalLabel = formatDuration(totalSecs);

  function handlePresetChange(next: Preset) {
    setPreset(next);
    setWorkSecs(next.workSecs);
    setRestSecs(next.restSecs);
    setRoundCount(next.roundCount);
    setPlaybackOrder(next.playbackOrder);
  }

  function toggleExercise(id: string) {
    setSelectedExerciseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function setSequenceSlot(index: number, exerciseId: string) {
    setCustomSequence((prev) => {
      const next = prev.slice();
      while (next.length <= index) {
        next.push(selectedExerciseIds[0] ?? "");
      }
      next[index] = exerciseId;
      return next;
    });
  }

  // Keep the custom sequence in sync when: switching to CUSTOM mode,
  // changing the round count, or changing the selected exercises.
  function syncCustomSequence() {
    const fallback = selectedExerciseIds[0];
    if (!fallback) return;
    setCustomSequence((prev) => {
      const next: string[] = [];
      for (let i = 0; i < roundCount; i++) {
        const existing = prev[i];
        if (existing && selectedExerciseIds.includes(existing)) {
          next.push(existing);
        } else {
          next.push(selectedExerciseIds[i % selectedExerciseIds.length]);
        }
      }
      return next;
    });
  }

  function handleRoundCountChange(n: number) {
    setRoundCount(n);
    if (playbackOrder === "CUSTOM") {
      setCustomSequence((prev) => {
        const fallback = selectedExerciseIds[0];
        if (!fallback) return prev;
        const next = prev.slice(0, n);
        while (next.length < n) {
          next.push(
            selectedExerciseIds[next.length % selectedExerciseIds.length] ??
              fallback,
          );
        }
        return next;
      });
    }
  }

  function canSubmit() {
    if (selectedExerciseIds.length === 0) return false;
    if (workSecs <= 0 || roundCount <= 0) return false;
    if (playbackOrder === "CUSTOM") {
      if (customSequence.length !== roundCount) return false;
      if (customSequence.some((id) => !id || !selectedExerciseIds.includes(id))) {
        return false;
      }
    }
    return !isPending;
  }

  function submit() {
    if (!canSubmit()) return;
    startTransition(async () => {
      await addIntervalTemplateBlockAction(templateId, {
        name: name.trim() || defaultNameForPreset(preset),
        format: preset.format,
        workSecs,
        restSecs,
        roundCount,
        playbackOrder,
        exerciseIds: selectedExerciseIds,
        customSequence: playbackOrder === "CUSTOM" ? customSequence : undefined,
      });
      onClose();
      resetForm();
    });
  }

  function resetForm() {
    setPreset(PRESETS[0]);
    setName("");
    setWorkSecs(PRESETS[0].workSecs);
    setRestSecs(PRESETS[0].restSecs);
    setRoundCount(PRESETS[0].roundCount);
    setPlaybackOrder(PRESETS[0].playbackOrder);
    setSelectedExerciseIds([]);
    setCustomSequence([]);
    setQuery("");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold">Nouveau bloc HIIT</h2>
            <p className="text-xs text-muted mt-0.5">Total: {totalLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Annuler
          </button>
        </header>

        <div className="p-5 space-y-5">
          <PresetPicker value={preset} onChange={handlePresetChange} />

          <CadenceFields
            workSecs={workSecs}
            restSecs={restSecs}
            roundCount={roundCount}
            onWorkChange={setWorkSecs}
            onRestChange={setRestSecs}
            onRoundCountChange={handleRoundCountChange}
          />

          <PlaybackOrderPicker
            value={playbackOrder}
            onChange={setPlaybackOrder}
            onPickCustom={() => {
              setPlaybackOrder("CUSTOM");
              if (selectedExerciseIds.length > 0) syncCustomSequence();
            }}
          />

          {/* Name override */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Nom du bloc
            </h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultNameForPreset(preset)}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
            />
          </section>

          {playbackOrder !== "CUSTOM" && (
            <PlaylistEditor
              selectedExerciseIds={selectedExerciseIds}
              playbackOrder={playbackOrder}
              exerciseById={exerciseById}
              onReorder={setSelectedExerciseIds}
              onRemove={toggleExercise}
            />
          )}

          {playbackOrder === "CUSTOM" && (
            <SequenceEditor
              selectedExerciseIds={selectedExerciseIds}
              customSequence={customSequence}
              roundCount={roundCount}
              exerciseById={exerciseById}
              onRemove={toggleExercise}
              onReorderSlots={setCustomSequence}
              onSetSlot={setSequenceSlot}
              onSyncCycle={syncCustomSequence}
            />
          )}

          <ExercisePool
            exercises={exercises}
            selectedExerciseIds={selectedExerciseIds}
            query={query}
            onQueryChange={setQuery}
            onToggle={toggleExercise}
          />
        </div>

        <footer className="sticky bottom-0 bg-background border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit()}
            className="w-full rounded-xl bg-accent text-white py-3 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Création…" : "Créer le bloc HIIT"}
          </button>
        </footer>
      </div>
    </div>
  );
}
