"use client";

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
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-display font-bold">Ton rythme ?</h1>
        <p className="text-sm text-muted mt-1">
          Combien de séances par semaine, pendant combien de temps, avec quoi ?
        </p>
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Séances / semaine</span>
          <span className="text-accent font-bold text-lg tabular-nums">
            {weeklyTarget}
          </span>
        </div>
        <input
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
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Durée d&rsquo;une séance (min)</span>
          <span className="text-accent font-bold text-lg tabular-nums">
            {sessionDuration}
          </span>
        </div>
        <input
          type="range"
          min={15}
          max={180}
          step={5}
          value={sessionDuration}
          onChange={(e) => onSessionDurationChange(parseInt(e.target.value, 10))}
          className="w-full accent-accent"
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Équipement disponible</span>
        <p className="text-xs text-muted">Choisis-en au moins un (plusieurs possibles).</p>
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map((e) => {
            const active = equipment.includes(e.value);
            return (
              <button
                key={e.value}
                type="button"
                onClick={() => onToggleEquipment(e.value)}
                className={`text-left rounded-xl border px-3 py-2.5 transition-all cursor-pointer flex items-center gap-2 text-sm ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface hover:border-accent/40"
                }`}
              >
                <span className="text-lg">{e.emoji}</span>
                <span>{e.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Contraintes médicales (optionnel)</span>
        <textarea
          value={medicalNotes}
          onChange={(e) => onMedicalNotesChange(e.target.value)}
          placeholder="Ex : épaule droite sensible, tendinite Achille récurrente, reprise après blessure…"
          rows={2}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
        />
      </div>
    </section>
  );
}
