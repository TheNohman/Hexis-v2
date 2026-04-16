"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  sessionId: string;
  name: string;
  completedEntries: number;
  totalEntries: number;
  startedAt: string;
};

export function ActiveSessionBannerClient({
  sessionId,
  name,
  completedEntries,
  totalEntries,
  startedAt,
}: Props) {
  const pathname = usePathname();
  const startedMs = new Date(startedAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Hide on the session screen (already there), landing, and api routes.
  if (pathname.startsWith("/sessions/")) return null;
  if (pathname === "/" || pathname.startsWith("/api")) return null;

  const elapsedMins = Math.max(0, Math.floor((now - startedMs) / 60000));
  const elapsedLabel =
    elapsedMins < 60
      ? `${elapsedMins} min`
      : `${Math.floor(elapsedMins / 60)}h${String(elapsedMins % 60).padStart(2, "0")}`;

  return (
    <>
      {/* Spacer that reserves layout space so the fixed banner doesn't
          overlap page content. Height tuned to match the banner + margins. */}
      <div aria-hidden className="h-14" />
      <Link
        href={`/sessions/${sessionId}`}
        className="fixed top-[env(safe-area-inset-top)] left-0 right-0 z-40 mx-auto max-w-2xl px-3 pt-2"
      >
        <div className="rounded-xl border border-accent/30 bg-accent/10 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg hover:bg-accent/15 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-accent font-semibold">
              S&eacute;ance en cours
            </p>
            <p className="text-sm font-medium truncate">
              {name}{" "}
              <span className="text-xs text-muted tabular-nums">
                &middot; {completedEntries}/{totalEntries} &middot; {elapsedLabel}
              </span>
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-accent whitespace-nowrap">
          Reprendre &rarr;
        </span>
      </div>
      </Link>
    </>
  );
}
