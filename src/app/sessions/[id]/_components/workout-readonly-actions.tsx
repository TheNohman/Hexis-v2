"use client";

import { useTransition } from "react";
import { useToast } from "@/app/_components/toast";
import {
  deleteWorkoutAction,
  unfinishWorkoutAction,
} from "@/app/sessions/actions";

type Props = {
  workoutId: string;
};

export function WorkoutReadonlyActions({ workoutId }: Props) {
  const [isDeleting, startDelete] = useTransition();
  const [isUnfinishing, startUnfinish] = useTransition();
  const toast = useToast();

  function handleUnfinish() {
    startUnfinish(async () => {
      try {
        await unfinishWorkoutAction(workoutId);
        // Redirect will preempt this, but keep a safety toast in case.
        toast.show("S\u00e9ance reprise.", { kind: "success" });
      } catch (err) {
        // Next.js redirects throw internally — ignore those.
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest?: string }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          return;
        }
        console.error(err);
        toast.show("\u00c9chec de la reprise de s\u00e9ance.", { kind: "error" });
      }
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      "Supprimer d\u00e9finitivement cette s\u00e9ance ? Cette action est irr\u00e9versible.",
    );
    if (!confirmed) return;
    startDelete(async () => {
      try {
        await deleteWorkoutAction(workoutId);
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest?: string }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          return;
        }
        console.error(err);
        toast.show("\u00c9chec de la suppression.", { kind: "error" });
      }
    });
  }

  const busy = isDeleting || isUnfinishing;

  return (
    <div className="space-y-3 pt-2">
      <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
        <p className="text-xs text-subtle">
          Une s&eacute;ance termin&eacute;e par erreur&nbsp;? Cette action la
          remet en cours.
        </p>
        <button
          type="button"
          onClick={handleUnfinish}
          disabled={busy}
          className="w-full rounded-xl border border-border text-muted py-3 text-sm font-medium hover:bg-surface-hover hover:text-accent transition-colors cursor-pointer disabled:opacity-50"
        >
          {isUnfinishing ? "Reprise\u2026" : "Reprendre cette s\u00e9ance"}
        </button>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="w-full rounded-xl border border-danger/40 text-danger py-3 text-xs font-medium hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50"
      >
        {isDeleting
          ? "Suppression\u2026"
          : "Supprimer cette s\u00e9ance"}
      </button>
    </div>
  );
}
