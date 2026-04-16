"use client";

import { useEffect, useState } from "react";

type Props = {
  startedAt: Date | string;
};

/**
 * Live stopwatch showing the total elapsed time of the current session.
 * Updates every second. Format is MM:SS below 1h, H:MM:SS above.
 */
export function SessionTimer({ startedAt }: Props) {
  const startedMs = new Date(startedAt).getTime();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSecs = Math.max(0, Math.floor((now - startedMs) / 1000));
  const h = Math.floor(elapsedSecs / 3600);
  const m = Math.floor((elapsedSecs % 3600) / 60);
  const s = elapsedSecs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted tabular-nums">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
