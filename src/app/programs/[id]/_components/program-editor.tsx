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
  updateStartDateAction,
} from "@/app/programs/actions";
import type { ProgramDetail } from "@/lib/programs/types";
import { Card } from "@/app/_components/card";
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
      <Card rounded="2xl" padding="lg" className="space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
            Nom du programme
          </span>
          <input
            type="text"
            defaultValue={program.name}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-accent transition-colors"
          />
        </label>

        {/* Start date — optional. When set, real calendar dates appear throughout. */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
            Date de début du programme
          </span>
          <input
            type="date"
            defaultValue={
              program.startDate
                ? new Date(program.startDate).toISOString().slice(0, 10)
                : ""
            }
            onChange={(e) =>
              startTransition(() =>
                updateStartDateAction(program.id, e.target.value || null),
              )
            }
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm tabular-nums focus:outline-none focus:border-accent-ink transition-colors"
          />
          <span className="text-[11px] text-subtle">
            {program.startDate
              ? "Les dates réelles s'affichent sur les créneaux et le dashboard."
              : "Optionnel — sans date, le programme reste jour-de-semaine générique."}
          </span>
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
              Cycles
            </span>
            <select
              value={program.cycleCount}
              onChange={(e) => startTransition(() => updateCycleCountAction(program.id, parseInt(e.target.value, 10)))}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
              Jours / cycle
            </span>
            <select
              value={program.cycleDays}
              onChange={(e) => startTransition(() => updateCycleDaysAction(program.id, parseInt(e.target.value, 10)))}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            >
              {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} jour{n > 1 ? "s" : ""}</option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
              Statut
            </span>
            <button
              type="button"
              onClick={() => startTransition(() => toggleProgramActiveAction(program.id))}
              disabled={isPending}
              aria-pressed={program.isActive}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                program.isActive
                  ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                  : "bg-background border border-border text-muted hover:text-foreground"
              }`}
            >
              {program.isActive ? "Actif" : "Activer"}
            </button>
          </div>
        </div>
      </Card>

      {/* Cycles */}
      {cycles.map(({ cycle, slots }) => (
        <CycleSection
          key={cycle}
          cycle={cycle}
          cycleDays={program.cycleDays}
          startDate={program.startDate}
          slots={slots}
          currentSlotId={program.isActive ? program.currentSlotId : null}
          onSlotClickTemplate={(slotId) => setEditingSlotId(slotId)}
          onAddSlot={() => handleAddSlot(cycle)}
          onAddSlotAtDay={(cycle, day) =>
            startTransition(() => addSlotAction(program.id, cycle, { day }))
          }
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
          <Card variant="danger" rounded="2xl" padding="lg" className="space-y-3">
            <p className="text-sm text-danger font-semibold">
              Supprimer ce programme ? Cette action est irréversible.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startTransition(() => deleteProgramAction(program.id))}
                disabled={isPending}
                className="flex-1 rounded-xl bg-danger text-white py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-medium hover:bg-surface-hover transition-colors cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-sm text-danger hover:opacity-80 transition-opacity cursor-pointer py-2 font-medium"
          >
            Supprimer ce programme
          </button>
        )}
      </div>
    </div>
  );
}
