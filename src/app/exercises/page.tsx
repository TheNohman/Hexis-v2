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

  // Group exercises by type
  const grouped = new Map<ExerciseType, typeof exercises>();
  for (const type of TYPE_ORDER) {
    const items = exercises.filter((e) => e.type === type);
    if (items.length > 0) {
      grouped.set(type, items);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-8">
        <header className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">Exercices</h1>
          <Link
            href="/dashboard"
            className="text-xs text-foreground/60 hover:text-foreground whitespace-nowrap"
          >
            &larr; Dashboard
          </Link>
        </header>

        {/* --- Create exercise form --- */}
        <form
          action={createExerciseAction}
          className="rounded-xl border border-foreground/10 p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide">
            Cr&eacute;er un exercice
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              name="name"
              placeholder="Nom de l'exercice"
              required
              className="flex-1 rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
            <select
              name="type"
              required
              className="rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30"
            >
              {TYPE_ORDER.filter((t) => t !== "REST").map((t) => (
                <option key={t} value={t}>
                  {formatExerciseType(t)}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            name="description"
            placeholder="Description (optionnel)"
            className="w-full rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            + Ajouter
          </button>
        </form>

        {/* --- Exercise list grouped by type --- */}
        {grouped.size === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/20 p-8 text-center">
            <p className="text-foreground/60">Aucun exercice pour le moment.</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([type, items]) => (
            <section key={type} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide">
                {formatExerciseType(type)}
              </h2>
              <ul className="space-y-2">
                {items.map((exercise) => (
                  <li
                    key={exercise.id}
                    className="rounded-xl border border-foreground/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {exercise.name}
                          {exercise.isSystem && (
                            <span className="ml-2 text-xs text-foreground/40">
                              syst&egrave;me
                            </span>
                          )}
                        </p>
                        {exercise.description && (
                          <p className="text-xs text-foreground/60 mt-0.5">
                            {exercise.description}
                          </p>
                        )}
                        {exercise.kpis.length > 0 && (
                          <p className="text-xs text-foreground/40 mt-1">
                            {exercise.kpis.map((k) => k.name).join(", ")}
                          </p>
                        )}
                      </div>
                      {!exercise.isSystem && (
                        <DeleteButton exerciseId={exercise.id} />
                      )}
                    </div>
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

function DeleteButton({ exerciseId }: { exerciseId: string }) {
  const deleteWithId = deleteExerciseAction.bind(null, exerciseId);
  return (
    <form action={deleteWithId}>
      <button
        type="submit"
        className="shrink-0 text-xs text-red-500 hover:text-red-400 transition-colors cursor-pointer"
      >
        Supprimer
      </button>
    </form>
  );
}
