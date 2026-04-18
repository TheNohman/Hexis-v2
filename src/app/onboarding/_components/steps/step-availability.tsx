"use client";

import { useId } from "react";
import { EQUIPMENT_OPTIONS } from "@/app/_components/sport-options";

export function StepAvailability({
  weeklyTarget,
  sessionDuration,
  equipment,
  medicalNotes,
  onWeeklyTargetChange,
  onSessionDurationChange,
  onToggleEquipment,
  onMedicalNotesChange,
}: {
  weeklyTarget: number;
  sessionDuration: number;
  equipment: string[];
  medicalNotes: string;
  onWeeklyTargetChange: (n: number) => void;
  onSessionDurationChange: (n: number) => void;
  onToggleEquipment: (value: string) => void;
  onMedicalNotesChange: (s: string) => void;
}) {
  const weeklyId = useId();
  const durationId = useId();
  const medicalId = useId();
  const equipmentLabelId = useId();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
          Ton rythme ?
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Combien de s&eacute;ances par semaine, pendant combien de temps, avec quoi ?
        </p>
      </header>

      <div className="rounded-3xl bg-surface shadow-card p-5 space-y-5">
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <label
              htmlFor={weeklyId}
              className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink"
            >
              S&eacute;ances / semaine
            </label>
            <span className="font-display font-black text-accent-ink text-3xl leading-none tabular-nums">
              {weeklyTarget}
            </span>
          </div>
          <input
            id={weeklyId}
            type="range"
            min={1}
            max={10}
            step={1}
            value={weeklyTarget}
            onChange={(e) => onWeeklyTargetChange(parseInt(e.target.value, 10))}
            className="w-full accent-accent"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <label
              htmlFor={durationId}
              className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink"
            >
              Dur&eacute;e d&rsquo;une s&eacute;ance
            </label>
            <span className="font-display font-black text-accent-ink text-3xl leading-none tabular-nums">
              {sessionDuration}
              <span className="text-sm font-semibold text-muted ml-1">min</span>
            </span>
          </div>
          <input
            id={durationId}
            type="range"
            min={15}
            max={180}
            step={5}
            value={sessionDuration}
            onChange={(e) => onSessionDurationChange(parseInt(e.target.value, 10))}
            className="w-full accent-accent"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span
            id={equipmentLabelId}
            className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink"
          >
            &Eacute;quipement disponible
          </span>
          <span className="text-xs text-subtle">
            {equipment.length} s&eacute;lectionn&eacute;{equipment.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-xs text-muted">Choisis-en au moins un (plusieurs possibles).</p>
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-labelledby={equipmentLabelId}
        >
          {EQUIPMENT_OPTIONS.map((e) => {
            const active = equipment.includes(e.value);
            return (
              <button
                key={e.value}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => onToggleEquipment(e.value)}
                className={`text-left rounded-2xl border px-3 py-2.5 transition-all cursor-pointer flex items-center gap-2 text-sm font-medium ${
                  active
                    ? "border-accent bg-accent-light ring-2 ring-accent/30"
                    : "border-border bg-surface hover:border-border-hover hover:-translate-y-0.5"
                }`}
              >
                <span className="text-lg" aria-hidden="true">
                  {e.emoji}
                </span>
                <span className="flex-1">{e.label}</span>
                {active && (
                  <span
                    className="text-accent-ink font-bold text-xs"
                    aria-hidden="true"
                  >
                    &#10003;
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={medicalId}
          className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink"
        >
          Contraintes m&eacute;dicales <span className="text-subtle normal-case tracking-normal font-normal">(optionnel)</span>
        </label>
        <textarea
          id={medicalId}
          value={medicalNotes}
          onChange={(e) => onMedicalNotesChange(e.target.value)}
          placeholder="Ex : épaule droite sensible, tendinite Achille récurrente, reprise après blessure…"
          rows={2}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm shadow-card focus:outline-none focus:border-accent transition-colors resize-none"
        />
      </div>
    </section>
  );
}
