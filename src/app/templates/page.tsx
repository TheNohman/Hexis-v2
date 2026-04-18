import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listTemplates } from "@/lib/templates/queries";
import { createTemplateAction } from "./actions";
import { prisma } from "@/lib/prisma";
import { TemplatesList } from "./_components/templates-list";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const userId = await getCurrentUserId();
  const [templates, user] = await Promise.all([
    listTemplates(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { mentorEnabled: true },
    }),
  ]);
  const aiEnabled = Boolean(user?.mentorEnabled);

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
            Modèles
          </h1>
          <Link
            href="/planning?tab=templates"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            <span aria-hidden="true">←</span> Retour à la planification
          </Link>
        </header>

        <div
          className={`grid gap-2 ${
            aiEnabled ? "grid-cols-1 sm:grid-cols-[1fr_auto]" : "grid-cols-1"
          }`}
        >
          <form action={createTemplateAction}>
            <button
              type="submit"
              className="w-full rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-card"
            >
              + Nouveau modèle
            </button>
          </form>
          {aiEnabled && (
            <Link
              href="/templates/create-ai"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-foreground py-3.5 px-5 text-sm font-bold hover:bg-accent-hover transition-colors cursor-pointer shadow-card whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Générer avec l&rsquo;IA
            </Link>
          )}
        </div>

        <TemplatesList templates={templates} />
      </div>
    </main>
  );
}
