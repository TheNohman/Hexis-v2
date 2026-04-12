import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listExercisesForUser } from "@/lib/workouts/queries";
import { formatExerciseType } from "@/lib/format";
import { createExerciseAction, deleteExerciseAction } from "./actions";
import type { ExerciseType } from "@/generated/prisma/enums";
import { ExerciseList } from "./_components/exercise-list";

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

        {/* Searchable exercise list */}
        <ExerciseList exercises={exercises} />
      </div>
    </main>
  );
}
