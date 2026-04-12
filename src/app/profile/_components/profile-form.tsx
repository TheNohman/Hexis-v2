"use client";

import { useTransition } from "react";
import { updateProfileAction } from "@/app/profile/actions";

type Props = {
  profile: {
    unitSystem: string;
    defaultRestSecs: number | null;
    bodyWeightKg: number | null;
    email: string | null;
    name: string | null;
  };
};

export function ProfileForm({ profile }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const unitSystem = form.get("unitSystem") as string;
    const restVal = form.get("defaultRestSecs") as string;
    const weightVal = form.get("bodyWeightKg") as string;

    const defaultRestSecs = restVal ? parseInt(restVal, 10) : null;
    const bodyWeightKg = weightVal ? parseFloat(weightVal) : null;

    startTransition(() =>
      updateProfileAction({
        unitSystem,
        defaultRestSecs: defaultRestSecs && !Number.isNaN(defaultRestSecs) ? defaultRestSecs : null,
        bodyWeightKg: bodyWeightKg && !Number.isNaN(bodyWeightKg) ? bodyWeightKg : null,
      }),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
        Pr&eacute;f&eacute;rences
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Unit&eacute;s</span>
          <select
            name="unitSystem"
            defaultValue={profile.unitSystem}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          >
            <option value="metric">M&eacute;trique (kg, km)</option>
            <option value="imperial">Imp&eacute;rial (lbs, mi)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Repos par d&eacute;faut (sec)</span>
          <input
            type="number"
            name="defaultRestSecs"
            min={0}
            step={5}
            defaultValue={profile.defaultRestSecs ?? ""}
            placeholder="ex: 90"
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors tabular-nums"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Poids de corps (kg)</span>
          <input
            type="number"
            name="bodyWeightKg"
            step="0.1"
            min={0}
            defaultValue={profile.bodyWeightKg ?? ""}
            placeholder="ex: 75.0"
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors tabular-nums"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-accent text-white py-2.5 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? "Sauvegarde\u2026" : "Sauvegarder"}
      </button>
    </form>
  );
}
