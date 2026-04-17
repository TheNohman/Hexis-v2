"use client";

import { useState, useTransition } from "react";
import { addManualPRAction } from "@/app/exercises/actions";
import { useToast } from "@/app/_components/toast";

type Props = {
  exerciseId: string;
};

/**
 * Inline form on the exercise detail page that lets the user log a
 * manually-measured PR (typically from a 1RM test outside the app).
 * Triggers `addManualPRAction` which persists a row with
 * `source: "MANUAL"` and revalidates the page so the new PR appears
 * immediately in the "Records personnels" grid.
 */
export function ManualPRForm({ exerciseId }: Props) {
  const [weightKg, setWeightKg] = useState("");
  const [reps, setReps] = useState("1");
  const [achievedAt, setAchievedAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { show } = useToast();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const w = Number.parseFloat(weightKg);
    const r = Number.parseInt(reps, 10);
    if (!Number.isFinite(w) || w <= 0) {
      show("Poids invalide", { kind: "error" });
      return;
    }
    if (!Number.isInteger(r) || r <= 0) {
      show("Nombre de r\u00e9p\u00e9titions invalide", { kind: "error" });
      return;
    }
    const date = achievedAt ? new Date(achievedAt) : undefined;

    startTransition(async () => {
      try {
        await addManualPRAction({
          exerciseId,
          weightKg: w,
          reps: r,
          achievedAt: date,
        });
        show("Record enregistr\u00e9", { kind: "success" });
        setWeightKg("");
        setReps("1");
        setOpen(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        show(`\u00c9chec : ${msg}`, { kind: "error" });
      }
    });
  }

  if (!open) {
    return (
      <section className="rounded-xl border border-dashed border-border p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-sm text-accent font-medium hover:underline cursor-pointer"
        >
          + Ajouter un record manuel
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Ajouter un record manuel
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-subtle hover:text-foreground cursor-pointer"
          aria-label="Fermer"
        >
          {"\u00d7"}
        </button>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Poids (kg)
          <input
            type="number"
            step="0.5"
            min="0"
            required
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground tabular-nums"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          {"R\u00e9p\u00e9titions"}
          <input
            type="number"
            step="1"
            min="1"
            required
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground tabular-nums"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Date
          <input
            type="date"
            value={achievedAt}
            onChange={(e) => setAchievedAt(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <div className="col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50 cursor-pointer"
          >
            {pending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </section>
  );
}
