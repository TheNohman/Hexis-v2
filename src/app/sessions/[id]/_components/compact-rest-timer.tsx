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
      <div className="h-1 bg-border">
        <div className="h-full bg-accent transition-all duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center justify-between px-5 h-14 bg-background border-t border-border">
        <span className="text-sm font-medium text-muted">Repos</span>
        <span className="text-xl font-display font-bold tabular-nums text-accent">{formatDuration(remaining)}</span>
        <button type="button" onClick={skip}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-muted hover:text-foreground cursor-pointer transition-colors">
          Passer
        </button>
      </div>
    </div>
  );
}
