import Link from "next/link";
import { Card } from "@/app/_components/card";

/**
 * Link-only access to /mentor. The actual advice lives on /mentor to avoid
 * duplicated surfaces. Rendered only when the user has enabled the mentor.
 */
export function MentorAdviceCard() {
  return (
    <Link
      href="/mentor"
      aria-label="Ouvrir le Mentor IA"
      className="col-span-2 group block"
    >
      <Card variant="accent" rounded="2xl" padding="md" className="h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="6" r="4" />
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest">
                Mentor IA
              </p>
              <p className="text-xs text-accent-ink/80 mt-0.5 truncate">
                Analyse & conseils personnalisés
              </p>
            </div>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0 group-hover:translate-x-0.5 transition-transform"
          >
            <path d="M5 3l4 4-4 4" />
          </svg>
        </div>
      </Card>
    </Link>
  );
}
