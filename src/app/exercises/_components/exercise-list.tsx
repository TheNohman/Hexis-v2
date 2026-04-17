"use client";

import { useState } from "react";
import Link from "next/link";
import { Dumbbell, Search } from "lucide-react";
import { formatExerciseType } from "@/lib/format";
import { EmptyState } from "@/app/_components/empty-state";
import { deleteExerciseAction } from "../actions";
import type { ExerciseType } from "@/generated/prisma/enums";

type Exercise = {
  id: string;
  slug: string;
  name: string;
  type: ExerciseType;
  isSystem: boolean;
  description: string | null;
  kpis: { name: string }[];
};

const TYPE_ORDER: ExerciseType[] = ["STRENGTH", "BODYWEIGHT", "CARDIO", "MOBILITY", "REST"];

const TYPE_DESCRIPTIONS: Record<ExerciseType, string> = {
  STRENGTH: "Exercices avec charges \u2014 suivi du poids, r\u00e9p\u00e9titions et RPE",
  BODYWEIGHT: "Exercices au poids de corps \u2014 suivi des r\u00e9p\u00e9titions et RPE",
  CARDIO: "Exercices d\u2019endurance \u2014 suivi de la dur\u00e9e, distance et fr\u00e9quence cardiaque",
  MOBILITY: "Exercices de mobilit\u00e9 et souplesse \u2014 suivi de la dur\u00e9e",
  REST: "Temps de repos entre les exercices",
};

const TYPE_FILTERS: { value: ExerciseType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "STRENGTH", label: "Musculation" },
  { value: "BODYWEIGHT", label: "Poids de corps" },
  { value: "CARDIO", label: "Cardio" },
  { value: "MOBILITY", label: "Mobilit\u00e9" },
];

export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ExerciseType | "ALL">("ALL");

  const filtered = exercises.filter((e) => {
    if (typeFilter !== "ALL" && e.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const grouped = new Map<ExerciseType, Exercise[]>();
  for (const type of TYPE_ORDER) {
    const items = filtered.filter((e) => e.type === type);
    if (items.length > 0) grouped.set(type, items);
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un exercice..."
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm placeholder:text-subtle focus:outline-none focus:border-accent transition-colors"
      />

      {/* Type filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              typeFilter === f.value
                ? "bg-accent text-white"
                : "bg-surface border border-border text-muted hover:text-foreground hover:border-accent/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {grouped.size === 0 ? (
        search ? (
          <EmptyState
            icon={Search}
            title="Aucun exercice trouv\u00e9"
            description={`Rien ne correspond \u00e0 \u00ab\u00a0${search}\u00a0\u00bb. Essaie un autre mot-cl\u00e9.`}
          />
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="Aucun exercice"
            description="La biblioth\u00e8que est vide pour cette cat\u00e9gorie."
          />
        )
      ) : (
        Array.from(grouped.entries()).map(([type, items]) => (
          <section key={type} className="space-y-2">
            <div>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
                {formatExerciseType(type)}
              </h2>
              <p className="text-[11px] text-subtle mt-0.5">{TYPE_DESCRIPTIONS[type]}</p>
            </div>
            <ul className="space-y-1.5">
              {items.map((exercise) => (
                <li key={exercise.id} className="rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors">
                  <Link href={`/exercises/${exercise.id}`} className="block p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {exercise.name}
                          {exercise.isSystem && (
                            <span className="ml-2 text-[10px] text-subtle bg-surface-hover rounded px-1.5 py-0.5">
                              syst&egrave;me
                            </span>
                          )}
                        </p>
                        {exercise.description && (
                          <p className="text-xs text-muted mt-0.5">{exercise.description}</p>
                        )}
                        {exercise.kpis.length > 0 && (
                          <p className="text-xs text-subtle mt-1">
                            {exercise.kpis.map((k) => k.name).join(" \u00b7 ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!exercise.isSystem && <DeleteButton exerciseId={exercise.id} />}
                        <span className="text-xs text-subtle">&rarr;</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <p className="text-xs text-subtle text-center">
        {filtered.length} exercice{filtered.length > 1 ? "s" : ""} trouv&eacute;{filtered.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}

function DeleteButton({ exerciseId }: { exerciseId: string }) {
  const deleteWithId = deleteExerciseAction.bind(null, exerciseId);
  return (
    <form action={deleteWithId} onClick={(e) => e.stopPropagation()}>
      <button type="submit" className="shrink-0 text-xs text-danger hover:text-danger/80 transition-colors cursor-pointer">
        Supprimer
      </button>
    </form>
  );
}
