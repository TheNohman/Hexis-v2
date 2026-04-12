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
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Templates
          </h1>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Retour
          </Link>
        </header>

        <form action={createTemplateAction}>
          <button
            type="submit"
            className="w-full rounded-xl bg-accent text-white py-3.5 font-semibold hover:bg-accent-hover transition-colors cursor-pointer shadow-sm"
          >
            + Nouveau template
          </button>
        </form>

        <section className="space-y-2">
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
        </section>
      </div>
    </main>
  );
}
