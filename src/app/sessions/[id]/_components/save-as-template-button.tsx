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
      className="w-full rounded-xl bg-surface border border-border text-foreground py-3 text-sm font-medium shadow-card hover:shadow-hero hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
    >
      {isPending ? "Création…" : "Sauvegarder comme template"}
    </button>
  );
}
