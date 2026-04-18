"use client";

import { useState, useTransition } from "react";
import type { PrimarySport, SportLevel } from "@/generated/prisma/client";
import { updateProfileAction } from "@/app/profile/actions";
import { SPORTS, LEVELS, EQUIPMENT_OPTIONS } from "@/app/_components/sport-options";

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
  sportProfile?: {
    primarySport: PrimarySport | null;
    sportLevel: SportLevel | null;
    sportObjective: string | null;
    weeklySessionTarget: number | null;
    sessionDurationMins: number | null;
    equipmentAccess: string[];
    medicalNotes: string | null;
  };
  /** Whether to render the endurance-reference block (FCmax, VMA, FTP). */
  showEnduranceRefs?: boolean;
};

export function ProfileForm({ profile, sportProfile, showEnduranceRefs = false }: Props) {
  const [isPending, startTransition] = useTransition();

  // Controlled state for sport section (checkbox list + selects benefit from it).
  const [primarySport, setPrimarySport] = useState<PrimarySport | "">(
    sportProfile?.primarySport ?? "",
  );
  const [sportLevel, setSportLevel] = useState<SportLevel | "">(
    sportProfile?.sportLevel ?? "",
  );
  const [sportObjective, setSportObjective] = useState<string>(
    sportProfile?.sportObjective ?? "",
  );
  const [weeklyTarget, setWeeklyTarget] = useState<number>(
    sportProfile?.weeklySessionTarget ?? 3,
  );
  const [sessionDuration, setSessionDuration] = useState<number>(
    sportProfile?.sessionDurationMins ?? 60,
  );
  const [equipment, setEquipment] = useState<string[]>(
    sportProfile?.equipmentAccess ?? [],
  );
  const [medicalNotes, setMedicalNotes] = useState<string>(
    sportProfile?.medicalNotes ?? "",
  );

  function toggleEquipment(value: string) {
    setEquipment((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

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
        ...(sportProfile
          ? {
              primarySport: primarySport || null,
              sportLevel: sportLevel || null,
              sportObjective: sportObjective.trim() || null,
              weeklySessionTarget: weeklyTarget > 0 ? weeklyTarget : null,
              sessionDurationMins: sessionDuration > 0 ? sessionDuration : null,
              equipmentAccess: equipment,
              medicalNotes: medicalNotes.trim() || null,
            }
          : {}),
      }),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-surface shadow-card p-5 space-y-4">
      <h2 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
        Préférences
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Unités</span>
          <select
            name="unitSystem"
            defaultValue={profile.unitSystem}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent-ink transition-colors"
          >
            <option value="metric">Métrique (kg, km)</option>
            <option value="imperial">Impérial (lbs, mi)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Repos par défaut (sec)</span>
          <input
            type="number"
            name="defaultRestSecs"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={profile.defaultRestSecs ?? ""}
            placeholder="ex: 90"
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent-ink transition-colors tabular-nums"
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
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent-ink tabular-nums"
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
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent-ink tabular-nums"
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
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent-ink tabular-nums"
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
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent-ink tabular-nums"
              />
            </label>
          </div>
        </div>
      )}

      {sportProfile && (
        <details className="pt-3 border-t border-border group">
          <summary className="flex items-center justify-between cursor-pointer list-none py-1">
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Profil sportif
              </h3>
              <p className="text-[11px] text-subtle mt-0.5">
                Sport principal, niveau, objectif, équipement — éditables à tout moment.
              </p>
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="transition-transform group-open:rotate-90 text-muted"
            >
              <polyline points="4,2 8,6 4,10" />
            </svg>
          </summary>

          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] text-muted">Sport principal</span>
                <select
                  value={primarySport}
                  onChange={(e) => setPrimarySport(e.target.value as PrimarySport | "")}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent-ink transition-colors"
                >
                  <option value="">—</option>
                  {SPORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.icon} {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] text-muted">Niveau</span>
                <select
                  value={sportLevel}
                  onChange={(e) => setSportLevel(e.target.value as SportLevel | "")}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent-ink transition-colors"
                >
                  <option value="">—</option>
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted">Objectif principal</span>
              <input
                type="text"
                value={sportObjective}
                onChange={(e) => setSportObjective(e.target.value)}
                placeholder="Ex : préparer mon premier semi en octobre"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent-ink transition-colors"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Séances / semaine</span>
                  <span className="text-accent-ink font-semibold tabular-nums text-sm">{weeklyTarget}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(parseInt(e.target.value, 10))}
                  className="w-full accent-accent"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Durée séance (min)</span>
                  <span className="text-accent-ink font-semibold tabular-nums text-sm">{sessionDuration}</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={180}
                  step={5}
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value, 10))}
                  className="w-full accent-accent"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] text-muted">Équipement disponible</span>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map((e) => {
                  const active = equipment.includes(e.value);
                  return (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => toggleEquipment(e.value)}
                      className={`text-left rounded-lg border px-3 py-2 transition-all cursor-pointer flex items-center gap-2 text-sm ${
                        active
                          ? "border-accent bg-accent/10"
                          : "border-border bg-background hover:border-accent/40"
                      }`}
                    >
                      <span className="text-base">{e.emoji}</span>
                      <span>{e.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted">Contraintes médicales (optionnel)</span>
              <textarea
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                rows={2}
                placeholder="Ex : épaule droite sensible, tendinite Achille récurrente…"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent-ink transition-colors resize-none"
              />
            </label>
          </div>
        </details>
      )}

      <label className="flex items-center gap-3 py-2">
        <input
          type="checkbox"
          name="mentorEnabled"
          defaultChecked={profile.mentorEnabled}
          className="w-4 h-4 rounded border-border text-accent-ink focus:ring-accent-ink cursor-pointer accent-accent"
        />
        <div>
          <span className="text-sm font-medium">Mentor IA</span>
          <p className="text-xs text-muted">Active le coach IA pour analyser et ajuster tes programmes</p>
        </div>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-foreground text-background py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
      >
        {isPending ? "Sauvegarde…" : "Sauvegarder"}
      </button>
    </form>
  );
}
