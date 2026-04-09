"use client";

import { useTransition } from "react";
import { formatDuration } from "@/lib/format";
import type { WorkoutDetail } from "@/lib/workouts/types";

type Entry = WorkoutDetail["blocks"][number]["entries"][number];

type Props = {
  entry: Entry;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
};

export function EntryRow({ entry, onDuplicate, onDelete }: Props) {
  const [isPending, startTransition] = useTransition();

  const values = entry.values
    .map((v) => {
      if (v.dataType === "DURATION" && v.valueNumeric != null) {
        return formatDuration(v.valueNumeric);
      }
      if (v.valueNumeric != null) {
        const unit = v.unit ? ` ${v.unit}` : "";
        return `${v.valueNumeric}${unit}`;
      }
      if (v.valueText) return v.valueText;
      return null;
    })
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-foreground/5 transition-colors group">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{entry.exercise.name}</p>
        {values && (
          <p className="text-xs text-foreground/60 mt-0.5 truncate">{values}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => onDuplicate())}
          className="px-2 py-1 text-xs rounded hover:bg-foreground/10 cursor-pointer disabled:opacity-50"
          title="Dupliquer"
        >
          ⎘
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => onDelete())}
          className="px-2 py-1 text-xs rounded hover:bg-red-500/10 text-red-500 cursor-pointer disabled:opacity-50"
          title="Supprimer"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
