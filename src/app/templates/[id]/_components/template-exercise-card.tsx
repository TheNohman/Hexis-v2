"use client";

import { useState, useTransition } from "react";
import { formatDuration } from "@/lib/format";
import type { TemplateDetail } from "@/lib/templates/types";
import type { ExerciseGroup } from "@/app/sessions/[id]/_components/group-entries";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import {
  duplicateTemplateEntryAction,
  deleteTemplateEntryAction,
  updateTemplateEntryRestAction,
} from "@/app/templates/actions";

type Entry = TemplateDetail["blocks"][number]["entries"][number];

type Props = {
  templateId: string;
  group: ExerciseGroup<Entry>;
};

export function TemplateExerciseCard({ templateId, group }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDeleteAll() {
    setMenuOpen(false);
    setConfirmDeleteOpen(true);
  }

  function handleConfirmDelete() {
    setConfirmDeleteOpen(false);
    startTransition(async () => {
      for (const set of group.sets) {
        await deleteTemplateEntryAction(templateId, set.id);
      }
    });
  }

  function handleDuplicateLast() {
    const last = group.sets[group.sets.length - 1];
    startTransition(() => duplicateTemplateEntryAction(templateId, last.id));
  }

  return (
    <div className="rounded-2xl bg-surface shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-display font-bold truncate">
          {group.exerciseName}
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu de l’exercice"
            aria-expanded={menuOpen}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtle hover:text-foreground cursor-pointer transition-colors rounded-lg"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded-xl shadow-hero py-1 min-w-[160px]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDeleteAll}
                  disabled={isPending}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-danger-soft cursor-pointer disabled:opacity-50 transition-colors"
                >
                  Supprimer l&rsquo;exercice
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sets table */}
      <div className="divide-y divide-border/60">
        {/* Column header */}
        <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem] items-center px-4 py-2 text-[10px] uppercase tracking-widest text-subtle font-semibold">
          <span>#</span>
          <span>Valeurs</span>
          <span />
          <span />
        </div>

        {group.sets.map((entry, idx) => (
          <TemplateSetRow
            key={entry.id}
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
        className="w-full px-4 py-3 text-sm text-muted hover:text-foreground border-t border-border cursor-pointer transition-colors disabled:opacity-50 font-medium"
      >
        + Série
      </button>

      {/* Rest indicator */}
      {group.restDurationSecs != null && !editingRest && (
        <button
          type="button"
          onClick={() => setEditingRest(true)}
          className="w-full px-4 py-2 text-xs text-subtle hover:text-muted border-t border-border/60 cursor-pointer transition-colors tabular-nums"
        >
          Repos : {formatDuration(group.restDurationSecs)}
        </button>
      )}
      {(editingRest || group.restDurationSecs == null) && (
        <div className="px-4 py-2.5 border-t border-border/60 flex items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="sr-only">Repos (secondes)</span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
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
              className="w-24 rounded-lg bg-background border border-border px-2.5 py-1.5 text-xs focus:outline-none focus:border-accent transition-colors tabular-nums"
            />
            <span className="text-xs text-subtle">sec repos</span>
          </label>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Supprimer cet exercice ?"
        message={`« ${group.exerciseName} » et ses ${group.sets.length} série${group.sets.length > 1 ? "s" : ""} seront supprimé${group.sets.length > 1 ? "s" : ""}.`}
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}

function TemplateSetRow({
  entry,
  setNumber,
  onDuplicate,
  onDelete,
}: {
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
    <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem] items-center px-4 py-2.5">
      <span className="text-xs text-subtle tabular-nums font-bold">
        {setNumber}
      </span>
      <span className="text-sm truncate tabular-nums">
        {values || <span className="text-subtle">—</span>}
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => onDuplicate())}
        aria-label="Dupliquer la série"
        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtle hover:text-foreground cursor-pointer disabled:opacity-50 transition-colors rounded-lg"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="5" width="8" height="8" rx="1.5" />
          <path d="M9 5V2.5A1.5 1.5 0 007.5 1H2.5A1.5 1.5 0 001 2.5v5A1.5 1.5 0 002.5 9H5" />
        </svg>
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => onDelete())}
        aria-label="Supprimer la série"
        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtle hover:text-danger cursor-pointer disabled:opacity-50 transition-colors rounded-lg"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <line x1="1" y1="1" x2="11" y2="11" />
          <line x1="11" y1="1" x2="1" y2="11" />
        </svg>
      </button>
    </div>
  );
}
