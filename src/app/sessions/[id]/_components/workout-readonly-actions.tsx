"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/app/_components/toast";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Card } from "@/app/_components/card";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  function handleUnfinish() {
    startUnfinish(async () => {
      try {
        await unfinishWorkoutAction(workoutId);
        // Redirect will preempt this, but keep a safety toast in case.
        toast.show("Séance reprise.", { kind: "success" });
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
        toast.show("Échec de la reprise de séance.", { kind: "error" });
      }
    });
  }

  function handleDelete() {
    setConfirmOpen(false);
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
        toast.show("Échec de la suppression.", { kind: "error" });
      }
    });
  }

  const busy = isDeleting || isUnfinishing;

  return (
    <div className="space-y-3 pt-2">
      <Card padding="md" className="space-y-2">
        <p className="text-xs text-muted">
          Une séance terminée par erreur ? Cette action la remet en cours.
        </p>
        <button
          type="button"
          onClick={handleUnfinish}
          disabled={busy}
          className="w-full rounded-xl bg-surface border border-border text-foreground py-3 text-sm font-medium hover:bg-surface-hover hover:text-accent-ink transition-colors cursor-pointer disabled:opacity-50"
        >
          {isUnfinishing ? "Reprise…" : "Reprendre cette séance"}
        </button>
      </Card>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        className="w-full rounded-xl border border-danger/40 bg-danger-soft text-danger py-3 text-xs font-semibold hover:bg-danger/15 transition-colors cursor-pointer disabled:opacity-50"
      >
        {isDeleting ? "Suppression…" : "Supprimer cette séance"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer cette séance ?"
        message="La séance et toutes ses entrées seront définitivement supprimées. Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
