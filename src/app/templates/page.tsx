import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listTemplates } from "@/lib/templates/queries";
import { EmptyState } from "@/app/_components/empty-state";
import { createTemplateAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const userId = await getCurrentUserId();
  const templates = await listTemplates(userId);

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
            Modèles
          </h1>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            <span aria-hidden="true">←</span> Retour
          </Link>
        </header>

        <form action={createTemplateAction}>
          <button
            type="submit"
            className="w-full rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-card"
          >
            + Nouveau modèle
          </button>
        </form>

        <section className="space-y-2.5">
          {templates.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Aucun modèle"
              description="Un modèle est une séance réutilisable. Utilise le bouton ci-dessus pour en créer un."
            />
          ) : (
            <ul className="space-y-2.5">
              {templates.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/templates/${t.id}`}
                    className="block rounded-2xl bg-surface shadow-card p-4 hover:shadow-hero hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-[15px] truncate">{t.name}</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          Modifié le{" "}
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(t.updatedAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-display font-black text-lg tabular-nums leading-none">
                          {t.entryCount}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mt-1">
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

