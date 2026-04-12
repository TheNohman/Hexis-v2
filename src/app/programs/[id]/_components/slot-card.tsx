"use client";

import { useState } from "react";
import type { ProgramSlotDetail } from "@/lib/programs/types";
import { dayLabel } from "@/lib/programs/utils";

type Props = {
  slot: ProgramSlotDetail;
  cycleDays: number;
  isCurrent: boolean;
  onClickTemplate: () => void;
  onDelete: () => void;
  onUpdateDay: (day: number) => void;
  onUpdateTime: (startTime: string | null) => void;
  onUpdateLabel: (label: string | null) => void;
  isPending: boolean;
};

export function SlotCard({
  slot,
  cycleDays,
  isCurrent,
  onClickTemplate,
  onDelete,
  onUpdateDay,
  onUpdateTime,
  onUpdateLabel,
  isPending,
}: Props) {
  const [editingLabel, setEditingLabel] = useState(false);

  return (
    <div className={`rounded-xl border bg-surface transition-colors ${
      isCurrent ? "border-accent/50 bg-accent/5" : "border-border hover:bg-surface-hover"
    }`}>
      <div className="flex items-center gap-2.5 p-3">
        {/* Day select */}
        <select
          value={slot.day}
          onChange={(e) => onUpdateDay(parseInt(e.target.value, 10))}
          className={`rounded-lg border px-2 py-1.5 text-xs font-semibold text-center shrink-0 focus:outline-none focus:border-accent transition-colors ${
            isCurrent
              ? "bg-accent text-white border-accent"
              : "bg-surface-hover border-border text-muted"
          }`}
          style={{ width: "72px" }}
        >
          {Array.from({ length: cycleDays }, (_, i) => (
            <option key={i} value={i}>J{i + 1}</option>
          ))}
        </select>

        {/* Time */}
        <input
          type="time"
          value={slot.startTime ?? ""}
          onChange={(e) => onUpdateTime(e.target.value || null)}
          className="w-[72px] rounded-lg border border-border bg-background px-1.5 py-1.5 text-[11px] text-center focus:outline-none focus:border-accent transition-colors tabular-nums shrink-0"
        />

        {/* Template + label */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClickTemplate}>
          {editingLabel ? (
            <input
              type="text"
              defaultValue={slot.label ?? ""}
              autoFocus
              placeholder="Label (Push, Pull...)"
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
                <p
                  className="text-[10px] text-accent font-medium cursor-pointer hover:underline"
                  onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
                >
                  {slot.label}
                </p>
              )}
              {slot.templateName ? (
                <p className="text-sm font-medium truncate">{slot.templateName}</p>
              ) : (
                <p className="text-sm text-subtle italic">Choisir un template</p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!slot.label && !editingLabel && (
            <button type="button" onClick={() => setEditingLabel(true)} className="min-h-[28px] min-w-[28px] flex items-center justify-center text-subtle hover:text-muted cursor-pointer transition-colors" title="Label">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 8.5l5.5-5.5 1.5 1.5-5.5 5.5H2v-1.5z" /></svg>
            </button>
          )}
          <button type="button" onClick={onDelete} disabled={isPending} className="min-h-[28px] min-w-[28px] flex items-center justify-center text-subtle hover:text-danger cursor-pointer transition-colors disabled:opacity-50" title="Supprimer">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
