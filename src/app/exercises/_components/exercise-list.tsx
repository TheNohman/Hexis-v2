"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Dumbbell, Search } from "lucide-react";
import { formatExerciseType } from "@/lib/format";
import { EmptyState } from "@/app/_components/empty-state";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { useToast } from "@/app/_components/toast";
import { deleteExerciseAction } from "../actions";
import type { ExerciseType } from "@/generated/prisma/enums";

type Exercise = {
  id: string;
  slug: string;
  name: string;
  type: ExerciseType;
  isSystem: boolean;
  description: string | null;
  equipment: string[];
  kpis: { name: string }[];
};

type UsageMap = Record<
  string,
  { workoutEntries: number; templateEntries: number }
>;

const TYPE_ORDER: ExerciseType[] = ["STRENGTH", "BODYWEIGHT", "CARDIO", "MOBILITY", "REST"];

const TYPE_DESCRIPTIONS: Record<ExerciseType, string> = {
  STRENGTH: "Avec charges — poids, répétitions et RPE",
  BODYWEIGHT: "Poids de corps — répétitions et RPE",
  CARDIO: "Endurance — durée, distance, fréquence cardiaque",
  MOBILITY: "Mobilité et souplesse — durée",
  REST: "Temps de repos",
};

const TYPE_TONE: Record<ExerciseType, string> = {
  STRENGTH: "bg-accent text-accent-foreground",
  BODYWEIGHT: "bg-[var(--lavender)] text-foreground",
  CARDIO: "bg-[var(--peach)] text-foreground",
  MOBILITY: "bg-[var(--butter)] text-foreground",
  REST: "bg-surface-hover text-muted",
};

const TYPE_FILTERS: { value: ExerciseType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "STRENGTH", label: "Musculation" },
  { value: "BODYWEIGHT", label: "Poids de corps" },
  { value: "CARDIO", label: "Cardio" },
  { value: "MOBILITY", label: "Mobilité" },
];

function exerciseInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function ExerciseList({
  exercises,
  usageMap,
}: {
  exercises: Exercise[];
  usageMap: UsageMap;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ExerciseType | "ALL">("ALL");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingDelete = pendingDeleteId
    ? exercises.find((e) => e.id === pendingDeleteId) ?? null
    : null;
  const pendingUsage = pendingDeleteId ? usageMap[pendingDeleteId] : null;

  function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    startTransition(async () => {
      try {
        await deleteExerciseAction(id);
        toast.show("Exercice supprimé", { kind: "success" });
      } catch (err) {
        toast.show(
          err instanceof Error ? err.message : "Impossible de supprimer",
          { kind: "error" },
        );
      }
    });
  }

  function buildDeleteMessage(
    name: string,
    usage: { workoutEntries: number; templateEntries: number } | null | undefined,
  ): string {
    const w = usage?.workoutEntries ?? 0;
    const t = usage?.templateEntries ?? 0;
    if (w === 0 && t === 0) {
      return `Supprimer « ${name} » ? Il n'est utilisé nulle part.`;
    }
    if (w > 0 && t > 0) {
      return `« ${name} » est utilisé dans ${t} modèle${t > 1 ? "s" : ""} et ${w} séance${w > 1 ? "s" : ""}. La suppression sera bloquée tant qu'il est référencé.`;
    }
    if (t > 0) {
      return `« ${name} » est utilisé dans ${t} modèle${t > 1 ? "s" : ""}. La suppression sera bloquée tant qu'il est référencé.`;
    }
    return `« ${name} » est utilisé dans ${w} séance${w > 1 ? "s" : ""}. La suppression sera bloquée tant qu'il est référencé.`;
  }

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
        aria-label="Rechercher un exercice"
        className="w-full rounded-xl bg-surface shadow-card px-4 py-3 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/60 transition-shadow"
      />

      {/* Type filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer par type">
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setTypeFilter(f.value)}
              aria-pressed={active}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? "bg-foreground text-background shadow-card"
                  : "bg-surface shadow-card text-muted hover:text-foreground hover:shadow-hero"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {grouped.size === 0 ? (
        search ? (
          <EmptyState
            icon={Search}
            title="Aucun exercice trouvé"
            description={`Rien ne correspond à « ${search} ». Essaie un autre mot-clé.`}
          />
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="Aucun exercice"
            description="La bibliothèque est vide pour cette catégorie."
          />
        )
      ) : (
        Array.from(grouped.entries()).map(([type, items]) => (
          <section key={type} className="space-y-2.5">
            <div>
              <h2 className="text-[10px] uppercase tracking-widest font-semibold text-muted">
                {formatExerciseType(type)}
              </h2>
              <p className="text-[11px] text-subtle mt-0.5">{TYPE_DESCRIPTIONS[type]}</p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {items.map((exercise) => (
                <li key={exercise.id} className="relative">
                  <Link
                    href={`/exercises/${exercise.id}`}
                    className="group flex items-start gap-3 rounded-2xl bg-surface shadow-card p-3 hover:shadow-hero hover:-translate-y-0.5 transition-all"
                  >
                    <div
                      className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-display font-extrabold text-xs ${TYPE_TONE[exercise.type]}`}
                      aria-hidden="true"
                    >
                      {exerciseInitials(exercise.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-display font-bold text-[14px] truncate">
                          {exercise.name}
                        </p>
                        {exercise.isSystem && (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-background px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-subtle">
                            sys
                          </span>
                        )}
                      </div>
                      {exercise.description && (
                        <p className="text-[11px] text-muted mt-0.5 line-clamp-1">
                          {exercise.description}
                        </p>
                      )}
                      {exercise.kpis.length > 0 && (
                        <p className="text-[10px] text-subtle mt-1 truncate">
                          {exercise.kpis.map((k) => k.name).join(" · ")}
                        </p>
                      )}
                      {exercise.equipment.length > 0 && (
                        <p
                          className="text-[10px] text-muted mt-0.5 truncate"
                          title={exercise.equipment.join(", ")}
                        >
                          <span aria-hidden="true">🏋️ </span>
                          {exercise.equipment.slice(0, 3).join(" · ")}
                          {exercise.equipment.length > 3 ? " …" : ""}
                        </p>
                      )}
                    </div>
                    <span
                      className="shrink-0 text-subtle group-hover:text-foreground transition-colors"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </Link>
                  {!exercise.isSystem && (
                    <div className="absolute top-2 right-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPendingDeleteId(exercise.id);
                        }}
                        disabled={isPending}
                        aria-label={`Supprimer l'exercice ${exercise.name}`}
                        className="text-[10px] font-semibold text-subtle hover:text-danger hover:bg-danger-soft transition-colors px-2 py-1 rounded-md cursor-pointer disabled:opacity-50"
                      >
                        Suppr.
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <p className="text-[11px] text-subtle text-center tabular-nums">
        {filtered.length} exercice{filtered.length > 1 ? "s" : ""} trouvé
        {filtered.length > 1 ? "s" : ""}
      </p>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Supprimer cet exercice ?"
        message={
          pendingDelete
            ? buildDeleteMessage(pendingDelete.name, pendingUsage)
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
