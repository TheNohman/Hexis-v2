"use client";

import { useState, useTransition } from "react";
import { cloneWorkoutAction } from "@/app/sessions/actions";

type Props = {
  sourceWorkoutId: string;
  /** Whether the source had any STRENGTH exercises. Controls the +2.5kg UI. */
  hasStrengthExercises?: boolean;
};

/**
 * Button to recreate a past workout as a fresh PLANNED one. Offers an
 * optional progressive-overload bump (+2.5 kg) for strength exercises.
 */
export function RedoWorkoutButton({ sourceWorkoutId, hasStrengthExercises }: Props) {
  const [isPending, startTransition] = useTransition();
  const [askBump, setAskBump] = useState(false);

  function submit(weightDeltaKg: number | undefined) {
    startTransition(() => cloneWorkoutAction(sourceWorkoutId, weightDeltaKg));
  }

  if (!hasStrengthExercises) {
    return (
      <button
        type="button"
        onClick={() => submit(undefined)}
        disabled={isPending}
        className="w-full rounded-xl border border-accent/40 bg-accent/5 text-accent py-2.5 text-sm font-semibold hover:bg-accent/10 transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? "Cr\u00e9ation\u2026" : "Refaire cette s\u00e9ance"}
      </button>
    );
  }

  if (askBump) {
    return (
      <div className="rounded-xl border border-accent/40 bg-accent/5 p-3 space-y-2">
        <p className="text-xs text-muted">Appliquer une progression sur les exercices de force ?</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => submit(undefined)}
            disabled={isPending}
            className="rounded-lg border border-border bg-surface py-2 text-xs font-medium hover:border-accent cursor-pointer transition-colors disabled:opacity-50"
          >
            M&ecirc;mes charges
          </button>
          <button
            type="button"
            onClick={() => submit(2.5)}
            disabled={isPending}
            className="rounded-lg bg-accent text-white py-2 text-xs font-semibold hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50"
          >
            +2,5 kg
          </button>
          <button
            type="button"
            onClick={() => submit(5)}
            disabled={isPending}
            className="rounded-lg border border-accent/60 text-accent py-2 text-xs font-semibold hover:bg-accent/10 cursor-pointer transition-colors disabled:opacity-50"
          >
            +5 kg
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAskBump(true)}
      disabled={isPending}
      className="w-full rounded-xl border border-accent/40 bg-accent/5 text-accent py-2.5 text-sm font-semibold hover:bg-accent/10 transition-colors cursor-pointer disabled:opacity-50"
    >
      Refaire cette s&eacute;ance
    </button>
  );
}
