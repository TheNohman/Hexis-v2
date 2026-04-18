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
      <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="max-w-2xl w-full space-y-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] tracking-tight">
                Mentor IA
              </h1>
              <p className="text-xs text-muted mt-1">
                Ton coach virtuel, au courant de tes données.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-muted hover:text-foreground transition-colors py-1"
            >
              &larr; Retour
            </Link>
          </header>
          <Card variant="dashed" rounded="3xl" padding="xl" className="text-center space-y-3">
            <p className="text-sm text-muted">
              Le Mentor IA est désactivé.
            </p>
            <p className="text-xs text-subtle">
              Active le Mentor IA dans ton profil pour recevoir des conseils personnalisés.
            </p>
            <Link
              href="/profile"
              className="inline-block text-sm font-semibold text-accent-ink hover:text-foreground"
            >
              Aller au profil &rarr;
            </Link>
          </Card>
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
    ? `Limite horaire atteinte. Réessaie plus tard.`
    : null;

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] tracking-tight">
              Mentor IA
            </h1>
            <p className="text-xs text-muted mt-1">
              Conseil personnalisé pour ta prochaine séance.
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
        <Card variant="hero" rounded="3xl" padding="xl" as="section" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-background/70">
              Conseil du moment
            </h2>
            <span
              className={`text-[10px] uppercase tracking-widest font-semibold tabular-nums rounded-full px-2 py-1 ${
                rateLimited
                  ? "bg-danger-soft text-danger"
                  : "bg-accent text-accent-foreground"
              }`}
              title={
                rate.resetAt
                  ? `Remise à zéro vers ${new Date(rate.resetAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                  : undefined
              }
            >
              {rateLimited
                ? "Limite atteinte"
                : `${rate.remaining} / h`}
            </span>
          </div>

          {advice ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-line">{advice}</p>
          ) : (
            <p className="text-sm text-background/70">
              Aucun conseil disponible pour l&apos;instant. Lance une génération ou enregistre ta première séance.
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <RegenerateButton
              disabled={rateLimited}
              disabledReason={disabledReason}
            />
            <p className="text-[11px] text-background/60">
              Jusqu&apos;à {rate.max} générations / heure.
            </p>
          </div>
        </Card>

        {/* ── History ── */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
            Historique
          </h2>
          {history.length === 0 ? (
            <Card variant="dashed" rounded="2xl" padding="lg" className="text-center">
              <p className="text-xs text-subtle">
                Aucun conseil archivé pour le moment.
              </p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <Card as="li" rounded="2xl" padding="md" key={h.id}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-subtle">
                      {formatRelative(h.createdAt)}
                    </span>
                    <span className="text-[11px] text-subtle tabular-nums">
                      {new Intl.DateTimeFormat("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(h.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{h.content}</p>
                </Card>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
