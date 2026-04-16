"use client";

import { useMemo, useState, useTransition } from "react";
import type { ExerciseListItem } from "@/lib/workouts/types";
import { addIntervalTemplateBlockAction } from "@/app/templates/actions";

type Props = {
  open: boolean;
  onClose: () => void;
  templateId: string;
  exercises: ExerciseListItem[];
};

type Preset = {
  id: "tabata" | "intervals" | "emom-style" | "custom";
  label: string;
  emoji: string;
  description: string;
  format: "TABATA" | "INTERVALS";
  workSecs: number;
  restSecs: number;
  roundCount: number;
  playbackOrder: "CYCLE" | "SAME";
};

// Keep this list tight — 3-4 well-named presets beats a fully configurable UI
// for first-time users. "Custom" falls back to editing every field.
const PRESETS: Preset[] = [
  {
    id: "tabata",
    label: "Tabata classique",
    emoji: "🔥",
    description: "20 s effort / 10 s repos × 8 = 4 min",
    format: "TABATA",
    workSecs: 20,
    restSecs: 10,
    roundCount: 8,
    playbackOrder: "SAME",
  },
  {
    id: "intervals",
    label: "Intervalles 30/30",
    emoji: "⚡",
    description: "30 s effort / 30 s repos — 10 rounds",
    format: "INTERVALS",
    workSecs: 30,
    restSecs: 30,
    roundCount: 10,
    playbackOrder: "CYCLE",
  },
  {
    id: "emom-style",
    label: "HIIT 40/20",
    emoji: "💥",
    description: "40 s effort / 20 s repos — 8 rounds",
    format: "INTERVALS",
    workSecs: 40,
    restSecs: 20,
    roundCount: 8,
    playbackOrder: "CYCLE",
  },
  {
    id: "custom",
    label: "Personnalisé",
    emoji: "⚙️",
    description: "Configure tout à la main.",
    format: "INTERVALS",
    workSecs: 30,
    restSecs: 15,
    roundCount: 6,
    playbackOrder: "CYCLE",
  },
];

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
  const [playbackOrder, setPlaybackOrder] = useState<"CYCLE" | "SAME">(
    PRESETS[0].playbackOrder,
  );
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const totalSecs = (workSecs + restSecs) * roundCount;
  const totalLabel = formatDuration(totalSecs);

  const filteredExercises = useMemo(() => {
    if (!query.trim()) return exercises;
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query]);

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

  function canSubmit() {
    return (
      workSecs > 0 &&
      restSecs >= 0 &&
      roundCount > 0 &&
      selectedExerciseIds.length > 0 &&
      !isPending
    );
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
          {/* Presets */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Format
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const active = preset.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetChange(p)}
                    className={`text-left rounded-xl border p-3 cursor-pointer transition-all ${
                      active
                        ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                        : "border-border bg-surface hover:border-accent/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{p.emoji}</span>
                      <p className="text-sm font-semibold">{p.label}</p>
                    </div>
                    <p className="text-[11px] text-muted mt-1">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Config (editable regardless of preset for full control) */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Cadence
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label="Effort (s)"
                value={workSecs}
                onChange={setWorkSecs}
                min={1}
                max={600}
              />
              <NumberField
                label="Repos (s)"
                value={restSecs}
                onChange={setRestSecs}
                min={0}
                max={300}
              />
              <NumberField
                label="Rounds"
                value={roundCount}
                onChange={setRoundCount}
                min={1}
                max={50}
              />
            </div>
          </section>

          {/* Playback order */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Répartition des exercices
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlaybackOrder("CYCLE")}
                className={`text-left rounded-xl border p-3 cursor-pointer transition-all ${
                  playbackOrder === "CYCLE"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface hover:border-accent/40"
                }`}
              >
                <p className="text-sm font-semibold">Cycle</p>
                <p className="text-[11px] text-muted">
                  A → B → C → A → B → C…
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPlaybackOrder("SAME")}
                className={`text-left rounded-xl border p-3 cursor-pointer transition-all ${
                  playbackOrder === "SAME"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface hover:border-accent/40"
                }`}
              >
                <p className="text-sm font-semibold">Même exercice</p>
                <p className="text-[11px] text-muted">
                  Le premier exo tout du long
                </p>
              </button>
            </div>
          </section>

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

          {/* Exercise picker */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Exercices ({selectedExerciseIds.length} sélectionné
              {selectedExerciseIds.length > 1 ? "s" : ""})
            </h3>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
            />
            <ul className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border bg-surface p-2">
              {filteredExercises.length === 0 && (
                <li className="text-xs text-subtle text-center py-4">
                  Aucun exercice trouvé.
                </li>
              )}
              {filteredExercises.map((ex) => {
                const active = selectedExerciseIds.includes(ex.id);
                const position = selectedExerciseIds.indexOf(ex.id);
                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => toggleExercise(ex.id)}
                      className={`w-full text-left rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                        active
                          ? "bg-accent/15 text-foreground"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <span className="text-sm">{ex.name}</span>
                      {active && (
                        <span className="text-xs font-mono text-accent">
                          #{position + 1}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
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

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        inputMode="numeric"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent transition-colors tabular-nums"
      />
    </label>
  );
}

function defaultNameForPreset(p: Preset): string {
  switch (p.id) {
    case "tabata":
      return "Tabata";
    case "intervals":
      return "Intervalles 30/30";
    case "emom-style":
      return "HIIT 40/20";
    case "custom":
      return "Bloc HIIT";
  }
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m} min ${s > 0 ? `${s} s` : ""}`.trim() : `${s} s`;
}
