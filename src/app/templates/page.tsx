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
          <h1 className="text-2xl font-bold">Templates</h1>
          <Link
            href="/dashboard"
            className="text-xs text-foreground/60 hover:text-foreground whitespace-nowrap"
          >
            ← Dashboard
          </Link>
        </header>

        <form action={createTemplateAction}>
          <button
            type="submit"
            className="w-full rounded-xl bg-foreground text-background py-4 text-lg font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            + Nouveau template
          </button>
        </form>

        <section className="space-y-3">
          {templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-foreground/20 p-8 text-center">
              <p className="text-foreground/60">
                Aucun template pour le moment.
              </p>
              <p className="text-sm text-foreground/40 mt-1">
                Crée un template pour planifier tes séances à l'avance.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/templates/${t.id}`}
                    className="block rounded-xl border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5 transition-colors p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-foreground/60 mt-0.5">
                          Modifié le{" "}
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(t.updatedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {t.entryCount} entrée{t.entryCount > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-foreground/60 mt-0.5">
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
