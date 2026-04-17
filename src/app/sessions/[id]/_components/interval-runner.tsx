"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useTransition,
} from "react";
import { Check, ChevronLeft, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
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

type State = {
  phase: Phase;
  secondsLeft: number;
  currentRound: number;
  paused: boolean;
  /** Incremented every time a round transitions WORK → REST so the
   *  persistence effect only fires on the edge (no double writes). */
  persistEpoch: number;
};

type Action =
  | { type: "TICK" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SKIP_PHASE" }
  | { type: "RESET"; leadSecs: number };

type Config = {
  workSecs: number;
  restSecs: number;
  rounds: number;
  leadSecs: number;
};

function reducer(state: State, action: Action, cfg: Config): State {
  switch (action.type) {
    case "TOGGLE_PAUSE":
      return { ...state, paused: !state.paused };
    case "RESET":
      return {
        phase: "GET_READY",
        secondsLeft: action.leadSecs,
        currentRound: 0,
        paused: false,
        persistEpoch: state.persistEpoch, // keep monotonic
      };
    case "SKIP_PHASE":
      // Collapse to the next phase transition by forcing secondsLeft to 0.
      if (state.phase === "DONE") return state;
      return { ...state, secondsLeft: 0 };
    case "TICK": {
      if (state.phase === "DONE" || state.paused) return state;
      if (state.secondsLeft > 1) {
        return { ...state, secondsLeft: state.secondsLeft - 1 };
      }
      // Phase transition.
      if (state.phase === "GET_READY") {
        return {
          ...state,
          phase: "WORK",
          secondsLeft: cfg.workSecs,
          currentRound: 0,
        };
      }
      if (state.phase === "WORK") {
        const nextRound = state.currentRound + 1;
        if (nextRound >= cfg.rounds) {
          return {
            ...state,
            phase: "DONE",
            secondsLeft: 0,
            currentRound: nextRound,
            persistEpoch: state.persistEpoch + 1,
          };
        }
        if (cfg.restSecs > 0) {
          return {
            ...state,
            phase: "REST",
            secondsLeft: cfg.restSecs,
            currentRound: nextRound,
            persistEpoch: state.persistEpoch + 1,
          };
        }
        // No rest configured → skip straight to WORK.
        return {
          ...state,
          phase: "WORK",
          secondsLeft: cfg.workSecs,
          currentRound: nextRound,
          persistEpoch: state.persistEpoch + 1,
        };
      }
      // REST → WORK
      return { ...state, phase: "WORK", secondsLeft: cfg.workSecs };
    }
  }
}

/**
 * Full-screen interval timer. Takes over the viewport while the user is
 * running a HIIT block. State is fully driven by a reducer keyed on
 * the three user events (TICK / TOGGLE_PAUSE / SKIP_PHASE / RESET);
 * everything else (audio, wake lock, persistence) is a side-effect
 * that reads state, never the other way around.
 */
export function IntervalRunner({ workoutId, block, onClose }: Props) {
  const cfg: Config = {
    rounds: block.roundCount ?? 0,
    workSecs: block.workSecs ?? 20,
    restSecs: block.restSecs ?? 10,
    leadSecs: block.countdownLeadSecs ?? 10,
  };

  const playlist = useMemo(
    () =>
      block.entries
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((e) => e.exercise),
    [block.entries],
  );

  const [state, rawDispatch] = useReducer(
    (s: State, a: Action) => reducer(s, a, cfg),
    {
      phase: "GET_READY",
      secondsLeft: cfg.leadSecs,
      currentRound: block.completedRounds ?? 0,
      paused: false,
      persistEpoch: 0,
    },
  );

  const [, startTransition] = useTransition();

  // ── WebAudio beeps ──
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

  // ── Wake lock ──
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    (async () => {
      try {
        const wl = (navigator as Navigator & {
          wakeLock?: { request(type: "screen"): Promise<WakeLockSentinel> };
        }).wakeLock;
        if (wl) sentinel = await wl.request("screen");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      try {
        sentinel?.release();
      } catch {
        /* ignore */
      }
    };
  }, []);

  // ── Ticker ──
  useEffect(() => {
    if (state.phase === "DONE") return;
    const id = setInterval(() => rawDispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  // ── Countdown beeps (on the 3-2-1 of each phase) ──
  useEffect(() => {
    if (state.phase === "DONE") return;
    if (state.paused) return;
    if (state.secondsLeft > 0 && state.secondsLeft <= 3) {
      beep(800, 80);
    }
    if (state.secondsLeft === 0 && state.phase !== "GET_READY") {
      beep(1200, 250);
    }
  }, [state.secondsLeft, state.phase, state.paused, beep]);

  // ── Final cheer on DONE ──
  useEffect(() => {
    if (state.phase === "DONE") beep(1600, 500);
  }, [state.phase, beep]);

  // ── Persist completed rounds on every WORK→REST / WORK→DONE edge ──
  useEffect(() => {
    if (state.persistEpoch === 0) return;
    startTransition(async () => {
      try {
        await completeIntervalRoundAction(workoutId, block.id);
      } catch {
        /* swallow — UI keeps ticking; server is eventually consistent */
      }
    });
  }, [state.persistEpoch, workoutId, block.id]);

  // ── Exercise picker: SAME / CUSTOM / CYCLE ──
  const exercisesById = useMemo(
    () => new Map(playlist.map((p) => [p.id, p] as const)),
    [playlist],
  );
  const exerciseForRound = useCallback(
    (r: number) => {
      if (playlist.length === 0) return null;
      if (block.playbackOrder === "SAME") return playlist[0];
      if (block.playbackOrder === "CUSTOM") {
        const id = block.customSequence[r];
        if (id) return exercisesById.get(id) ?? playlist[0];
        return playlist[r % playlist.length];
      }
      return playlist[r % playlist.length];
    },
    [playlist, block.playbackOrder, block.customSequence, exercisesById],
  );

  const currentExercise = exerciseForRound(state.currentRound);
  const nextExercise =
    state.currentRound + 1 < cfg.rounds
      ? exerciseForRound(state.currentRound + 1)
      : null;

  function handleReset() {
    startTransition(async () => {
      try {
        await resetIntervalBlockAction(workoutId, block.id);
      } catch {
        /* ignore */
      }
    });
    rawDispatch({ type: "RESET", leadSecs: cfg.leadSecs });
  }

  const bg =
    state.phase === "WORK"
      ? "bg-[color:var(--done,#22c55e)]"
      : state.phase === "REST"
        ? "bg-orange-500"
        : state.phase === "GET_READY"
          ? "bg-accent"
          : "bg-background";
  const label =
    state.phase === "WORK"
      ? "EFFORT"
      : state.phase === "REST"
        ? "REPOS"
        : state.phase === "GET_READY"
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
          className="text-xs uppercase tracking-wider text-white/80 hover:text-white cursor-pointer inline-flex items-center gap-1"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Quitter
        </button>
        <p className="text-xs uppercase tracking-wider text-white/80 tabular-nums">
          Round{" "}
          {Math.min(state.currentRound + (state.phase === "WORK" ? 1 : 0), cfg.rounds)} /{" "}
          {cfg.rounds}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs uppercase tracking-wider text-white/80 hover:text-white cursor-pointer inline-flex items-center gap-1"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-xs uppercase tracking-[0.25em] text-white/90 font-bold">
          {label}
        </p>

        <p className="font-display font-bold text-[min(50vw,240px)] leading-none tabular-nums flex items-center justify-center">
          {state.phase === "DONE" ? (
            <Check className="h-[min(40vw,200px)] w-[min(40vw,200px)]" strokeWidth={3} aria-hidden="true" />
          ) : (
            state.secondsLeft
          )}
        </p>

        {state.phase !== "DONE" && currentExercise && (
          <div className="text-center">
            <p className="text-3xl font-display font-semibold">
              {currentExercise.name}
            </p>
            {nextExercise && state.phase === "REST" && (
              <p className="text-sm text-white/75 mt-3">
                Ensuite →{" "}
                <span className="font-semibold">{nextExercise.name}</span>
              </p>
            )}
          </div>
        )}

        {state.phase === "DONE" && (
          <p className="text-xl font-semibold">Circuit terminé !</p>
        )}
      </div>

      {/* Round dots */}
      <div className="flex items-center justify-center gap-1.5 pb-3">
        {Array.from({ length: cfg.rounds }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${
              i < state.currentRound ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Bottom controls */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {state.phase === "DONE" ? (
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
                rawDispatch({ type: "TOGGLE_PAUSE" });
              }}
              className="rounded-xl bg-white/15 backdrop-blur py-4 text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/25 transition-colors inline-flex items-center justify-center gap-2"
            >
              {state.paused ? (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Reprendre
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  Pause
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => rawDispatch({ type: "SKIP_PHASE" })}
              className="rounded-xl bg-white/15 backdrop-blur py-4 text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/25 transition-colors inline-flex items-center justify-center gap-2"
            >
              <SkipForward className="h-4 w-4" aria-hidden="true" />
              Passer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
