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
        className="w-full rounded-xl bg-foreground text-background py-3 text-sm font-semibold shadow-card hover:shadow-hero hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
      >
        {isPending ? "Création…" : "Refaire cette séance"}
      </button>
    );
  }

  if (askBump) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent-light p-4 space-y-3 shadow-card">
        <p className="text-xs text-accent-ink font-medium">
          Appliquer une progression sur les exercices de force ?
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => submit(undefined)}
            disabled={isPending}
            className="rounded-xl border border-border bg-surface py-2.5 text-xs font-semibold hover:shadow-card cursor-pointer transition-all disabled:opacity-50"
          >
            Mêmes charges
          </button>
          <button
            type="button"
            onClick={() => submit(2.5)}
            disabled={isPending}
            className="rounded-xl bg-accent text-accent-foreground py-2.5 text-xs font-bold hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50"
          >
            +2,5 kg
          </button>
          <button
            type="button"
            onClick={() => submit(5)}
            disabled={isPending}
            className="rounded-xl bg-foreground text-background py-2.5 text-xs font-bold hover:-translate-y-0.5 hover:shadow-hero cursor-pointer transition-all disabled:opacity-50"
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
      className="w-full rounded-xl bg-foreground text-background py-3 text-sm font-semibold shadow-card hover:shadow-hero hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
    >
      Refaire cette séance
    </button>
  );
}
