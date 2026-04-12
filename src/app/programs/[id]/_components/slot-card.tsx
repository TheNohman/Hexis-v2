"use client";

import { useState } from "react";
import type { ProgramDetail } from "@/lib/programs/types";
import { dayLabel, dayShort } from "@/lib/programs/utils";

type Slot = ProgramDetail["slots"][number];

type Props = {
  slot: Slot;
  isCurrentSlot: boolean;
  onClick: () => void;
  onDelete: () => void;
  onUpdateLabel: (label: string | null) => void;
  onUpdateTime: (startTime: string | null) => void;
  isPending: boolean;
};

export function SlotCard({ slot, isCurrentSlot, onClick, onDelete, onUpdateLabel, onUpdateTime, isPending }: Props) {
  const [editingLabel, setEditingLabel] = useState(false);

  return (
    <div
      className={`rounded-xl border bg-surface transition-colors ${
        isCurrentSlot ? "border-accent/50 bg-accent/5" : "border-border hover:bg-surface-hover"
      }`}
    >
      <div className="flex items-center gap-3 p-3.5">
        {/* Day indicator */}
        <div className={`min-w-[48px] rounded-lg flex flex-col items-center justify-center py-1.5 px-2 text-center shrink-0 ${
          isCurrentSlot ? "bg-accent text-white" : "bg-surface-hover text-muted"
        }`}>
          <span className="text-[10px] font-semibold uppercase">{dayShort(slot.day)}</span>
          {slot.startTime && (
            <span className="text-[10px] opacity-80">{slot.startTime}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          {editingLabel ? (
            <input
              type="text"
              defaultValue={slot.label ?? ""}
              autoFocus
              placeholder="Label (ex: Push, Pull...)"
              onBlur={(e) => {
                const val = e.target.value.trim() || null;
                onUpdateLabel(val);
                setEditingLabel(false);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium bg-transparent border-none outline-none w-full placeholder:text-subtle"
            />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted">{dayLabel(slot.day)}</p>
                {slot.label && (
                  <span
                    className="text-xs text-accent font-medium cursor-pointer hover:underline"
                    onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
                  >
                    {slot.label}
                  </span>
                )}
              </div>
              {slot.templateName ? (
                <p className="text-sm font-medium truncate">{slot.templateName}</p>
              ) : (
                <p className="text-sm text-subtle italic">Tap pour assigner un template</p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Time picker */}
          <input
            type="time"
            value={slot.startTime ?? ""}
            onChange={(e) => {
              const val = e.target.value || null;
              onUpdateTime(val);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-[70px] rounded-lg border border-border bg-background px-1.5 py-1 text-[11px] text-center focus:outline-none focus:border-accent transition-colors tabular-nums"
          />
          {/* Label edit */}
          {!slot.label && !editingLabel && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center text-subtle hover:text-muted cursor-pointer transition-colors"
              title="Ajouter un label"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 8.5l5.5-5.5 1.5 1.5-5.5 5.5H2v-1.5z" />
              </svg>
            </button>
          )}
          {/* Delete */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={isPending}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center text-subtle hover:text-danger cursor-pointer transition-colors disabled:opacity-50"
            title="Supprimer ce jour"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="11" y2="11" />
              <line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
