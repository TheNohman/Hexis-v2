"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDuration } from "@/lib/format";
import type { TemplateDetail } from "@/lib/templates/types";
import { updateTemplateEntryRestAction } from "@/app/templates/actions";

type Entry = TemplateDetail["blocks"][number]["entries"][number];

type Props = {
  templateId: string;
  entry: Entry;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
};

export function TemplateEntryRow({
  templateId,
  entry,
  onDuplicate,
  onDelete,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [editingRest, setEditingRest] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
    <li ref={setNodeRef} style={style}>
      <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-foreground/5 transition-colors group">
        <button
          type="button"
          className="cursor-grab touch-none text-foreground/30 hover:text-foreground/60 pr-2"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{entry.exercise.name}</p>
          {values && (
            <p className="text-xs text-foreground/60 mt-0.5 truncate">
              {values}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setEditingRest(true)}
            className="px-2 py-1 text-xs rounded hover:bg-foreground/10 cursor-pointer disabled:opacity-50"
            title="Repos après"
          >
            ⏱
          </button>
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
      </div>

      {entry.restDurationSecs != null && !editingRest && (
        <div className="ml-8 mb-1 text-xs text-foreground/40">
          Repos : {formatDuration(entry.restDurationSecs)}
        </div>
      )}

      {editingRest && (
        <div className="ml-8 mb-1 flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={5}
            placeholder="Repos (sec)"
            defaultValue={entry.restDurationSecs ?? ""}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditingRest(false);
            }}
            onBlur={(e) => {
              const val = parseInt(e.target.value, 10);
              const secs = Number.isNaN(val) || val <= 0 ? null : val;
              startTransition(async () => {
                await updateTemplateEntryRestAction(
                  templateId,
                  entry.id,
                  secs,
                );
                setEditingRest(false);
              });
            }}
            className="w-24 rounded-lg bg-foreground/5 border border-foreground/10 px-2 py-1 text-xs focus:outline-none focus:border-foreground/40"
          />
          <span className="text-xs text-foreground/40">secondes de repos</span>
        </div>
      )}
    </li>
  );
}
