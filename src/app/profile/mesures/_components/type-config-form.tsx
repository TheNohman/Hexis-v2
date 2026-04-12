"use client";

import { useState, useTransition } from "react";
import { createMeasurementTypeAction } from "@/app/measurements/actions";
import { COMMON_UNITS } from "@/lib/measurements/types";

type Props = {
  onClose: () => void;
};

export function TypeConfigForm({ onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("cm");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    startTransition(async () => {
      await createMeasurementTypeAction({ label: label.trim(), unit });
      onClose();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-accent/30 bg-surface p-4 space-y-3"
    >
      <p className="text-sm font-medium">Nouveau type de mesure</p>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Nom</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex: Tour de cou"
            required
            autoFocus
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Unite</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          >
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !label.trim()}
          className="flex-1 rounded-lg bg-accent text-white py-2.5 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
        >
          {isPending ? "Ajout\u2026" : "Ajouter le type"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
