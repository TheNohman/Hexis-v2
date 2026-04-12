"use client";

import { useState, useTransition } from "react";
import {
  updateMeasurementTypeAction,
  deleteMeasurementTypeAction,
  reorderMeasurementTypesAction,
} from "@/app/measurements/actions";
import type { MeasurementTypeConfigData } from "@/lib/measurements/types";

type Props = {
  configs: MeasurementTypeConfigData[];
  onClose: () => void;
};

export function TypeManager({ configs, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(configs);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUnit, setEditUnit] = useState("");

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setItems(next);
    startTransition(() =>
      reorderMeasurementTypesAction(next.map((c) => c.slug)),
    );
  }

  function moveDown(idx: number) {
    if (idx >= items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setItems(next);
    startTransition(() =>
      reorderMeasurementTypesAction(next.map((c) => c.slug)),
    );
  }

  function startEdit(config: MeasurementTypeConfigData) {
    setEditingSlug(config.slug);
    setEditLabel(config.label);
    setEditUnit(config.unit);
  }

  function saveEdit() {
    if (!editingSlug || !editLabel.trim()) return;
    startTransition(async () => {
      await updateMeasurementTypeAction(editingSlug, {
        label: editLabel.trim(),
        unit: editUnit,
      });
      setItems((prev) =>
        prev.map((c) =>
          c.slug === editingSlug
            ? { ...c, label: editLabel.trim(), unit: editUnit }
            : c,
        ),
      );
      setEditingSlug(null);
    });
  }

  function handleDelete(slug: string) {
    startTransition(async () => {
      const result = await deleteMeasurementTypeAction(slug);
      if (result.deleted) {
        setItems((prev) => prev.filter((c) => c.slug !== slug));
      } else if (result.archived) {
        setItems((prev) => prev.filter((c) => c.slug !== slug));
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Gérer les types</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted hover:text-foreground cursor-pointer transition-colors"
        >
          Fermer
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted text-center py-2">
          Aucun type configuré.
        </p>
      )}

      <ul className="space-y-1.5">
        {items.map((config, idx) => (
          <li
            key={config.slug}
            className="flex items-center gap-2 rounded-lg bg-background px-3 py-2"
          >
            {editingSlug === config.slug ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:border-accent"
                  autoFocus
                />
                <input
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-14 rounded border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={isPending}
                  className="text-xs text-accent hover:text-accent-hover cursor-pointer"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSlug(null)}
                  className="text-xs text-muted hover:text-foreground cursor-pointer"
                >
                  &times;
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm">{config.label}</span>
                <span className="text-xs text-muted">{config.unit}</span>

                {/* Reorder buttons */}
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0 || isPending}
                  className="text-xs text-muted hover:text-foreground cursor-pointer disabled:opacity-30"
                  title="Monter"
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx >= items.length - 1 || isPending}
                  className="text-xs text-muted hover:text-foreground cursor-pointer disabled:opacity-30"
                  title="Descendre"
                >
                  &darr;
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => startEdit(config)}
                  className="text-xs text-muted hover:text-accent cursor-pointer"
                  title="Modifier"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M7 2l3 3-7 7H0v-3z" />
                  </svg>
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(config.slug)}
                  disabled={isPending}
                  className="text-xs text-muted hover:text-danger cursor-pointer disabled:opacity-50"
                  title="Supprimer"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="1" y1="1" x2="11" y2="11" />
                    <line x1="11" y1="1" x2="1" y2="11" />
                  </svg>
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
