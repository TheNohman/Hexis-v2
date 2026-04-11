"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";

type Props = {
  durationSecs: number;
  onComplete: () => void;
};

export function RestTimer({ durationSecs, onComplete }: Props) {
  const [remaining, setRemaining] = useState(durationSecs);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    setRemaining(durationSecs);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [durationSecs]);

  useEffect(() => {
    if (remaining === 0) {
      onComplete();
    }
  }, [remaining, onComplete]);

  const skip = useCallback(() => {
    clearInterval(intervalRef.current);
    setRemaining(0);
  }, []);

  const progress = 1 - remaining / durationSecs;

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 text-center space-y-3">
      <p className="text-xs text-blue-400 uppercase tracking-wide font-medium">
        Repos
      </p>
      <p className="text-3xl font-bold tabular-nums">
        {formatDuration(remaining)}
      </p>
      <div className="w-full h-1.5 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <button
        type="button"
        onClick={skip}
        className="text-xs text-foreground/50 hover:text-foreground cursor-pointer"
      >
        Passer le repos
      </button>
    </div>
  );
}
