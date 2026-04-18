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
      show("Nombre de répétitions invalide", { kind: "error" });
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
        show("Record enregistré", { kind: "success" });
        setWeightKg("");
        setReps("1");
        setOpen(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        show(`Échec : ${msg}`, { kind: "error" });
      }
    });
  }

  if (!open) {
    return (
      <section className="rounded-2xl border border-dashed border-border p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-sm font-semibold text-accent-ink hover:text-foreground transition-colors cursor-pointer"
        >
          + Ajouter un record manuel
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-surface shadow-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted">
          Ajouter un record manuel
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-subtle hover:text-foreground cursor-pointer w-7 h-7 rounded-full hover:bg-surface-hover transition-colors"
          aria-label="Fermer le formulaire"
        >
          ×
        </button>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-3 gap-2.5">
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest font-semibold text-muted">
          Poids (kg)
          <input
            type="number"
            step="0.5"
            min="0"
            required
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="rounded-xl bg-background px-3 py-2 text-sm text-foreground tabular-nums font-display font-bold focus:outline-none focus:ring-2 focus:ring-accent/60 transition-shadow"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest font-semibold text-muted">
          Répétitions
          <input
            type="number"
            step="1"
            min="1"
            required
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="rounded-xl bg-background px-3 py-2 text-sm text-foreground tabular-nums font-display font-bold focus:outline-none focus:ring-2 focus:ring-accent/60 transition-shadow"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest font-semibold text-muted">
          Date
          <input
            type="date"
            value={achievedAt}
            onChange={(e) => setAchievedAt(e.target.value)}
            className="rounded-xl bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/60 transition-shadow"
          />
        </label>
        <div className="col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-foreground text-background px-5 py-2 text-sm font-semibold disabled:opacity-50 cursor-pointer hover:bg-foreground/90 transition-colors"
          >
            {pending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </section>
  );
}
