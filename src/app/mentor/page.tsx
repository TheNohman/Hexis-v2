import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getUserProfile } from "@/lib/profile/mutations";
import {
  getSessionAdvice,
  getMentorAdviceHistory,
  getRemainingRateLimit,
} from "@/lib/mentor/advice";
import { RegenerateButton } from "./_components/regenerate-button";
import { formatRelative } from "@/lib/format";
import { Card } from "@/app/_components/card";

export const dynamic = "force-dynamic";

export default async function MentorPage() {
  const userId = await getCurrentUserId();
  const profile = await getUserProfile(userId);

  // Gated UI: mentor disabled in profile.
  if (!profile.mentorEnabled) {
    return (
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="max-w-2xl w-full space-y-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight">
                Mentor IA
              </h1>
              <p className="text-xs text-muted mt-1">
                Ton coach virtuel, au courant de tes donn&eacute;es.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-muted hover:text-foreground transition-colors py-1"
            >
              &larr; Retour
            </Link>
          </header>
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center space-y-3">
            <p className="text-sm text-muted">
              Le Mentor IA est d&eacute;sactiv&eacute;.
            </p>
            <p className="text-xs text-subtle">
              Active le Mentor IA dans ton profil pour recevoir des conseils
              personnalis&eacute;s.
            </p>
            <Link
              href="/profile"
              className="inline-block text-sm font-semibold text-accent hover:text-accent-hover"
            >
              Aller au profil &rarr;
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [advice, history, rate] = await Promise.all([
    getSessionAdvice(userId),
    getMentorAdviceHistory(userId, 10),
    Promise.resolve(getRemainingRateLimit(userId)),
  ]);

  const rateLimited = rate.remaining <= 0;
  const disabledReason = rateLimited
    ? `Limite horaire atteinte. R\u00e9essaie plus tard.`
    : null;

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              Mentor IA
            </h1>
            <p className="text-xs text-muted mt-1">
              Conseil personnalis&eacute; pour ta prochaine s&eacute;ance.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Retour
          </Link>
        </header>

        {/* ── Current advice ── */}
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Conseil du moment
            </h2>
            <span
              className={`text-[11px] tabular-nums rounded-full px-2 py-0.5 ${
                rateLimited
                  ? "bg-danger/10 text-danger"
                  : "bg-accent/10 text-accent"
              }`}
              title={
                rate.resetAt
                  ? `Remise \u00e0 z\u00e9ro vers ${new Date(rate.resetAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                  : undefined
              }
            >
              {rateLimited
                ? "Limite atteinte"
                : `Il reste ${rate.remaining} g\u00e9n\u00e9ration${rate.remaining > 1 ? "s" : ""} cette heure`}
            </span>
          </div>

          {advice ? (
            <p className="text-sm leading-relaxed">{advice}</p>
          ) : (
            <p className="text-sm text-subtle">
              Aucun conseil disponible pour l&apos;instant. Lance une
              g&eacute;n&eacute;ration ou enregistre ta premi&egrave;re
              s&eacute;ance.
            </p>
          )}

          <div className="flex items-center gap-3">
            <RegenerateButton
              disabled={rateLimited}
              disabledReason={disabledReason}
            />
            <p className="text-[11px] text-subtle">
              Jusqu&apos;&agrave; {rate.max} g&eacute;n&eacute;rations / heure.
            </p>
          </div>
        </section>

        {/* ── History ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Historique
          </h2>
          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-xs text-subtle">
                Aucun conseil archiv&eacute; pour le moment.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <Card
                  as="li"
                  key={h.id}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-[11px] uppercase tracking-wider text-subtle">
                      {formatRelative(h.createdAt)}
                    </span>
                    <span className="text-[11px] text-subtle tabular-nums">
                      {new Intl.DateTimeFormat("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(h.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{h.content}</p>
                </Card>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
