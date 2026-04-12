"use client";

import { useState } from "react";
import type { ProgramDetail } from "@/lib/programs/types";

type Slot = ProgramDetail["slots"][number];

type Props = {
  slot: Slot;
  isCurrentSlot: boolean;
  onClick: () => void;
  onDelete: () => void;
  onUpdateLabel: (label: string | null) => void;
  isPending: boolean;
};

export function SlotCard({ slot, isCurrentSlot, onClick, onDelete, onUpdateLabel, isPending }: Props) {
  const [editingLabel, setEditingLabel] = useState(false);

  return (
    <div
      className={`rounded-xl border bg-surface transition-colors ${
        isCurrentSlot ? "border-accent/50 bg-accent/5" : "border-border hover:bg-surface-hover"
      }`}
    >
      <div className="flex items-center gap-3 p-3.5">
        {/* Day indicator */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
          isCurrentSlot ? "bg-accent text-white" : "bg-surface-hover text-muted"
        }`}>
          J{slot.day + 1}
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
              {slot.label && (
                <p
                  className="text-xs text-muted font-medium cursor-pointer hover:text-accent transition-colors"
                  onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
                >
                  {slot.label}
                </p>
              )}
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
          {!slot.label && !editingLabel && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-subtle hover:text-muted cursor-pointer transition-colors"
              title="Ajouter un label"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 8.5l5.5-5.5 1.5 1.5-5.5 5.5H2v-1.5z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={isPending}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-subtle hover:text-danger cursor-pointer transition-colors disabled:opacity-50"
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
