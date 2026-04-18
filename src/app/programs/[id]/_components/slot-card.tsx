"use client";

import { useState } from "react";
import { Pencil, X as XIcon } from "lucide-react";
import type { ProgramSlotDetail } from "@/lib/programs/types";

type Props = {
  slot: ProgramSlotDetail;
  cycleDays: number;
  /** When set, the slot is rendered inside a day-grouped cycle — day selector
   *  is hidden (day is fixed by the group), date is implied by the parent. */
  scheduledDate: Date | null;
  isCurrent: boolean;
  onClickTemplate: () => void;
  onDelete: () => void;
  onUpdateDay: (day: number) => void;
  onUpdateTime: (startTime: string | null) => void;
  onUpdateLabel: (label: string | null) => void;
  isPending: boolean;
};

type Category = "strength" | "cardio" | "hiit" | "mobility" | "default";

function slotCategory(name: string | null | undefined): Category {
  if (!name) return "default";
  const n = name.toLowerCase();
  if (/run|course|v[ée]lo|bike|cardio|swim|nat|endur/.test(n)) return "cardio";
  if (/hiit|wod|crossfit|tabata|emom|amrap/.test(n)) return "hiit";
  if (/mobilit|yoga|stretch|souplesse/.test(n)) return "mobility";
  if (/push|pull|leg|jambe|upper|lower|force|muscu|haut|bas/.test(n)) return "strength";
  return "default";
}

const CATEGORY_FILL: Record<Category, string> = {
  strength: "bg-accent text-accent-foreground",
  cardio: "bg-[var(--lavender)] text-foreground",
  hiit: "bg-[var(--butter)] text-foreground",
  mobility: "bg-[var(--peach)] text-foreground",
  default: "bg-surface text-muted",
};

const CATEGORY_LABEL: Record<Category, string> = {
  strength: "Force",
  cardio: "Endurance",
  hiit: "HIIT",
  mobility: "Mobilité",
  default: "Séance",
};

export function SlotCard({
  slot,
  cycleDays,
  scheduledDate,
  isCurrent,
  onClickTemplate,
  onDelete,
  onUpdateDay,
  onUpdateTime,
  onUpdateLabel,
  isPending,
}: Props) {
  const [editingLabel, setEditingLabel] = useState(false);
  const category = slotCategory(slot.label ?? slot.templateName);
  const hasTemplate = Boolean(slot.templateName);

  return (
    <div
      className={`rounded-2xl bg-surface shadow-card transition-all ${
        isCurrent ? "ring-2 ring-accent" : ""
      }`}
    >
      <div className="flex items-center gap-2.5 p-3">
        {/* Category tile — color + text for RGAA */}
        <div
          aria-hidden="true"
          className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-display font-bold ${
            hasTemplate ? CATEGORY_FILL[category] : "bg-surface-hover text-subtle border border-dashed border-border"
          }`}
        >
          <span className="text-[9px] uppercase tracking-widest leading-none">
            {hasTemplate ? CATEGORY_LABEL[category].slice(0, 3) : "—"}
          </span>
        </div>

        {/* Day select — hidden in date-grouped mode (day implied by group). */}
        {!scheduledDate && (
          <label className="shrink-0">
            <span className="sr-only">Jour</span>
            <select
              value={slot.day}
              onChange={(e) => onUpdateDay(parseInt(e.target.value, 10))}
              className="w-[64px] rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold text-center focus:outline-none focus:border-accent-ink transition-colors"
            >
              {Array.from({ length: cycleDays }, (_, i) => (
                <option key={i} value={i}>J{i + 1}</option>
              ))}
            </select>
          </label>
        )}

        {/* Time */}
        <label className="shrink-0">
          <span className="sr-only">Heure de début</span>
          <input
            type="time"
            value={slot.startTime ?? ""}
            onChange={(e) => onUpdateTime(e.target.value || null)}
            className="w-[76px] rounded-lg border border-border bg-background px-1.5 py-1.5 text-[11px] text-center focus:outline-none focus:border-accent transition-colors tabular-nums"
          />
        </label>

        {/* Template + label */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onClickTemplate}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClickTemplate(); }}
        >
          {editingLabel ? (
            <input
              type="text"
              defaultValue={slot.label ?? ""}
              autoFocus
              placeholder="Label (Push, Pull...)"
              aria-label="Label du créneau"
              onBlur={(e) => {
                onUpdateLabel(e.target.value.trim() || null);
                setEditingLabel(false);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium bg-transparent border-none outline-none w-full placeholder:text-subtle"
            />
          ) : (
            <>
              {slot.label && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
                  className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink hover:underline"
                >
                  {slot.label}
                </button>
              )}
              {slot.templateName ? (
                <p className="text-sm font-semibold truncate">{slot.templateName}</p>
              ) : (
                <p className="text-sm text-subtle italic">Choisir un template</p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!slot.label && !editingLabel && (
            <button
              type="button"
              onClick={() => setEditingLabel(true)}
              aria-label="Ajouter un label"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center text-subtle hover:text-foreground cursor-pointer transition-colors rounded-lg"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            aria-label="Supprimer le créneau"
            className="min-h-[32px] min-w-[32px] flex items-center justify-center text-subtle hover:text-danger cursor-pointer transition-colors disabled:opacity-50 rounded-lg"
          >
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
