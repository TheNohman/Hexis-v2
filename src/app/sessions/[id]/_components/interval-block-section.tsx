"use client";

import { useState } from "react";
import type { WorkoutDetail } from "@/lib/workouts/types";
import { formatDuration } from "@/lib/format";
import { Stat } from "@/app/_components/stat";
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
      <section className="rounded-2xl bg-surface shadow-card overflow-hidden border border-accent/20">
        <header className="px-4 py-3 border-b border-border bg-accent-light flex items-center gap-2">
          <span aria-hidden="true">🔥</span>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink">
            {labelForFormat(block.intervalFormat)}
          </p>
          <span className="text-sm font-semibold truncate text-foreground">— {block.name}</span>
        </header>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Effort" value={`${workSecs}s`} dense />
            <Stat label="Repos" value={`${restSecs}s`} dense />
            <Stat
              label="Rounds"
              value={`${block.completedRounds}/${rounds}`}
              dense
              variant={done ? "done" : "default"}
            />
            <Stat label="Total" value={formatDuration(totalSecs)} dense />
          </div>

          {playlist.length > 0 && (
            <div className="border-t border-border pt-2">
              <p className="text-[10px] uppercase tracking-widest text-muted mb-1 font-semibold">
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
            className="w-full rounded-xl bg-accent text-accent-foreground py-3.5 font-bold tracking-wide uppercase text-sm cursor-pointer hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

