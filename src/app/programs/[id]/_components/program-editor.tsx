"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Settings2, ChevronDown } from "lucide-react";
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
import {
  computeSlotDate,
  formatSlotDate,
  cycleLabel,
} from "@/lib/programs/utils";
import { Card } from "@/app/_components/card";
import { CycleSection } from "./cycle-section";
import { TemplatePickerDialog } from "./template-picker-dialog";

type TemplateOption = { id: string; name: string };
type Props = { program: ProgramDetail; templates: TemplateOption[] };

export function ProgramEditor({ program, templates }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);

  function handleRename(e: React.FocusEvent<HTMLInputElement>) {
    const name = e.target.value.trim();
    setEditingName(false);
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

  function handleUpdateSlot(
    slotId: string,
    data: { day?: number; startTime?: string | null; label?: string | null },
  ) {
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

  // Derive "next session" info for the hero meta line.
  const currentSlot = program.slots.find((s) => s.id === program.currentSlotId);
  const nextDate =
    currentSlot && program.startDate
      ? computeSlotDate(program.startDate, program.cycleDays, currentSlot.cycle, currentSlot.day)
      : null;
  const slotCount = program.slots.filter((s) => s.templateId).length;

  return (
    <div className="space-y-8">
      {/* ══════════════════════════════════════════════════════════════
          HERO — editorial, large type, quiet controls
         ══════════════════════════════════════════════════════════════ */}
      <header className="relative space-y-4 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted">
              Programme
            </p>
            {editingName ? (
              <input
                autoFocus
                defaultValue={program.name}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className="mt-1 w-full bg-transparent font-display font-extrabold text-3xl sm:text-4xl tracking-tight outline-none border-b-2 border-foreground focus:border-accent-ink transition-colors"
                aria-label="Nom du programme"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="mt-1 text-left font-display font-extrabold text-3xl sm:text-4xl tracking-tight leading-tight hover:text-accent-ink transition-colors cursor-text truncate max-w-full"
              >
                {program.name}
              </button>
            )}
          </div>

          {/* Kebab menu for destructive + misc actions */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Actions du programme"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 z-20 w-56 rounded-2xl bg-surface shadow-hero border border-border overflow-hidden"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSettingsOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <Settings2 className="w-4 h-4" aria-hidden="true" />
                    Réglages avancés
                  </button>
                  <div aria-hidden="true" className="h-px bg-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-danger-soft cursor-pointer transition-colors"
                  >
                    Supprimer ce programme
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Meta row — status dot + summary line */}
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <button
            type="button"
            onClick={() => startTransition(() => toggleProgramActiveAction(program.id))}
            disabled={isPending}
            aria-pressed={program.isActive}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold text-xs transition-all cursor-pointer disabled:opacity-50 ${
              program.isActive
                ? "bg-accent text-accent-foreground shadow-sm"
                : "bg-surface border border-border text-muted hover:text-foreground hover:border-foreground/40"
            }`}
          >
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full ${
                program.isActive ? "bg-accent-foreground animate-pulse" : "bg-subtle"
              }`}
            />
            {program.isActive ? "Actif" : "Inactif"}
          </button>

          <p className="text-xs text-muted">
            <span className="font-semibold text-foreground">{program.cycleCount}</span>
            {" cycle"}{program.cycleCount > 1 ? "s" : ""}
            {" · "}
            <span className="font-semibold text-foreground">{program.cycleDays}</span>
            {" jours/cycle"}
            {slotCount > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-foreground">{slotCount}</span>
                {" séance"}{slotCount > 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>

        {/* Next session callout — hero black card, right-arrow affordance */}
        {nextDate && currentSlot && (
          <div className="inline-flex w-full sm:w-auto items-center gap-4 rounded-2xl bg-foreground text-background px-5 py-3.5 shadow-hero">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <span aria-hidden="true" className="text-foreground text-lg">→</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent">
                Prochaine séance
              </p>
              <p className="font-display font-bold text-base leading-tight mt-0.5">
                {currentSlot.templateName ?? "Séance sans modèle"}
              </p>
              <p className="text-[11px] text-background/70 mt-0.5">
                {formatSlotDate(nextDate)}
                {currentSlot.startTime && ` · ${currentSlot.startTime}`}
                {program.cycleCount > 1 && ` · ${cycleLabel(currentSlot.cycle)}`}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════════════════════
          COLLAPSIBLE SETTINGS — only when user asks for them
         ══════════════════════════════════════════════════════════════ */}
      {settingsOpen && (
        <Card rounded="2xl" padding="lg" className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base">Réglages</h3>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="text-xs text-muted hover:text-foreground cursor-pointer"
            >
              Fermer
            </button>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
                Cycles
              </span>
              <select
                value={program.cycleCount}
                onChange={(e) =>
                  startTransition(() =>
                    updateCycleCountAction(program.id, parseInt(e.target.value, 10)),
                  )
                }
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent-ink transition-colors"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
                Jours par cycle
              </span>
              <select
                value={program.cycleDays}
                onChange={(e) =>
                  startTransition(() =>
                    updateCycleDaysAction(program.id, parseInt(e.target.value, 10)),
                  )
                }
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent-ink transition-colors"
              >
                {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} jour{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </label>
          </div>
        </Card>
      )}

      {/* Inline hint when settings closed */}
      {!settingsOpen && (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
          Modifier les réglages
          <ChevronDown className="w-3 h-3" aria-hidden="true" />
        </button>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CYCLES — chapter-style sections
         ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-10">
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
      </div>

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

      {/* Delete confirm dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-hero border border-border p-5 space-y-4 animate-fade-in-up">
            <h3 id="delete-confirm-title" className="font-display font-bold text-lg">
              Supprimer ce programme ?
            </h3>
            <p className="text-sm text-muted">
              Les créneaux disparaîtront. Les séances déjà enregistrées restent dans ton historique.
              Cette action est irréversible.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold hover:bg-surface-hover transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => startTransition(() => deleteProgramAction(program.id))}
                disabled={isPending}
                className="flex-1 rounded-xl bg-danger text-white py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
