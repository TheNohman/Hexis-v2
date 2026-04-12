"use client";

import { useState, useTransition } from "react";
import {
  renameProgramAction,
  updateWeekCountAction,
  toggleProgramActiveAction,
  deleteProgramAction,
  upsertSlotAction,
  deleteSlotAction,
} from "@/app/programs/actions";
import type { ProgramDetail } from "@/lib/programs/types";
import { WeekSection } from "./week-section";
import { TemplatePickerDialog } from "./template-picker-dialog";

type TemplateOption = { id: string; name: string };

type Props = {
  program: ProgramDetail;
  templates: TemplateOption[];
};

export function ProgramEditor({ program, templates }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editingSlot, setEditingSlot] = useState<{ week: number; day: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleRename(e: React.FocusEvent<HTMLInputElement>) {
    const name = e.target.value.trim();
    if (name && name !== program.name) {
      startTransition(() => renameProgramAction(program.id, name));
    }
  }

  function handleWeekCountChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const weekCount = parseInt(e.target.value, 10);
    startTransition(() => updateWeekCountAction(program.id, weekCount));
  }

  function handleToggleActive() {
    startTransition(() => toggleProgramActiveAction(program.id));
  }

  function handleDelete() {
    startTransition(() => deleteProgramAction(program.id));
  }

  function handleAssignTemplate(templateId: string | null) {
    if (!editingSlot) return;
    startTransition(() => {
      upsertSlotAction(program.id, editingSlot.week, editingSlot.day, { templateId });
      setEditingSlot(null);
    });
  }

  function handleAddDay(week: number, day: number) {
    startTransition(() => upsertSlotAction(program.id, week, day, {}));
  }

  function handleDeleteDay(week: number, day: number) {
    startTransition(() => deleteSlotAction(program.id, week, day));
  }

  function handleUpdateLabel(week: number, day: number, label: string | null) {
    startTransition(() => upsertSlotAction(program.id, week, day, { label }));
  }

  function handleUpdateTime(week: number, day: number, startTime: string | null) {
    startTransition(() => upsertSlotAction(program.id, week, day, { startTime }));
  }

  // Build weeks structure
  const weeks: { week: number; slots: ProgramDetail["slots"] }[] = [];
  for (let w = 0; w < program.weekCount; w++) {
    weeks.push({
      week: w,
      slots: program.slots.filter((s) => s.week === w).sort((a, b) => a.day - b.day),
    });
  }

  return (
    <div className="space-y-6">
      {/* Name + settings */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Nom du programme</span>
            <input
              type="text"
              defaultValue={program.name}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-accent transition-colors"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Nombre de semaines</span>
              <select
                value={program.weekCount}
                onChange={handleWeekCountChange}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} semaine{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Statut</span>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={isPending}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  program.isActive
                    ? "bg-done-light text-done border border-done/30"
                    : "bg-background border border-border text-muted hover:text-foreground"
                }`}
              >
                {program.isActive ? "Actif" : "Inactif — Activer"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Weeks */}
      {weeks.map(({ week, slots }) => (
        <WeekSection
          key={week}
          week={week}
          slots={slots}
          isCurrent={program.isActive && week === program.currentWeek}
          currentDay={program.currentDay}
          onSlotClick={(day) => setEditingSlot({ week, day })}
          onAddDay={(day) => handleAddDay(week, day)}
          onDeleteDay={(day) => handleDeleteDay(week, day)}
          onUpdateLabel={(day, label) => handleUpdateLabel(week, day, label)}
          onUpdateTime={(day, time) => handleUpdateTime(week, day, time)}
          isPending={isPending}
        />
      ))}

      {/* Template picker dialog */}
      {editingSlot && (
        <TemplatePickerDialog
          templates={templates}
          currentTemplateId={
            program.slots.find(
              (s) => s.week === editingSlot.week && s.day === editingSlot.day,
            )?.templateId ?? null
          }
          onSelect={handleAssignTemplate}
          onClose={() => setEditingSlot(null)}
        />
      )}

      {/* Delete program */}
      <div className="pt-4 border-t border-border">
        {showDeleteConfirm ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 space-y-3">
            <p className="text-sm text-danger font-medium">
              Supprimer ce programme ? Cette action est irr&eacute;versible.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 rounded-lg bg-danger text-white py-2.5 text-sm font-semibold hover:bg-danger/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                Confirmer la suppression
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-surface-hover transition-colors cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-sm text-danger hover:text-danger/80 transition-colors cursor-pointer py-2"
          >
            Supprimer ce programme
          </button>
        )}
      </div>
    </div>
  );
}
