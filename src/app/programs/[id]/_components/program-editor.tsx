"use client";

import { useState, useTransition } from "react";
import {
  renameProgramAction,
  updateCycleCountAction,
  updateCycleDaysAction,
  toggleProgramActiveAction,
  deleteProgramAction,
  addSlotAction,
  updateSlotAction,
  deleteSlotAction,
} from "@/app/programs/actions";
import type { ProgramDetail } from "@/lib/programs/types";
import { CycleSection } from "./cycle-section";
import { TemplatePickerDialog } from "./template-picker-dialog";

type TemplateOption = { id: string; name: string };
type Props = { program: ProgramDetail; templates: TemplateOption[] };

export function ProgramEditor({ program, templates }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleRename(e: React.FocusEvent<HTMLInputElement>) {
    const name = e.target.value.trim();
    if (name && name !== program.name) {
      startTransition(() => renameProgramAction(program.id, name));
    }
  }

  function handleAssignTemplate(templateId: string | null) {
    if (!editingSlotId) return;
    startTransition(() => {
      updateSlotAction(editingSlotId, { templateId });
      setEditingSlotId(null);
    });
  }

  function handleAddSlot(cycle: number) {
    startTransition(() => addSlotAction(program.id, cycle, {}));
  }

  function handleDeleteSlot(slotId: string) {
    startTransition(() => deleteSlotAction(slotId));
  }

  function handleUpdateSlot(slotId: string, data: { day?: number; startTime?: string | null; label?: string | null }) {
    startTransition(() => updateSlotAction(slotId, data));
  }

  // Build cycles
  const cycles: { cycle: number; slots: ProgramDetail["slots"] }[] = [];
  for (let c = 0; c < program.cycleCount; c++) {
    cycles.push({
      cycle: c,
      slots: program.slots.filter((s) => s.cycle === c),
    });
  }

  return (
    <div className="space-y-6">
      {/* Config */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
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

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Cycles</span>
            <select
              value={program.cycleCount}
              onChange={(e) => startTransition(() => updateCycleCountAction(program.id, parseInt(e.target.value, 10)))}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Jours / cycle</span>
            <select
              value={program.cycleDays}
              onChange={(e) => startTransition(() => updateCycleDaysAction(program.id, parseInt(e.target.value, 10)))}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            >
              {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} jour{n > 1 ? "s" : ""}</option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Statut</span>
            <button
              type="button"
              onClick={() => startTransition(() => toggleProgramActiveAction(program.id))}
              disabled={isPending}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                program.isActive
                  ? "bg-done-light text-done border border-done/30"
                  : "bg-background border border-border text-muted hover:text-foreground"
              }`}
            >
              {program.isActive ? "Actif" : "Activer"}
            </button>
          </div>
        </div>
      </div>

      {/* Cycles */}
      {cycles.map(({ cycle, slots }) => (
        <CycleSection
          key={cycle}
          cycle={cycle}
          cycleDays={program.cycleDays}
          slots={slots}
          currentSlotId={program.isActive ? program.currentSlotId : null}
          onSlotClickTemplate={(slotId) => setEditingSlotId(slotId)}
          onAddSlot={() => handleAddSlot(cycle)}
          onDeleteSlot={handleDeleteSlot}
          onUpdateSlot={handleUpdateSlot}
          isPending={isPending}
        />
      ))}

      {/* Template picker */}
      {editingSlotId && (
        <TemplatePickerDialog
          templates={templates}
          currentTemplateId={
            program.slots.find((s) => s.id === editingSlotId)?.templateId ?? null
          }
          onSelect={handleAssignTemplate}
          onClose={() => setEditingSlotId(null)}
        />
      )}

      {/* Delete */}
      <div className="pt-4 border-t border-border">
        {showDeleteConfirm ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 space-y-3">
            <p className="text-sm text-danger font-medium">
              Supprimer ce programme ? Cette action est irr&eacute;versible.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => startTransition(() => deleteProgramAction(program.id))} disabled={isPending} className="flex-1 rounded-lg bg-danger text-white py-2.5 text-sm font-semibold hover:bg-danger/90 transition-colors cursor-pointer disabled:opacity-50">
                Confirmer
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-surface-hover transition-colors cursor-pointer">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full text-sm text-danger hover:text-danger/80 transition-colors cursor-pointer py-2">
            Supprimer ce programme
          </button>
        )}
      </div>
    </div>
  );
}
