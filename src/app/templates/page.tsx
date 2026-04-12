import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listTemplates } from "@/lib/templates/queries";
import { createTemplateAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const userId = await getCurrentUserId();
  const templates = await listTemplates(userId);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-8">
        <header className="flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-black tracking-tight">
            TEMPLATES
          </h1>
          <Link
            href="/dashboard"
            className="text-xs text-subtle hover:text-foreground whitespace-nowrap px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            &larr; Retour
          </Link>
        </header>

        <form action={createTemplateAction}>
          <button
            type="submit"
            className="w-full rounded-2xl bg-accent text-background py-4 text-base font-bold tracking-wide hover:bg-accent-dark transition-colors cursor-pointer uppercase"
          >
            + Nouveau template
          </button>
        </form>

        <section className="space-y-3">
          {templates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center">
              <p className="text-muted">
                Aucun template pour le moment.
              </p>
              <p className="text-sm text-subtle mt-2">
                Cr&eacute;e un template pour planifier tes s&eacute;ances &agrave; l&apos;avance.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/templates/${t.id}`}
                    className="group block rounded-2xl border border-surface-border bg-surface hover:bg-surface-hover hover:border-surface-border-hover transition-all p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate group-hover:text-accent transition-colors">
                          {t.name}
                        </p>
                        <p className="text-xs text-subtle mt-1">
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
                        <p className="text-sm font-semibold tabular-nums">
                          {t.entryCount} entr&eacute;e{t.entryCount > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-subtle mt-1">
                          {t.blockCount} bloc{t.blockCount > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
