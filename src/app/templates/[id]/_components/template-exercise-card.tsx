"use client";

import { useState, useTransition } from "react";
import { formatDuration } from "@/lib/format";
import type { TemplateDetail } from "@/lib/templates/types";
import type { ExerciseGroup } from "@/app/sessions/[id]/_components/group-entries";
import {
  duplicateTemplateEntryAction,
  deleteTemplateEntryAction,
  updateTemplateEntryRestAction,
} from "@/app/templates/actions";

type Entry = TemplateDetail["blocks"][number]["entries"][number];

type Props = {
  templateId: string;
  blockId: string;
  group: ExerciseGroup<Entry>;
};

export function TemplateExerciseCard({ templateId, blockId, group }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDeleteAll() {
    if (!confirm(`Supprimer "${group.exerciseName}" et toutes ses séries ?`))
      return;
    startTransition(async () => {
      for (const set of group.sets) {
        await deleteTemplateEntryAction(templateId, set.id);
      }
    });
    setMenuOpen(false);
  }

  function handleDuplicateLast() {
    const last = group.sets[group.sets.length - 1];
    startTransition(() => duplicateTemplateEntryAction(templateId, last.id));
  }

  return (
    <div className="rounded-xl border border-foreground/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-foreground/[0.02] border-b border-foreground/10">
        <span className="text-sm font-semibold truncate">
          {group.exerciseName}
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground/40 hover:text-foreground cursor-pointer"
          >
            ···
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 bg-background border border-foreground/10 rounded-lg shadow-lg py-1 min-w-[160px]">
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={isPending}
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 cursor-pointer disabled:opacity-50"
              >
                Supprimer l'exercice
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sets table */}
      <div className="divide-y divide-foreground/5">
        {/* Column header */}
        <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem] items-center px-3 py-1.5 text-[10px] uppercase tracking-wide text-foreground/40">
          <span>#</span>
          <span>Valeurs</span>
          <span />
          <span />
        </div>

        {group.sets.map((entry, idx) => (
          <TemplateSetRow
            key={entry.id}
            templateId={templateId}
            entry={entry}
            setNumber={idx + 1}
            onDuplicate={() =>
              startTransition(() =>
                duplicateTemplateEntryAction(templateId, entry.id),
              )
            }
            onDelete={() =>
              startTransition(() =>
                deleteTemplateEntryAction(templateId, entry.id),
              )
            }
          />
        ))}
      </div>

      {/* Add set */}
      <button
        type="button"
        onClick={handleDuplicateLast}
        disabled={isPending}
        className="w-full px-3 py-3 text-sm text-foreground/60 hover:bg-foreground/5 border-t border-foreground/10 cursor-pointer transition-colors disabled:opacity-50"
      >
        + Série
      </button>

      {/* Rest indicator */}
      {group.restDurationSecs != null && !editingRest && (
        <button
          type="button"
          onClick={() => setEditingRest(true)}
          className="w-full px-3 py-1.5 text-xs text-foreground/40 hover:text-foreground/60 border-t border-foreground/5 cursor-pointer"
        >
          Repos : {formatDuration(group.restDurationSecs)}
        </button>
      )}
      {(editingRest || group.restDurationSecs == null) && (
        <div className="px-3 py-2 border-t border-foreground/5 flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={5}
            placeholder="Repos (sec)"
            defaultValue={group.restDurationSecs ?? ""}
            autoFocus={editingRest}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditingRest(false);
            }}
            onBlur={(e) => {
              const val = parseInt(e.target.value, 10);
              const secs = Number.isNaN(val) || val <= 0 ? null : val;
              const last = group.sets[group.sets.length - 1];
              startTransition(async () => {
                await updateTemplateEntryRestAction(templateId, last.id, secs);
                setEditingRest(false);
              });
            }}
            className="w-24 rounded-lg bg-foreground/5 border border-foreground/10 px-2 py-1 text-xs focus:outline-none focus:border-foreground/40"
          />
          <span className="text-xs text-foreground/40">sec repos</span>
        </div>
      )}
    </div>
  );
}

/* ── Inline set row for template ── */

function TemplateSetRow({
  templateId: _templateId,
  entry,
  setNumber,
  onDuplicate,
  onDelete,
}: {
  templateId: string;
  entry: Entry;
  setNumber: number;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
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
    <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem] items-center px-3 py-2">
      <span className="text-xs text-foreground/40 tabular-nums">
        {setNumber}
      </span>
      <span className="text-sm truncate">
        {values || <span className="text-foreground/30">—</span>}
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => onDuplicate())}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground/30 hover:text-foreground/60 cursor-pointer disabled:opacity-50"
        title="Dupliquer"
      >
        ⎘
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => onDelete())}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground/30 hover:text-red-500 cursor-pointer disabled:opacity-50"
        title="Supprimer"
      >
        ✕
      </button>
    </div>
  );
}
