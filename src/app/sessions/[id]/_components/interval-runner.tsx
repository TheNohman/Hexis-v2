"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { WorkoutDetail } from "@/lib/workouts/types";
import {
  completeIntervalRoundAction,
  resetIntervalBlockAction,
} from "@/app/sessions/actions";

type Block = WorkoutDetail["blocks"][number];

type Props = {
  workoutId: string;
  block: Block;
  onClose: () => void;
};

type Phase = "GET_READY" | "WORK" | "REST" | "DONE";

/**
 * Full-screen interval timer. Takes over the viewport while the user is
 * running a HIIT block. Handles:
 *   - GET_READY countdown (10s lead-in, configurable per block)
 *   - WORK → REST → WORK alternation for N rounds
 *   - Audio cues via WebAudio (3-2-1 countdown + transition bip)
 *   - Wake lock so the screen doesn't sleep mid-workout
 *   - Pause / resume
 *   - Server-side round persistence via completeIntervalRoundAction
 */
export function IntervalRunner({ workoutId, block, onClose }: Props) {
  const rounds = block.roundCount ?? 0;
  const workSecs = block.workSecs ?? 20;
  const restSecs = block.restSecs ?? 10;
  const leadSecs = block.countdownLeadSecs ?? 10;

  const playlist = useMemo(
    () =>
      block.entries
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((e) => e.exercise),
    [block.entries],
  );

  const [phase, setPhase] = useState<Phase>("GET_READY");
  const [currentRound, setCurrentRound] = useState<number>(
    block.completedRounds ?? 0,
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(leadSecs);
  const [paused, setPaused] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  // Keep a ref to always-latest values inside the interval tick.
  const phaseRef = useRef(phase);
  const pausedRef = useRef(paused);
  phaseRef.current = phase;
  pausedRef.current = paused;

  // --- Audio (WebAudio beeps) ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        audioCtxRef.current = new Ctx();
      } catch {
        return null;
      }
    }
    return audioCtxRef.current;
  }, []);

  const beep = useCallback(
    (freq: number, durMs: number, volume = 0.15) => {
      const ctx = ensureAudio();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime;
      osc.start(start);
      osc.stop(start + durMs / 1000);
    },
    [ensureAudio],
  );

  // --- Wake lock ---
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    async function lock() {
      try {
        const wl = (navigator as Navigator & {
          wakeLock?: { request(type: "screen"): Promise<WakeLockSentinel> };
        }).wakeLock;
        if (wl) {
          sentinel = await wl.request("screen");
        }
      } catch {
        /* ignore — not all browsers support it */
      }
    }
    lock();
    return () => {
      try {
        sentinel?.release();
      } catch {
        /* ignore */
      }
    };
  }, []);

  // --- Main tick loop ---
  useEffect(() => {
    if (phase === "DONE") return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setSecondsLeft((s) => {
        // Countdown beep on last 3 ticks of each phase except GET_READY's
        // very first seconds.
        if (s <= 3 && s > 0 && phaseRef.current !== "DONE") {
          beep(800, 80);
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, beep]);

  // --- Phase transitions when secondsLeft hits 0 ---
  useEffect(() => {
    if (secondsLeft > 0) return;
    if (phase === "DONE") return;

    beep(1200, 250);

    if (phase === "GET_READY") {
      setPhase("WORK");
      setSecondsLeft(workSecs);
      setCurrentRound(0); // WORK round 1 starts next
      return;
    }

    if (phase === "WORK") {
      // Persist this round as completed.
      const nextRound = currentRound + 1;
      startTransition(async () => {
        try {
          await completeIntervalRoundAction(workoutId, block.id);
        } catch {
          /* swallow — UI keeps ticking; server is eventually consistent */
        }
      });
      if (nextRound >= rounds) {
        setPhase("DONE");
        setSecondsLeft(0);
        setCurrentRound(nextRound);
        beep(1600, 500);
        return;
      }
      setCurrentRound(nextRound);
      if (restSecs > 0) {
        setPhase("REST");
        setSecondsLeft(restSecs);
      } else {
        // Skip rest phase entirely.
        setPhase("WORK");
        setSecondsLeft(workSecs);
      }
      return;
    }

    if (phase === "REST") {
      setPhase("WORK");
      setSecondsLeft(workSecs);
      return;
    }
  }, [secondsLeft, phase, workSecs, restSecs, rounds, currentRound, beep, block.id, workoutId]);

  // Which exercise is up?
  const exerciseForRound = useCallback(
    (r: number) => {
      if (playlist.length === 0) return null;
      if (block.playbackOrder === "SAME") return playlist[0];
      return playlist[r % playlist.length];
    },
    [playlist, block.playbackOrder],
  );

  const currentExercise = exerciseForRound(currentRound);
  const nextExercise =
    currentRound + 1 < rounds ? exerciseForRound(currentRound + 1) : null;

  function handleReset() {
    startTransition(async () => {
      try {
        await resetIntervalBlockAction(workoutId, block.id);
      } catch {
        /* ignore */
      }
    });
    setPhase("GET_READY");
    setSecondsLeft(leadSecs);
    setCurrentRound(0);
    setPaused(false);
  }

  function handleSkipPhase() {
    setSecondsLeft(0);
  }

  // Colors per phase. Fully opaque so the session underneath doesn't
  // bleed through the full-screen overlay.
  const bg =
    phase === "WORK"
      ? "bg-[color:var(--done,#22c55e)]"
      : phase === "REST"
        ? "bg-orange-500"
        : phase === "GET_READY"
          ? "bg-accent"
          : "bg-background";
  const label =
    phase === "WORK"
      ? "EFFORT"
      : phase === "REST"
        ? "REPOS"
        : phase === "GET_READY"
          ? "PRÉPARE-TOI"
          : "TERMINÉ";

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col text-white transition-colors ${bg}`}
      role="dialog"
      aria-label="Minuteur d&rsquo;intervalles"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={onClose}
          className="text-xs uppercase tracking-wider text-white/80 hover:text-white cursor-pointer"
        >
          ← Quitter
        </button>
        <p className="text-xs uppercase tracking-wider text-white/80 tabular-nums">
          Round {Math.min(currentRound + (phase === "WORK" ? 1 : 0), rounds)} / {rounds}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs uppercase tracking-wider text-white/80 hover:text-white cursor-pointer"
        >
          ↻ Reset
        </button>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-xs uppercase tracking-[0.25em] text-white/90 font-bold">
          {label}
        </p>

        <p className="font-display font-bold text-[min(50vw,240px)] leading-none tabular-nums">
          {phase === "DONE" ? "✓" : secondsLeft}
        </p>

        {phase !== "DONE" && currentExercise && (
          <div className="text-center">
            <p className="text-3xl font-display font-semibold">{currentExercise.name}</p>
            {nextExercise && phase === "REST" && (
              <p className="text-sm text-white/75 mt-3">
                Ensuite → <span className="font-semibold">{nextExercise.name}</span>
              </p>
            )}
          </div>
        )}

        {phase === "DONE" && (
          <p className="text-xl font-semibold">Circuit terminé !</p>
        )}
      </div>

      {/* Round dots */}
      <div className="flex items-center justify-center gap-1.5 pb-3">
        {Array.from({ length: rounds }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${
              i < currentRound ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Bottom controls */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {phase === "DONE" ? (
          <button
            type="button"
            onClick={onClose}
            className="col-span-2 rounded-xl bg-white text-foreground py-4 text-sm font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
          >
            Revenir à la séance
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                ensureAudio();
                setPaused((p) => !p);
              }}
              className="rounded-xl bg-white/15 backdrop-blur py-4 text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/25 transition-colors"
            >
              {paused ? "▶ Reprendre" : "❚❚ Pause"}
            </button>
            <button
              type="button"
              onClick={handleSkipPhase}
              className="rounded-xl bg-white/15 backdrop-blur py-4 text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/25 transition-colors"
            >
              ⏭ Passer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
