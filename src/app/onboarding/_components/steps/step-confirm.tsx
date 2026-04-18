"use client";

import { useId } from "react";
import type { PrimarySport, SportLevel } from "@/generated/prisma/client";
import { SPORTS, LEVELS, EQUIPMENT_OPTIONS } from "@/app/_components/sport-options";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-subtle shrink-0 w-24">
        {label}
      </span>
      <span className="text-sm font-medium text-right text-foreground">
        {value}
      </span>
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
  const mentorId = useId();
  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
          Pr&ecirc;t&middot;e &agrave; commencer ?
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Un dernier coup d&rsquo;&oelig;il &agrave; ton profil.
        </p>
      </header>

      <div className="rounded-3xl bg-surface shadow-card divide-y divide-border overflow-hidden">
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

      <label
        htmlFor={mentorId}
        className={`flex items-start gap-3 rounded-3xl border p-5 cursor-pointer transition-colors ${
          mentorEnabled
            ? "border-accent bg-accent-light"
            : "border-border bg-surface"
        }`}
      >
        <input
          id={mentorId}
          type="checkbox"
          checked={mentorEnabled}
          onChange={(e) => onMentorToggle(e.target.checked)}
          className="w-5 h-5 mt-0.5 rounded accent-accent cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm flex items-center gap-2">
            Activer le Mentor IA
            <span
              className="text-[10px] uppercase tracking-widest font-semibold rounded-full bg-accent text-accent-foreground px-2 py-0.5"
              aria-hidden="true"
            >
              Beta
            </span>
          </p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Coach virtuel qui analyse tes s&eacute;ances et ton bien-&ecirc;tre pour te conseiller avant chaque entra&icirc;nement.
            Tu peux l&rsquo;activer/d&eacute;sactiver &agrave; tout moment depuis ton profil.
          </p>
        </div>
      </label>
    </section>
  );
}
