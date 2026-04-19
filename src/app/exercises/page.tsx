import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listExercisesForUser } from "@/lib/workouts/queries";
import { getExerciseUsageMap } from "@/lib/exercises/queries";
import { formatExerciseType } from "@/lib/format";
import { createExerciseAction } from "./actions";
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
  // Usage counts feed the delete ConfirmDialog — we only need counts for
  // custom (non-system) exercises since system ones can't be deleted.
  const customIds = exercises.filter((e) => !e.isSystem).map((e) => e.id);
  const usageMap = await getExerciseUsageMap(customIds);

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-6 pb-28">
      <div className="max-w-2xl w-full space-y-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px] leading-tight">
              Exercices
            </h1>
            <p className="text-xs text-muted mt-1 tabular-nums">
              {(() => {
                // Split system (seeded catalog) vs custom (user-created).
                // A fresh user has 25 system + 0 custom — reading
                // "25 dans ta bibliothèque" to a new user suggests they
                // added exercises they didn't. Show the split when it's
                // meaningful, collapse to a single count otherwise.
                const customCount = exercises.filter((e) => !e.isSystem).length;
                const systemCount = exercises.length - customCount;
                if (customCount === 0) {
                  return `${systemCount} exercice${systemCount > 1 ? "s" : ""} système`;
                }
                if (systemCount === 0) {
                  return `${customCount} exercice${customCount > 1 ? "s" : ""} personnalisé${customCount > 1 ? "s" : ""}`;
                }
                return `${exercises.length} dans ta bibliothèque · ${customCount} perso${customCount > 1 ? "s" : ""}`;
              })()}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-muted hover:text-foreground transition-colors py-1"
          >
            ← Retour
          </Link>
        </header>

        {/* Create form — dashed card, inline primary CTA */}
        <form
          action={createExerciseAction}
          className="rounded-2xl border border-dashed border-border p-4 space-y-3"
          aria-label="Créer un exercice"
        >
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
            Créer un exercice
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              name="name"
              placeholder="Nom de l'exercice"
              required
              aria-label="Nom de l'exercice"
              className="flex-1 rounded-xl bg-surface shadow-card px-3 py-2.5 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/60 transition-shadow"
            />
            <select
              name="type"
              required
              aria-label="Type d'exercice"
              className="rounded-xl bg-surface shadow-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60 transition-shadow"
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
            aria-label="Description"
            className="w-full rounded-xl bg-surface shadow-card px-3 py-2.5 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/60 transition-shadow"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-foreground text-background py-3 text-sm font-semibold hover:bg-foreground/90 transition-colors cursor-pointer shadow-card"
          >
            + Ajouter l&rsquo;exercice
          </button>
        </form>

        {/* Searchable exercise list */}
        <ExerciseList exercises={exercises} usageMap={usageMap} />
      </div>
    </main>
  );
}
