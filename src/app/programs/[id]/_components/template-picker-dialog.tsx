"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X as XIcon, Search } from "lucide-react";

type TemplateOption = { id: string; name: string };

type Props = {
  templates: TemplateOption[];
  currentTemplateId: string | null;
  onSelect: (templateId: string | null) => void;
  onClose: () => void;
};

/** Normalize for search: lowercased + diacritics stripped. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function TemplatePickerDialog({
  templates,
  currentTemplateId,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [cursorRaw, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filtered results (memoized, diacritic-insensitive).
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return templates;
    return templates.filter((t) => norm(t.name).includes(q));
  }, [templates, query]);

  // Clamp cursor to the current list length during render — avoids the
  // "setState-in-effect" anti-pattern.
  const cursor = filtered.length === 0 ? 0 : Math.min(cursorRaw, filtered.length - 1);

  // Autofocus input on open.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape closes the dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Scroll active item into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${cursor}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[cursor];
      if (pick) onSelect(pick.id);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-picker-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-0 sm:mx-4 mb-0 sm:mb-0 rounded-t-3xl sm:rounded-3xl bg-surface shadow-hero overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3
            id="template-picker-title"
            className="font-display font-bold text-base tracking-tight"
          >
            Choisir un template
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-subtle hover:text-foreground hover:bg-surface-hover cursor-pointer transition-colors"
          >
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={handleInputKey}
              placeholder="Rechercher un template…"
              aria-label="Rechercher un template"
              aria-controls="template-picker-list"
              aria-autocomplete="list"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-accent-ink transition-colors"
            />
          </div>
          {templates.length > 0 && (
            <p className="text-[11px] text-subtle mt-1.5 px-1 tabular-nums">
              {filtered.length} / {templates.length} templates
              {filtered.length > 0 && (
                <span className="ml-2 text-subtle/80">
                  ↑↓ naviguer · ↵ sélectionner
                </span>
              )}
            </p>
          )}
        </div>

        <div
          ref={listRef}
          id="template-picker-list"
          role="listbox"
          aria-label="Résultats"
          className="flex-1 overflow-y-auto p-2"
        >
          {/* Remove template — always available when a template is set, not filtered. */}
          {currentTemplateId && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="w-full text-left rounded-xl px-3 py-3 text-sm font-medium text-danger hover:bg-danger-soft transition-colors cursor-pointer"
            >
              Retirer le template
            </button>
          )}

          {templates.length === 0 ? (
            <p className="text-sm text-subtle text-center py-6">
              Aucun template disponible. Crée-en un d&rsquo;abord.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-subtle text-center py-6">
              Aucun résultat pour «&nbsp;{query}&nbsp;».
            </p>
          ) : (
            filtered.map((t, i) => {
              const isActive = t.id === currentTemplateId;
              const isCursor = i === cursor;
              return (
                <button
                  key={t.id}
                  type="button"
                  data-index={i}
                  role="option"
                  aria-selected={isCursor}
                  onClick={() => onSelect(t.id)}
                  onMouseEnter={() => setCursor(i)}
                  className={`w-full text-left rounded-xl px-3 py-3 text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : isCursor
                        ? "bg-surface-hover"
                        : "hover:bg-surface-hover"
                  }`}
                >
                  <HighlightMatch text={t.name} query={query} />
                  {isActive && (
                    <span className="ml-2 text-[10px] uppercase tracking-widest font-bold">
                      Actuel
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Render `text` with the parts matching `query` (diacritic-insensitive)
 * wrapped in <mark>. Visual cue for what was matched.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const nText = norm(text);
  const nQuery = norm(q);
  const idx = nText.indexOf(nQuery);
  if (idx < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent-light text-foreground rounded px-0.5 not-italic">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
