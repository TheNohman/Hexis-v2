"use client";

import { useState, useTransition } from "react";
import { createWorkoutAction } from "@/app/sessions/actions";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";

type Props = {
  /** When true, the button is rendered as a full-width primary pill.
   *  When false, it's a quieter secondary outline button. */
  primary: boolean;
  /** True when there's an active workout — the button turns into a
   *  confirm dialog so the user doesn't silently lose their in-flight
   *  session. */
  hasActiveWorkout: boolean;
};

/**
 * Button that creates a brand-new free session. If an active session
 * exists, it asks for confirmation before calling the server action —
 * which would otherwise finish the active session silently.
 */
export function CreateWorkoutButton({ primary, hasActiveWorkout }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleClick() {
    if (hasActiveWorkout) {
      setConfirmOpen(true);
      return;
    }
    startTransition(() => createWorkoutAction());
  }

  function confirm() {
    setConfirmOpen(false);
    startTransition(() => createWorkoutAction());
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          primary
            ? "w-full rounded-full bg-accent text-accent-foreground py-4 font-semibold hover:bg-accent-hover transition-colors cursor-pointer shadow-card disabled:opacity-60"
            : "w-full rounded-xl bg-transparent border border-border text-foreground py-3 text-sm font-semibold hover:bg-surface hover:border-foreground/40 transition-colors cursor-pointer disabled:opacity-60"
        }
      >
        + Nouvelle séance libre
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Une séance est déjà en cours"
        message="En créer une nouvelle terminera la séance active. Continuer ?"
        confirmLabel="Terminer et créer"
        cancelLabel="Annuler"
        destructive
        onConfirm={confirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
