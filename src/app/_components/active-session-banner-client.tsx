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
        aria-label="Reprendre la séance en cours"
      >
        <div className="rounded-xl border border-signal/40 bg-signal-light/80 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg hover:bg-signal-light transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-signal-ink font-bold">
                Séance en cours
              </p>
              <p className="text-sm font-medium truncate">
                {name}{" "}
                <span className="text-xs text-muted tabular-nums">
                  · {completedEntries}/{totalEntries} · {elapsedLabel}
                </span>
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-signal-ink whitespace-nowrap">
            Reprendre →
          </span>
        </div>
      </Link>
    </>
  );
}
