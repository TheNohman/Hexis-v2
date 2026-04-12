"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";

type Props = {
  durationSecs: number;
  onComplete: () => void;
};

export function CompactRestTimer({ durationSecs, onComplete }: Props) {
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
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Progress bar */}
      <div className="h-1 bg-surface-hover">
        <div
          className="h-full bg-accent transition-all duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Timer bar */}
      <div className="flex items-center justify-between px-5 h-16 bg-background border-t border-surface-border backdrop-blur-xl">
        <span className="text-sm font-bold text-muted uppercase tracking-wide">Repos</span>
        <span className="text-2xl font-display font-black tabular-nums text-accent">
          {formatDuration(remaining)}
        </span>
        <button
          type="button"
          onClick={skip}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-subtle hover:text-foreground cursor-pointer transition-colors font-medium"
        >
          Passer
        </button>
      </div>
    </div>
  );
}
