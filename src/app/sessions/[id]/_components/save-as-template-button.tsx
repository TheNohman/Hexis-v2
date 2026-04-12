"use client";

import { useTransition } from "react";
import { saveAsTemplateAction } from "@/app/sessions/actions";

type Props = {
  workoutId: string;
  workoutName: string;
};

export function SaveAsTemplateButton({ workoutId, workoutName }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const name = prompt("Nom du template :", workoutName);
    if (!name) return;
    startTransition(() => saveAsTemplateAction(workoutId, name));
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={isPending}
      className="w-full rounded-xl border border-border text-muted py-3 text-sm font-medium hover:bg-surface hover:text-accent transition-colors cursor-pointer disabled:opacity-50"
    >
      {isPending ? "Cr\u00e9ation\u2026" : "Sauvegarder comme template"}
    </button>
  );
}
