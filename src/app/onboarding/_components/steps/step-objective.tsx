"use client";

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
  const suggestions = sport ? OBJECTIVES_BY_SPORT[sport] : [];
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-display font-bold">Ton objectif principal ?</h1>
        <p className="text-sm text-muted mt-1">
          Écris le tien, ou clique sur une suggestion.
        </p>
      </header>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: préparer mon premier triathlon en septembre"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors"
      />
      <div className="flex flex-wrap gap-2">
        {suggestions.map((sugg) => (
          <button
            key={sugg}
            type="button"
            onClick={() => onChange(sugg)}
            className="text-xs rounded-full border border-border px-3 py-1.5 hover:border-accent hover:text-accent transition-colors cursor-pointer"
          >
            {sugg}
          </button>
        ))}
      </div>
    </section>
  );
}
