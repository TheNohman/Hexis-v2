import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { AICreateTemplateForm } from "./_components/ai-create-template-form";

export const dynamic = "force-dynamic";

export default async function CreateAITemplatePage() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mentorEnabled: true },
  });

  if (!user?.mentorEnabled) {
    redirect("/templates");
  }

  // Fetch user's exercise library to show what the AI will have access to.
  const exercises = await prisma.exercise.findMany({
    where: { OR: [{ userId }, { isSystem: true }] },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink">
              Mentor IA
            </p>
            <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
              Générer un modèle
            </h1>
            <p className="text-xs text-muted mt-1">
              L&rsquo;IA compose une séance à partir de tes {exercises.length} exercice
              {exercises.length > 1 ? "s" : ""} disponibles.
            </p>
          </div>
          <Link
            href="/templates"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            <span aria-hidden="true">←</span> Retour
          </Link>
        </header>

        <AICreateTemplateForm exerciseCount={exercises.length} />
      </div>
    </main>
  );
}
