import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AICreateForm } from "./_components/ai-create-form";

export const dynamic = "force-dynamic";

export default async function CreateAIProgramPage() {
  const userId = await getCurrentUserId();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [
    user,
    templateCount,
    exerciseCount,
    workoutCount,
    wellnessCount,
    bodyWeightEntry,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        mentorEnabled: true,
        bodyWeightKg: true,
        sportProfile: {
          select: {
            sportObjective: true,
            weeklySessionTarget: true,
            sessionDurationMins: true,
          },
        },
      },
    }),
    prisma.workoutTemplate.count({ where: { userId } }),
    prisma.exercise.count({
      where: { OR: [{ isSystem: true }, { userId }] },
    }),
    prisma.workout.count({ where: { userId } }),
    prisma.wellnessLog.count({
      where: { userId, date: { gte: thirtyDaysAgo } },
    }),
    prisma.bodyWeightEntry.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: { id: true },
    }),
  ]);

  if (!user?.mentorEnabled) {
    redirect("/planning?tab=programs");
  }

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink">
              Mentor IA
            </p>
            <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
              Générer un programme
            </h1>
            <p className="text-xs text-muted mt-1">
              L&rsquo;IA compose un plan hebdomadaire et crée les modèles de
              séance correspondants.
              {templateCount > 0 ? (
                <>
                  {" "}Tes {templateCount} modèle{templateCount > 1 ? "s" : ""}{" "}
                  existant{templateCount > 1 ? "s seront réutilisés" : " sera réutilisé"}{" "}
                  si pertinent.
                </>
              ) : null}
            </p>
          </div>
          <Link
            href="/planning?tab=programs"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            <span aria-hidden="true">←</span> Retour à la planification
          </Link>
        </header>

        <AICreateForm
          context={{
            exerciseCount,
            workoutCount,
            wellnessCount,
            hasBodyWeight:
              user.bodyWeightKg != null || bodyWeightEntry != null,
          }}
          /* Pre-fill the textarea with a sentence built from onboarding
             so the user doesn't have to re-type everything they just
             told us. Kept short — the AI reads the full MentorContext
             anyway, this is just a hint/confirmation. */
          initialGoals={
            user.sportProfile?.sportObjective
              ? [
                  user.sportProfile.sportObjective,
                  user.sportProfile.weeklySessionTarget
                    ? `${user.sportProfile.weeklySessionTarget}×/semaine`
                    : null,
                  user.sportProfile.sessionDurationMins
                    ? `~${user.sportProfile.sessionDurationMins} min/séance`
                    : null,
                ]
                  .filter(Boolean)
                  .join(", ")
              : ""
          }
        />
      </div>
    </main>
  );
}
