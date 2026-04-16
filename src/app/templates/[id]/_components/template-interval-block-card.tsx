"use client";

import { useTransition } from "react";
import type { ExerciseListItem } from "@/lib/workouts/types";
import type { TemplateDetail } from "@/lib/templates/types";
import { deleteTemplateBlockAction } from "@/app/templates/actions";

type Block = TemplateDetail["blocks"][number];

type Props = {
  templateId: string;
  block: Block;
  exercises: ExerciseListItem[];
};

/**
 * Read-only card for an INTERVAL-mode block inside the template editor.
 * Shows the cadence (Tabata 20/10×8), the playlist of exercises, and
 * the total duration. Deletion is the only mutation — editing rounds
 * or exercises requires removing and re-creating the block (keeps UI
 * simple and predictable).
 */
export function TemplateIntervalBlockCard({ templateId, block, exercises }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Supprimer le bloc "${block.name}" ?`)) return;
    startTransition(() => deleteTemplateBlockAction(templateId, block.id));
  }

  const workSecs = block.workSecs ?? 0;
  const restSecs = block.restSecs ?? 0;
  const rounds = block.roundCount ?? 0;
  const totalSecs = (workSecs + restSecs) * rounds;

  const exerciseById = new Map(exercises.map((e) => [e.id, e] as const));
  const playlist = block.entries
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((e) => exerciseById.get(e.exercise.id) ?? e.exercise);

  const formatLabel = labelForFormat(block.intervalFormat);

  return (
    <article className="rounded-2xl border border-accent/30 bg-accent/5 overflow-hidden">
      <header className="px-4 py-3 border-b border-accent/20 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🔥</span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-accent font-semibold">
              {formatLabel}
            </p>
            <h3 className="font-semibold truncate">{block.name}</h3>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs text-danger hover:underline cursor-pointer disabled:opacity-50"
        >
          Supprimer
        </button>
      </header>

      <div className="px-4 py-3 space-y-2">
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Effort" value={`${workSecs}s`} />
          <Stat label="Repos" value={`${restSecs}s`} />
          <Stat label="Rounds" value={`${rounds}`} />
          <Stat label="Total" value={formatDuration(totalSecs)} />
        </div>

        <div className="pt-2 border-t border-accent/10">
          <p className="text-[11px] uppercase tracking-wider text-muted mb-1.5">
            Exercices ({playlist.length})
            {block.playbackOrder === "SAME" && " — répétés"}
            {block.playbackOrder === "CYCLE" && playlist.length > 1 && " — en cycle"}
          </p>
          <ol className="space-y-1">
            {playlist.map((ex, i) => (
              <li key={`${ex.id}-${i}`} className="flex items-center gap-2 text-sm">
                <span className="text-[10px] font-mono text-subtle w-4">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate">{ex.name}</span>
              </li>
            ))}
            {playlist.length === 0 && (
              <li className="text-xs text-subtle">Aucun exercice sélectionné.</li>
            )}
          </ol>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface border border-border py-2">
      <p className="text-sm font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
    </div>
  );
}

function labelForFormat(f: Block["intervalFormat"]): string {
  switch (f) {
    case "TABATA":
      return "Tabata";
    case "INTERVALS":
      return "Intervalles";
    case "EMOM":
      return "EMOM";
    case "AMRAP":
      return "AMRAP";
    default:
      return "HIIT";
  }
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}min` : `${m}m${String(s).padStart(2, "0")}`;
}
