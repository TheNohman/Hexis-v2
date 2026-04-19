import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listPrograms } from "@/lib/programs/queries";
import { listTemplates } from "@/lib/templates/queries";
import { createProgramAction } from "@/app/programs/actions";
import { prisma } from "@/lib/prisma";
import { ProgramsList } from "./_components/programs-list";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function PlanningPage(props: Props) {
  const searchParams = await props.searchParams;
  // The "Modèles" tab used to render a duplicate (and weaker) list of
  // templates here. `/templates` already provides the full management
  // surface (search, category filters, sort, bulk, favorites, IA chip).
  // Rather than maintain two surfaces, redirect the tab click there.
  if (searchParams.tab === "templates") {
    redirect("/templates");
  }
  const tab = "programs" as const;
  const userId = await getCurrentUserId();
  const userSettings = await prisma.user.findUnique({
    where: { id: userId },
    select: { mentorEnabled: true },
  });
  const mentorEnabled = userSettings?.mentorEnabled ?? false;

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
            Planification
          </h1>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            <span aria-hidden="true">←</span> Retour
          </Link>
        </header>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Sections de planification"
          className="flex border-b border-border"
        >
          <Link
            href="/planning?tab=programs"
            role="tab"
            aria-selected={tab === "programs"}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === "programs"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Programmes
          </Link>
          <Link
            href="/templates"
            role="tab"
            aria-selected={false}
            className="px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px border-transparent text-muted hover:text-foreground"
          >
            Modèles <span aria-hidden="true" className="ml-0.5 text-subtle">↗</span>
          </Link>
        </div>

        <ProgramsTab userId={userId} mentorEnabled={mentorEnabled} />
      </div>
    </main>
  );
}

async function ProgramsTab({ userId, mentorEnabled }: { userId: string; mentorEnabled: boolean }) {
  const programs = await listPrograms(userId);
  const templates = await listTemplates(userId);
  const isNewUser = programs.length === 0 && templates.length === 0;

  return (
    <div className="space-y-4">
      {/* Onboarding guide — hero black card for new users */}
      {isNewUser && (
        <section className="rounded-3xl bg-foreground text-background p-6 shadow-hero space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-accent">
              Bienvenue
            </p>
            <h3 className="font-display font-extrabold text-xl tracking-tight mt-1">
              Comment démarrer ?
            </h3>
          </div>
          <ol className="space-y-3">
            {[
              {
                n: 1,
                title: "Crée tes séances types (Modèles)",
                desc: "Un modèle = une séance réutilisable (ex. « Upper Body », « Jambes »).",
              },
              {
                n: 2,
                title: "Organise-les dans un Programme",
                desc: "Assigne tes modèles aux jours de la semaine.",
              },
              {
                n: 3,
                title: "Active le programme",
                desc: "Ta prochaine séance apparaîtra sur le dashboard.",
              },
            ].map((step) => (
              <li key={step.n} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="shrink-0 w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-display font-black flex items-center justify-center tabular-nums"
                >
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-background/70 mt-0.5">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          {mentorEnabled && (
            <Link
              href="/programs/create-ai"
              className="block w-full rounded-xl bg-accent text-accent-foreground py-3 text-center text-sm font-semibold hover:bg-accent-hover transition-colors"
            >
              <Sparkles className="inline h-4 w-4 -mt-0.5 mr-1.5" aria-hidden="true" />
              Ou génère un programme complet avec l&rsquo;IA
            </Link>
          )}
        </section>
      )}

      <div className="flex gap-2">
        <form action={createProgramAction} className="flex-1">
          <button
            type="submit"
            className="w-full rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-card"
          >
            + Nouveau programme
          </button>
        </form>
        {mentorEnabled && (
          <Link
            href="/programs/create-ai"
            className="shrink-0 rounded-xl bg-accent text-accent-foreground px-5 py-3.5 flex items-center gap-2 hover:bg-accent-hover transition-colors text-sm font-semibold"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Générer avec l&rsquo;IA
          </Link>
        )}
      </div>

      {isNewUser ? null : <ProgramsList programs={programs} />}
    </div>
  );
}

// TemplatesTab removed: the /templates page is the single source of
// truth for template management. The tab now redirects there.
