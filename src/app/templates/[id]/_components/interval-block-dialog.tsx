"use client";

import { useMemo, useState, useTransition } from "react";
import { GripVertical, X as XIcon } from "lucide-react";
import type { ExerciseListItem } from "@/lib/workouts/types";
import { formatDuration } from "@/lib/format";
import { addIntervalTemplateBlockAction } from "@/app/templates/actions";
import { SortableList } from "@/app/_components/sortable-list";

type Props = {
  open: boolean;
  onClose: () => void;
  templateId: string;
  exercises: ExerciseListItem[];
};

type PlaybackOrder = "CYCLE" | "SAME" | "CUSTOM";

type Preset = {
  id: "tabata" | "intervals" | "emom-style" | "custom";
  label: string;
  emoji: string;
  description: string;
  format: "TABATA" | "INTERVALS";
  workSecs: number;
  restSecs: number;
  roundCount: number;
  playbackOrder: PlaybackOrder;
};

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
    setSelectedExerciseIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  function setSequenceSlot(index: number, exerciseId: string) {
    setCustomSequence((prev) => {
      const next = prev.slice();
      // Pad if necessary so we can always set index reliably.
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
          // Default when no prior value: cycle through selected.
          next.push(selectedExerciseIds[i % selectedExerciseIds.length]);
        }
      }
      return next;
    });
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
                    <p className="text-[11px] text-muted mt-1">{p.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Cadence */}
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
                onChange={(n) => {
                  setRoundCount(n);
                  if (playbackOrder === "CUSTOM") {
                    setCustomSequence((prev) => {
                      const fallback = selectedExerciseIds[0];
                      if (!fallback) return prev;
                      const next = prev.slice(0, n);
                      while (next.length < n) {
                        next.push(selectedExerciseIds[next.length % selectedExerciseIds.length] ?? fallback);
                      }
                      return next;
                    });
                  }
                }}
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
            <div className="grid grid-cols-3 gap-2">
              <OrderButton
                active={playbackOrder === "CYCLE"}
                title="Cycle"
                subtitle="A → B → C → A…"
                onClick={() => setPlaybackOrder("CYCLE")}
              />
              <OrderButton
                active={playbackOrder === "SAME"}
                title="Même exo"
                subtitle="1er exo × tous"
                onClick={() => setPlaybackOrder("SAME")}
              />
              <OrderButton
                active={playbackOrder === "CUSTOM"}
                title="Personnalisé"
                subtitle="Round par round"
                onClick={() => {
                  setPlaybackOrder("CUSTOM");
                  // Initialise the sequence the first time we switch.
                  if (selectedExerciseIds.length > 0) syncCustomSequence();
                }}
              />
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

          {/* Playlist (CYCLE / SAME) — draggable, defines the cycle order
              (CYCLE) or the single played exo (SAME). Hidden in CUSTOM
              mode where the per-round sequence below drives everything. */}
          {playbackOrder !== "CUSTOM" && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center justify-between">
                <span>
                  {playbackOrder === "SAME"
                    ? `Exercice (${selectedExerciseIds.length})`
                    : `Playlist (${selectedExerciseIds.length})`}
                </span>
                {playbackOrder === "CYCLE" && selectedExerciseIds.length > 1 && (
                  <span className="text-[10px] normal-case text-subtle">
                    Glisse pour réordonner
                  </span>
                )}
              </h3>
              {selectedExerciseIds.length === 0 ? (
                <p className="text-xs text-subtle italic">
                  Choisis au moins un exercice ci-dessous.
                </p>
              ) : (
                <SortableList
                  items={selectedExerciseIds}
                  keyFor={(id) => id}
                  onReorder={setSelectedExerciseIds}
                  className="space-y-1 rounded-xl border border-border bg-surface p-2"
                  renderItem={(id, i, handle) => (
                    <li className="flex items-center gap-2 rounded-lg bg-background border border-border/50 pl-1 pr-2 py-1.5">
                      <button
                        type="button"
                        {...handle.attributes}
                        {...handle.listeners}
                        aria-label="Déplacer"
                        className="cursor-grab active:cursor-grabbing text-subtle hover:text-foreground px-2 py-1 touch-none"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-mono text-subtle w-5 text-center">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-sm truncate">
                        {exerciseById.get(id)?.name ?? id}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExercise(id)}
                        className="text-xs text-danger hover:underline cursor-pointer"
                      >
                        Retirer
                      </button>
                    </li>
                  )}
                />
              )}
            </section>
          )}

          {/* Custom sequence editor — in CUSTOM mode this section replaces
              the playlist and is the single source of truth. A compact
              chip row above shows which exos are in the pool with a
              remove affordance, so the Playlist section stays useful
              only when its ORDER matters (CYCLE / SAME). */}
          {playbackOrder === "CUSTOM" && (
            <section className="space-y-3">
              {selectedExerciseIds.length === 0 ? (
                <p className="text-xs text-subtle italic">
                  Choisis au moins un exercice ci-dessous.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExerciseIds.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs"
                      >
                        {exerciseById.get(id)?.name ?? id}
                        <button
                          type="button"
                          onClick={() => toggleExercise(id)}
                          aria-label="Retirer"
                          className="text-subtle hover:text-danger cursor-pointer"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Séquence des rounds
                    </h3>
                    <button
                      type="button"
                      onClick={syncCustomSequence}
                      className="text-[10px] normal-case text-accent hover:underline cursor-pointer"
                    >
                      Pré-remplir en cycle
                    </button>
                  </div>
                  <p className="text-[11px] text-subtle -mt-1">
                    Glisse les slots pour réordonner ou sélectionne un exo différent par round.
                  </p>

                  <SortableList
                    items={Array.from({ length: roundCount }).map((_, i) => ({
                      slotIndex: i,
                      exerciseId:
                        customSequence[i] ??
                        selectedExerciseIds[i % selectedExerciseIds.length] ??
                        "",
                    }))}
                    keyFor={(slot) => `seq-${slot.slotIndex}`}
                    onReorder={(next) =>
                      // Rebuild customSequence from the reordered slots.
                      setCustomSequence(next.map((s) => s.exerciseId))
                    }
                    className="space-y-1 rounded-xl border border-border bg-surface p-2"
                    renderItem={(slot, i, handle) => (
                      <li className="flex items-center gap-2 rounded-lg bg-background border border-border/50 pl-1 pr-2 py-1.5">
                        <button
                          type="button"
                          {...handle.attributes}
                          {...handle.listeners}
                          aria-label="Déplacer ce round"
                          className="cursor-grab active:cursor-grabbing text-subtle hover:text-foreground px-2 py-1 touch-none"
                        >
                          ⠿
                        </button>
                        <span className="text-[10px] font-mono text-accent w-10 text-center">
                          R{String(i + 1).padStart(2, "0")}
                        </span>
                        <select
                          value={slot.exerciseId}
                          onChange={(e) => setSequenceSlot(i, e.target.value)}
                          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent"
                        >
                          {selectedExerciseIds.map((id) => (
                            <option key={id} value={id}>
                              {exerciseById.get(id)?.name ?? id}
                            </option>
                          ))}
                        </select>
                      </li>
                    )}
                  />
                </>
              )}
            </section>
          )}

          {/* Exercise picker (pool) */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Ajouter un exercice
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
                      {active ? (
                        <span className="text-xs text-accent">✓ ajouté</span>
                      ) : (
                        <span className="text-xs text-subtle">+</span>
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

// ─── Sub-components ───────────────────────────────────────────────────

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

function OrderButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-3 cursor-pointer transition-all ${
        active
          ? "border-accent bg-accent/10 ring-2 ring-accent/30"
          : "border-border bg-surface hover:border-accent/40"
      }`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>
    </button>
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

