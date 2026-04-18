import Link from "next/link";
import { Card } from "@/app/_components/card";

export function MentorAdviceCard({ advice }: { advice: string }) {
  return (
    <Card
      variant="accent"
      rounded="2xl"
      padding="md"
      className="col-span-2 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
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
          <p className="text-[10px] font-semibold uppercase tracking-widest">
            Mentor IA
          </p>
        </div>
        <Link
          href="/mentor"
          aria-label="Ouvrir le mentor IA"
          className="text-[10px] uppercase tracking-widest font-semibold underline-offset-2 hover:underline"
        >
          Voir
        </Link>
      </div>
      <p className="text-sm leading-relaxed">{advice}</p>
    </Card>
  );
}
