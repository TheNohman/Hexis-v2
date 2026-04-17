"use client";

import type { PrimarySport, SportLevel } from "@/generated/prisma/client";
import { SPORTS, LEVELS, EQUIPMENT_OPTIONS } from "@/app/_components/sport-options";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-xs uppercase tracking-wider text-muted shrink-0 w-24">
        {label}
      </span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function StepConfirm({
  sport,
  level,
  objective,
  weeklyTarget,
  sessionDuration,
  equipment,
  medicalNotes,
  mentorEnabled,
  onMentorToggle,
}: {
  sport: PrimarySport | null;
  level: SportLevel | null;
  objective: string;
  weeklyTarget: number;
  sessionDuration: number;
  equipment: string[];
  medicalNotes: string;
  mentorEnabled: boolean;
  onMentorToggle: (v: boolean) => void;
}) {
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-display font-bold">Prêt·e à commencer ?</h1>
        <p className="text-sm text-muted mt-1">
          Un dernier coup d&rsquo;œil à ton profil.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
        <SummaryRow
          label="Sport"
          value={SPORTS.find((s) => s.value === sport)?.label ?? "—"}
        />
        <SummaryRow
          label="Niveau"
          value={LEVELS.find((l) => l.value === level)?.label ?? "—"}
        />
        <SummaryRow label="Objectif" value={objective || "—"} />
        <SummaryRow
          label="Rythme"
          value={`${weeklyTarget} × ${sessionDuration} min / semaine`}
        />
        <SummaryRow
          label="Équipement"
          value={
            equipment.length
              ? equipment
                  .map((v) => EQUIPMENT_OPTIONS.find((e) => e.value === v)?.label)
                  .filter(Boolean)
                  .join(" · ")
              : "—"
          }
        />
        {medicalNotes && <SummaryRow label="Santé" value={medicalNotes} />}
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={mentorEnabled}
          onChange={(e) => onMentorToggle(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded accent-accent cursor-pointer"
        />
        <div>
          <p className="font-semibold text-sm">Activer le Mentor IA</p>
          <p className="text-xs text-muted mt-0.5">
            Coach virtuel qui analyse tes séances et ton bien-être pour te conseiller avant chaque entraînement.
            Tu peux l&rsquo;activer/désactiver à tout moment depuis ton profil.
          </p>
        </div>
      </label>
    </section>
  );
}
