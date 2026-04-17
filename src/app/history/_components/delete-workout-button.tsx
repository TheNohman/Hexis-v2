"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useToast } from "@/app/_components/toast";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { deleteWorkoutAction } from "@/app/sessions/actions";

type Props = {
  workoutId: string;
  workoutName: string;
};

export function DeleteWorkoutButton({ workoutId, workoutName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  function askConfirm(e: MouseEvent<HTMLButtonElement>) {
    // Prevent the parent <Link> from navigating.
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
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

  return (
    <>
      <button
        type="button"
        onClick={askConfirm}
        disabled={isPending}
        aria-label="Supprimer cette s\u00e9ance"
        className="text-[11px] text-subtle hover:text-danger transition-colors px-2 py-1 rounded-md hover:bg-danger/10 cursor-pointer disabled:opacity-50"
      >
        {isPending ? "\u2026" : "Supprimer"}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer la s\u00e9ance ?"
        message={`\u00ab\u00a0${workoutName}\u00a0\u00bb sera d\u00e9finitivement supprim\u00e9e. Cette action est irr\u00e9versible.`}
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
