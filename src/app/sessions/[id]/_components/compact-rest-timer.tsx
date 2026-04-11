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
      <div className="h-1 bg-foreground/10">
        <div
          className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Timer bar */}
      <div className="flex items-center justify-between px-4 h-14 bg-blue-600 text-white">
        <span className="text-sm font-medium">Repos</span>
        <span className="text-xl font-bold tabular-nums">
          {formatDuration(remaining)}
        </span>
        <button
          type="button"
          onClick={skip}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-white/70 hover:text-white cursor-pointer transition-colors"
        >
          Passer
        </button>
      </div>
    </div>
  );
}
