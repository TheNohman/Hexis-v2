"use client";

import { useState } from "react";
import { EQUIPMENT_SUGGESTIONS } from "@/lib/exercises/equipment";

/**
 * Multi-select chip picker for Exercise.equipment.
 *
 * Shows the curated suggestion list as toggle chips + a free-text input so
 * users can add bespoke tags (e.g. "Sangles TRX", "Kettlebell 16kg"). The
 * current selection is mirrored to a hidden input named `equipment` so the
 * enclosing form posts a JSON-stringified array.
 *
 * Used by:
 * - `/exercises` create form
 * - exercise detail edit (future)
 */
type Props = {
  /** Name of the hidden input so the form captures the selection. */
  name?: string;
  /** Initial tags (edit mode). */
  defaultValue?: string[];
  /** Controlled mode — when provided, pairs with `onChange`. */
  value?: string[];
  onChange?: (next: string[]) => void;
  /** Optional label above the picker. Defaults to "Matériel nécessaire". */
  label?: string;
  /** Describe the optional nature so users don't feel forced. */
  helperText?: string;
};

export function EquipmentChipPicker({
  name = "equipment",
  defaultValue,
  value,
  onChange,
  label = "Matériel nécessaire",
  helperText = "Optionnel — aide l'IA à filtrer les exercices selon ce que tu as à dispo.",
}: Props) {
  const [internal, setInternal] = useState<string[]>(defaultValue ?? []);
  const [customDraft, setCustomDraft] = useState("");
  const selected = value ?? internal;

  function commit(next: string[]) {
    // Dedupe case-insensitively but keep the user's preferred casing for
    // the first occurrence of each tag.
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const tag of next) {
      const key = tag.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(tag.trim());
    }
    if (onChange) onChange(deduped);
    else setInternal(deduped);
  }

  function toggle(tag: string) {
    const key = tag.toLowerCase();
    const already = selected.some((t) => t.toLowerCase() === key);
    commit(
      already
        ? selected.filter((t) => t.toLowerCase() !== key)
        : [...selected, tag],
    );
  }

  function addCustom() {
    const tag = customDraft.trim();
    if (!tag) return;
    commit([...selected, tag]);
    setCustomDraft("");
  }

  // Suggestions already selected appear in the selected row AND stay visible
  // in the chip list (marked active) — cleaner than removing them.
  const suggestionKeys = new Set(EQUIPMENT_SUGGESTIONS.map((s) => s.toLowerCase()));
  const customSelected = selected.filter(
    (t) => !suggestionKeys.has(t.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink">
          {label}
        </label>
        {selected.length > 0 && (
          <span className="text-[10px] text-subtle tabular-nums">
            {selected.length} sélectionné{selected.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted">{helperText}</p>

      <div className="flex flex-wrap gap-1.5">
        {EQUIPMENT_SUGGESTIONS.map((tag) => {
          const active = selected.some((t) => t.toLowerCase() === tag.toLowerCase());
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={active}
              className={`text-[11px] font-medium rounded-full px-2.5 py-1 transition-all cursor-pointer ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface border border-border text-foreground hover:border-border-hover"
              }`}
            >
              {tag}
            </button>
          );
        })}
        {customSelected.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            aria-pressed={true}
            className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-accent text-accent-foreground cursor-pointer inline-flex items-center gap-1"
          >
            {tag}
            <span aria-hidden="true" className="opacity-70">
              ×
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="+ Autre matériel"
          maxLength={40}
          className="flex-1 text-[11px] rounded-full border border-border bg-surface px-3 py-1.5 focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customDraft.trim()}
          className="text-[11px] font-semibold rounded-full px-3 py-1.5 bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-90 transition-opacity"
        >
          Ajouter
        </button>
      </div>

      {/* Mirror selection into a hidden input for form POST. */}
      <input type="hidden" name={name} value={JSON.stringify(selected)} />
    </div>
  );
}
