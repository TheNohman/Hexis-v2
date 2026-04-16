"use client";

import { useTransition } from "react";
import { updateProfileAction } from "@/app/profile/actions";

type Props = {
  profile: {
    unitSystem: string;
    defaultRestSecs: number | null;
    mentorEnabled: boolean;
    email: string | null;
    name: string | null;
    fcMax: number | null;
    fcResting: number | null;
    vmaKmh: number | null;
    ftp: number | null;
  };
  /** Whether to render the endurance-reference block (FCmax, VMA, FTP). */
  showEnduranceRefs?: boolean;
};

export function ProfileForm({ profile, showEnduranceRefs = false }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const unitSystem = form.get("unitSystem") as string;
    const restVal = form.get("defaultRestSecs") as string;
    const mentorEnabled = form.get("mentorEnabled") === "on";

    const defaultRestSecs = restVal ? parseInt(restVal, 10) : null;

    const parseIntOrNull = (key: string) => {
      const raw = (form.get(key) as string | null)?.trim();
      if (!raw) return null;
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? null : n;
    };
    const parseFloatOrNull = (key: string) => {
      const raw = (form.get(key) as string | null)?.trim();
      if (!raw) return null;
      const n = parseFloat(raw.replace(",", "."));
      return Number.isNaN(n) ? null : n;
    };

    startTransition(() =>
      updateProfileAction({
        unitSystem,
        defaultRestSecs: defaultRestSecs && !Number.isNaN(defaultRestSecs) ? defaultRestSecs : null,
        mentorEnabled,
        ...(showEnduranceRefs
          ? {
              fcMax: parseIntOrNull("fcMax"),
              fcResting: parseIntOrNull("fcResting"),
              vmaKmh: parseFloatOrNull("vmaKmh"),
              ftp: parseIntOrNull("ftp"),
            }
          : {}),
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
            step={1}
            inputMode="numeric"
            defaultValue={profile.defaultRestSecs ?? ""}
            placeholder="ex: 90"
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors tabular-nums"
          />
        </label>

      </div>

      {showEnduranceRefs && (
        <div className="pt-3 border-t border-border space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Références endurance
            </h3>
            <p className="text-[11px] text-subtle mt-0.5">
              Optionnel. Permet à l&rsquo;app de calculer tes zones FC et tes allures cibles.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted">FCmax (bpm)</span>
              <input
                type="number"
                name="fcMax"
                min={100}
                max={230}
                step={1}
                inputMode="numeric"
                defaultValue={profile.fcMax ?? ""}
                placeholder="ex: 185"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted">FC repos (bpm)</span>
              <input
                type="number"
                name="fcResting"
                min={30}
                max={100}
                step={1}
                inputMode="numeric"
                defaultValue={profile.fcResting ?? ""}
                placeholder="ex: 55"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted">VMA (km/h)</span>
              <input
                type="number"
                name="vmaKmh"
                min={5}
                max={25}
                step={0.1}
                inputMode="decimal"
                defaultValue={profile.vmaKmh ?? ""}
                placeholder="ex: 15.5"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted">FTP (W, vélo)</span>
              <input
                type="number"
                name="ftp"
                min={50}
                max={500}
                step={5}
                inputMode="numeric"
                defaultValue={profile.ftp ?? ""}
                placeholder="ex: 240"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent tabular-nums"
              />
            </label>
          </div>
        </div>
      )}

      <label className="flex items-center gap-3 py-2">
        <input
          type="checkbox"
          name="mentorEnabled"
          defaultChecked={profile.mentorEnabled}
          className="w-4 h-4 rounded border-border text-accent focus:ring-accent cursor-pointer accent-accent"
        />
        <div>
          <span className="text-sm font-medium">Mentor IA</span>
          <p className="text-xs text-muted">Active le coach IA pour analyser et ajuster tes programmes</p>
        </div>
      </label>

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
