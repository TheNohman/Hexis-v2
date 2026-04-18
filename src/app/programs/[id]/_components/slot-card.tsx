"use client";

import { useState } from "react";
import {
  Pencil,
  X as XIcon,
  Dumbbell,
  HeartPulse,
  Flame,
  Activity,
  Zap,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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

type Category = "strength-upper" | "strength-lower" | "strength" | "cardio" | "hiit" | "mobility" | "endurance" | "default";

function slotCategory(name: string | null | undefined): Category {
  if (!name) return "default";
  const n = name.toLowerCase();
  if (/hiit|wod|crossfit|tabata|emom|amrap/.test(n)) return "hiit";
  if (/run|course|v[ée]lo|bike|cardio|swim|nat/.test(n)) return "cardio";
  if (/endur|long|sortie/.test(n)) return "endurance";
  if (/mobilit|yoga|stretch|souplesse/.test(n)) return "mobility";
  if (/upper|haut|push|pull|pec|\bbras\b|bench/.test(n)) return "strength-upper";
  if (/lower|jambe|bas|leg|squat|quad|fess|deadlift|soulev/.test(n)) return "strength-lower";
  if (/force|muscu/.test(n)) return "strength";
  return "default";
}

/** Category -> chromatic + typographic identity.
 *  Band = the 4px vertical stripe on the left of the card.
 *  Picto = the icon inside the left tile.
 *  TileBg = soft background behind the picto.
 *  TileInk = picto color.
 *  Chip = text color for the uppercase 3-letter label above the title.
 */
const CATEGORY_STYLE: Record<
  Category,
  {
    band: string;
    tileBg: string;
    tileInk: string;
    chip: string;
    label: string;
    Picto: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  }
> = {
  "strength-upper": {
    band: "bg-accent",
    tileBg: "bg-accent-light",
    tileInk: "text-accent-ink",
    chip: "text-accent-ink",
    label: "Upper",
    Picto: ArrowUp,
  },
  "strength-lower": {
    band: "bg-[var(--accent-ink)]",
    tileBg: "bg-accent-light",
    tileInk: "text-accent-ink",
    chip: "text-accent-ink",
    label: "Lower",
    Picto: ArrowDown,
  },
  strength: {
    band: "bg-accent",
    tileBg: "bg-accent-light",
    tileInk: "text-accent-ink",
    chip: "text-accent-ink",
    label: "Force",
    Picto: Dumbbell,
  },
  cardio: {
    band: "bg-[var(--lavender-ink)]",
    tileBg: "bg-lavender-soft",
    tileInk: "text-lavender-ink",
    chip: "text-lavender-ink",
    label: "Cardio",
    Picto: HeartPulse,
  },
  hiit: {
    band: "bg-signal",
    tileBg: "bg-signal-light",
    tileInk: "text-signal-ink",
    chip: "text-signal-ink",
    label: "HIIT",
    Picto: Flame,
  },
  endurance: {
    band: "bg-[var(--butter-ink)]",
    tileBg: "bg-butter-soft",
    tileInk: "text-butter-ink",
    chip: "text-butter-ink",
    label: "Endur.",
    Picto: Activity,
  },
  mobility: {
    band: "bg-[var(--peach-ink)]",
    tileBg: "bg-peach-soft",
    tileInk: "text-peach-ink",
    chip: "text-peach-ink",
    label: "Mobilité",
    Picto: Zap,
  },
  default: {
    band: "bg-border",
    tileBg: "bg-surface-hover",
    tileInk: "text-subtle",
    chip: "text-subtle",
    label: "Séance",
    Picto: Dumbbell,
  },
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
  const [editingTime, setEditingTime] = useState(false);
  const category = slotCategory(slot.label ?? slot.templateName);
  const hasTemplate = Boolean(slot.templateName);
  const style = CATEGORY_STYLE[category];
  const Picto = style.Picto;

  return (
    <div
      className={`group/slot relative overflow-hidden rounded-2xl bg-surface shadow-card hover:shadow-hero hover:-translate-y-0.5 transition-all ${
        isCurrent ? "ring-2 ring-accent" : ""
      }`}
    >
      {/* Category band — vertical 4px stripe left side */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 w-1 ${hasTemplate ? style.band : "bg-border"}`}
      />

      <div className="flex items-center gap-3 pl-4 pr-3 py-3">
        {/* Picto tile */}
        <div
          aria-hidden="true"
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
            hasTemplate
              ? `${style.tileBg} ${style.tileInk}`
              : "bg-surface-hover text-subtle border border-dashed border-border"
          }`}
        >
          <Picto className="w-5 h-5" aria-hidden="true" />
        </div>

        {/* Legacy day select — only in non-date mode */}
        {!scheduledDate && (
          <label className="shrink-0">
            <span className="sr-only">Jour</span>
            <select
              value={slot.day}
              onChange={(e) => onUpdateDay(parseInt(e.target.value, 10))}
              className="w-[58px] rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold text-center focus:outline-none focus:border-accent-ink transition-colors"
            >
              {Array.from({ length: cycleDays }, (_, i) => (
                <option key={i} value={i}>
                  J{i + 1}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Template + label + inline time */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onClickTemplate}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onClickTemplate();
          }}
        >
          {/* Top row: category chip OR custom label */}
          <div className="flex items-center gap-2 flex-wrap">
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] uppercase tracking-widest font-bold bg-transparent border-b border-foreground/40 outline-none w-32 placeholder:text-subtle"
              />
            ) : slot.label ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLabel(true);
                }}
                className={`text-[10px] uppercase tracking-widest font-bold hover:underline ${style.chip}`}
              >
                {slot.label}
              </button>
            ) : hasTemplate ? (
              <span
                className={`text-[10px] uppercase tracking-widest font-bold ${style.chip}`}
              >
                {style.label}
              </span>
            ) : null}
          </div>

          {/* Template name row */}
          {slot.templateName ? (
            <p className="text-[15px] font-semibold text-foreground truncate mt-0.5">
              {slot.templateName}
            </p>
          ) : (
            <p className="text-[15px] font-medium text-subtle italic mt-0.5">
              Choisir un template
            </p>
          )}
        </div>

        {/* Time — inline-editable, hidden by default when empty */}
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {editingTime || slot.startTime ? (
            <input
              type="time"
              value={slot.startTime ?? ""}
              autoFocus={editingTime && !slot.startTime}
              onChange={(e) => onUpdateTime(e.target.value || null)}
              onBlur={() => {
                if (!slot.startTime) setEditingTime(false);
              }}
              aria-label="Heure de début"
              className="w-[72px] rounded-lg border border-transparent bg-surface-hover px-2 py-1 text-[11px] text-center font-semibold text-foreground tabular-nums hover:border-border focus:outline-none focus:border-accent-ink transition-colors"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTime(true)}
              aria-label="Ajouter une heure de début"
              className="p-1.5 rounded-lg text-subtle hover:text-accent-ink hover:bg-surface-hover transition-colors cursor-pointer opacity-0 group-hover/slot:opacity-100 focus:opacity-100"
            >
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center shrink-0">
          {!slot.label && !editingLabel && hasTemplate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingLabel(true);
              }}
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
            className="min-h-[32px] min-w-[32px] flex items-center justify-center text-subtle hover:text-danger cursor-pointer transition-colors disabled:opacity-50 rounded-lg opacity-0 group-hover/slot:opacity-100 focus:opacity-100"
          >
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
