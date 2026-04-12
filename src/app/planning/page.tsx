import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listPrograms } from "@/lib/programs/queries";
import { listTemplates } from "@/lib/templates/queries";
import { createProgramAction } from "@/app/programs/actions";
import { createTemplateAction } from "@/app/templates/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function PlanningPage(props: Props) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab === "templates" ? "templates" : "programs";
  const userId = await getCurrentUserId();
  const userSettings = await prisma.user.findUnique({
    where: { id: userId },
    select: { mentorEnabled: true },
  });
  const mentorEnabled = userSettings?.mentorEnabled ?? false;

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Planification
          </h1>
          <Link href="/dashboard" className="text-xs text-muted hover:text-foreground transition-colors py-1">
            &larr; Retour
          </Link>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <Link
            href="/planning?tab=programs"
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "programs"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Programmes
          </Link>
          <Link
            href="/planning?tab=templates"
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "templates"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Templates
          </Link>
        </div>

        {tab === "programs" ? (
          <ProgramsTab userId={userId} mentorEnabled={mentorEnabled} />
        ) : (
          <TemplatesTab userId={userId} />
        )}
      </div>
    </main>
  );
}

async function ProgramsTab({ userId, mentorEnabled }: { userId: string; mentorEnabled: boolean }) {
  const programs = await listPrograms(userId);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <form action={createProgramAction} className="flex-1">
          <button
            type="submit"
            className="w-full rounded-xl bg-accent text-white py-3.5 font-semibold hover:bg-accent-hover transition-colors cursor-pointer shadow-sm"
          >
            + Nouveau programme
          </button>
        </form>
        {mentorEnabled && (
          <Link
            href="/programs/create-ai"
            className="shrink-0 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3.5 flex items-center gap-2 hover:bg-accent/10 transition-colors text-sm font-medium text-accent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a7 7 0 017 7c0 3-2 5.5-4 7l-1 2H10l-1-2c-2-1.5-4-4-4-7a7 7 0 017-7z" />
              <line x1="10" y1="22" x2="14" y2="22" />
            </svg>
            IA
          </Link>
        )}
      </div>

      {programs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted">Aucun programme pour le moment.</p>
          <p className="text-sm text-subtle mt-1">
            Cr&eacute;e un programme pour planifier tes semaines d&rsquo;entra&icirc;nement.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {programs.map((p) => (
            <li key={p.id}>
              <Link
                href={`/programs/${p.id}`}
                className="block rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{p.name}</p>
                      {p.isActive && (
                        <span className="shrink-0 text-[10px] font-semibold text-done bg-done-light rounded-full px-2 py-0.5">
                          Actif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {p.cycleCount} cycle{p.cycleCount > 1 ? "s" : ""} de {p.cycleDays}j &bull; {p.slotCount} cr&eacute;neau{p.slotCount > 1 ? "x" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function TemplatesTab({ userId }: { userId: string }) {
  const templates = await listTemplates(userId);

  return (
    <div className="space-y-4">
      <form action={createTemplateAction}>
        <button
          type="submit"
          className="w-full rounded-xl bg-accent text-white py-3.5 font-semibold hover:bg-accent-hover transition-colors cursor-pointer shadow-sm"
        >
          + Nouveau template
        </button>
      </form>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted">Aucun template pour le moment.</p>
          <p className="text-sm text-subtle mt-1">
            Cr&eacute;e un template pour planifier tes s&eacute;ances.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/templates/${t.id}`}
                className="block rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      Modifi&eacute; le{" "}
                      {new Intl.DateTimeFormat("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(t.updatedAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-medium tabular-nums">
                      {t.entryCount} entr&eacute;e{t.entryCount > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {t.blockCount} bloc{t.blockCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
