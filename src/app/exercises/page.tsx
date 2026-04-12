import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listExercisesForUser } from "@/lib/workouts/queries";
import { formatExerciseType } from "@/lib/format";
import { createExerciseAction, deleteExerciseAction } from "./actions";
import type { ExerciseType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const TYPE_ORDER: ExerciseType[] = [
  "STRENGTH",
  "BODYWEIGHT",
  "CARDIO",
  "MOBILITY",
  "REST",
];

export default async function ExercisesPage() {
  const userId = await getCurrentUserId();
  const exercises = await listExercisesForUser(userId);

  const grouped = new Map<ExerciseType, typeof exercises>();
  for (const type of TYPE_ORDER) {
    const items = exercises.filter((e) => e.type === type);
    if (items.length > 0) grouped.set(type, items);
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Exercices
          </h1>
          <Link href="/dashboard" className="text-xs text-muted hover:text-foreground transition-colors py-1">
            &larr; Retour
          </Link>
        </header>

        {/* Create form */}
        <form action={createExerciseAction} className="rounded-xl border border-border bg-surface p-4 space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Cr&eacute;er un exercice
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text" name="name" placeholder="Nom de l'exercice" required
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-subtle focus:outline-none focus:border-accent transition-colors"
            />
            <select
              name="type" required
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            >
              {TYPE_ORDER.filter((t) => t !== "REST").map((t) => (
                <option key={t} value={t}>{formatExerciseType(t)}</option>
              ))}
            </select>
          </div>
          <input
            type="text" name="description" placeholder="Description (optionnel)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-subtle focus:outline-none focus:border-accent transition-colors"
          />
          <button type="submit" className="w-full rounded-lg bg-accent text-white py-2.5 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer">
            + Ajouter
          </button>
        </form>

        {/* List */}
        {grouped.size === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-muted">Aucun exercice pour le moment.</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([type, items]) => (
            <section key={type} className="space-y-2">
              <div>
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
                  {formatExerciseType(type)}
                </h2>
                <p className="text-[11px] text-subtle mt-0.5">{exerciseTypeDescription(type)}</p>
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
      </div>
    </main>
  );
}

function exerciseTypeDescription(type: ExerciseType): string {
  switch (type) {
    case "STRENGTH":
      return "Exercices avec charges — suivi du poids, répétitions et RPE";
    case "BODYWEIGHT":
      return "Exercices au poids de corps — suivi des répétitions et RPE";
    case "CARDIO":
      return "Exercices d'endurance — suivi de la durée, distance et fréquence cardiaque";
    case "MOBILITY":
      return "Exercices de mobilité et souplesse — suivi de la durée";
    case "REST":
      return "Temps de repos entre les exercices";
  }
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
