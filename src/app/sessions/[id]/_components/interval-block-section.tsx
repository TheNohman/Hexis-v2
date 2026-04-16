"use client";

import { useState } from "react";
import type { WorkoutDetail } from "@/lib/workouts/types";
import { IntervalRunner } from "./interval-runner";

type Block = WorkoutDetail["blocks"][number];

type Props = {
  workoutId: string;
  block: Block;
};

/**
 * Rendering for an INTERVAL (HIIT) block inside a live session. Unlike a
 * standard block which exposes each set, this renders as a summary card
 * with a single "Démarrer le circuit" CTA that hands off to the
 * full-screen IntervalRunner.
 */
export function IntervalBlockSection({ workoutId, block }: Props) {
  const [running, setRunning] = useState(false);

  const workSecs = block.workSecs ?? 0;
  const restSecs = block.restSecs ?? 0;
  const rounds = block.roundCount ?? 0;
  const totalSecs = (workSecs + restSecs) * rounds;
  const done = block.completedRounds >= rounds && rounds > 0;

  const playlist = block.entries
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((e) => e.exercise);

  return (
    <>
      <section className="rounded-2xl border border-accent/30 bg-accent/5 overflow-hidden">
        <header className="px-4 py-3 border-b border-accent/20 flex items-center gap-2">
          <span>🔥</span>
          <p className="text-xs uppercase tracking-wider font-semibold text-accent">
            {labelForFormat(block.intervalFormat)}
          </p>
          <span className="text-sm font-semibold truncate">— {block.name}</span>
        </header>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Effort" value={`${workSecs}s`} />
            <Stat label="Repos" value={`${restSecs}s`} />
            <Stat label="Rounds" value={`${block.completedRounds}/${rounds}`} highlight={done} />
            <Stat label="Total" value={formatDuration(totalSecs)} />
          </div>

          {playlist.length > 0 && (
            <div className="border-t border-accent/10 pt-2">
              <p className="text-[11px] uppercase tracking-wider text-muted mb-1">
                Playlist ({playlist.length})
              </p>
              <p className="text-xs text-muted truncate">
                {playlist.map((p) => p.name).join(" · ")}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setRunning(true)}
            disabled={playlist.length === 0}
            className={`w-full rounded-xl py-3.5 font-bold tracking-wide uppercase text-sm cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              done
                ? "bg-done text-white hover:bg-done/90"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {done ? "Relancer le circuit" : "Démarrer le circuit"}
          </button>
        </div>
      </section>

      {running && (
        <IntervalRunner
          workoutId={workoutId}
          block={block}
          onClose={() => setRunning(false)}
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg py-2 border ${
        highlight ? "border-done/40 bg-done/10" : "border-border bg-surface"
      }`}
    >
      <p className={`text-sm font-bold tabular-nums ${highlight ? "text-done" : ""}`}>
        {value}
      </p>
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
