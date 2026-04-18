"use client";

import { useId } from "react";
import type { PrimarySport } from "@/generated/prisma/client";

// Suggested objectives by sport — pre-filled chips the user can click.
const OBJECTIVES_BY_SPORT: Record<PrimarySport, string[]> = {
  STRENGTH_TRAINING: [
    "Prise de masse",
    "Esthétique / recomposition",
    "Santé et forme générale",
    "Gagner en force",
  ],
  POWERLIFTING: [
    "Progresser en total S+B+D",
    "Préparer une compétition",
    "Améliorer un lift spécifique",
    "Sortir d'un plateau",
  ],
  ENDURANCE: [
    "Préparer un 10 km",
    "Préparer un semi / marathon",
    "Premier triathlon",
    "Améliorer mes allures",
  ],
  CROSSFIT_HIIT: [
    "Améliorer ma condition physique",
    "Progresser sur les benchmarks",
    "Perdre du gras",
    "Prendre du muscle fonctionnel",
  ],
  MULTI_SPORT: [
    "Équilibre muscu / cardio",
    "Rester en forme",
    "Gérer le stress",
    "Varier les plaisirs",
  ],
};

export function StepObjective({
  sport,
  value,
  onChange,
}: {
  sport: PrimarySport | null;
  value: string;
  onChange: (s: string) => void;
}) {
  const inputId = useId();
  const suggestions = sport ? OBJECTIVES_BY_SPORT[sport] : [];
  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
          Ton objectif principal ?
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          &Eacute;cris le tien, ou clique sur une suggestion.
        </p>
      </header>
      <div className="space-y-2">
        <label
          htmlFor={inputId}
          className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink"
        >
          Mon objectif
        </label>
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex : préparer mon premier triathlon en septembre"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm shadow-card focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-subtle">
            Suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sugg) => {
              const active = value === sugg;
              return (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => onChange(sugg)}
                  aria-pressed={active}
                  className={`text-xs font-medium rounded-full px-3.5 py-2 transition-all cursor-pointer ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface border border-border text-foreground hover:border-border-hover hover:-translate-y-0.5"
                  }`}
                >
                  {sugg}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
