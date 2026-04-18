"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Settings2, ChevronDown, Sparkles } from "lucide-react";
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
  updateProgramDescriptionAction,
  fillProgramCyclesAction,
  cloneCycleAction,
} from "@/app/programs/actions";
import type { ProgramDetail } from "@/lib/programs/types";
import {
  computeSlotDate,
  formatSlotDate,
  cycleLabel,
} from "@/lib/programs/utils";
import { Card } from "@/app/_components/card";
import { useToast } from "@/app/_components/toast";
import { CycleSection } from "./cycle-section";
import { TemplatePickerDialog } from "./template-picker-dialog";

type TemplateOption = { id: string; name: string };
type Props = {
  program: ProgramDetail;
  templates: TemplateOption[];
  mentorEnabled: boolean;
};

export function ProgramEditor({ program, templates, mentorEnabled }: Props) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [filling, setFilling] = useState(false);

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

  function handleDescriptionBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.target.value.trim() || null;
    setEditingDesc(false);
    if (val !== (program.description ?? null)) {
      startTransition(() => updateProgramDescriptionAction(program.id, val));
    }
  }

  async function handleCloneCycle(sourceCycle: number) {
    const result = await cloneCycleAction(program.id, sourceCycle, sourceCycle + 1);
    if (result.error) {
      toast.show(result.error, { kind: "error" });
    } else {
      const n = result.copied ?? 0;
      toast.show(
        n === 0
          ? "Rien à dupliquer."
          : `${n} créneau${n > 1 ? "x" : ""} dupliqué${n > 1 ? "s" : ""} dans le cycle suivant.`,
        { kind: "success" },
      );
    }
  }

  async function handleFillCycles() {
    setFilling(true);
    try {
      const result = await fillProgramCyclesAction(program.id);
      if (result.error) {
        toast.show(result.error, { kind: "error" });
      } else if (result.result) {
        const { created, skipped } = result.result;
        if (created === 0) {
          toast.show("Aucune séance générée. Vérifie ta bibliothèque d'exercices.", {
            kind: "error",
          });
        } else {
          toast.show(
            `${created} séance${created > 1 ? "s" : ""} générée${created > 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} ignorée${skipped > 1 ? "s" : ""}` : ""}.`,
            { kind: "success" },
          );
        }
      }
    } finally {
      setFilling(false);
    }
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
  // All (cycle, day) positions that have NO assigned template — either an
  // empty slot exists there, or no slot exists at all. These are the AI targets.
  const assignedKeySet = new Set(
    program.slots.filter((s) => s.templateId).map((s) => `${s.cycle}:${s.day}`),
  );
  let emptySlotCount = 0;
  for (let c = 0; c < program.cycleCount; c++) {
    for (let d = 0; d < program.cycleDays; d++) {
      if (!assignedKeySet.has(`${c}:${d}`)) emptySlotCount++;
    }
  }
  const canFillWithAI = mentorEnabled && emptySlotCount > 0;
  const fillTooltip = !mentorEnabled
    ? "Active le Mentor IA dans ton profil"
    : emptySlotCount === 0
      ? "Tous les créneaux ont déjà un modèle"
      : !program.description
        ? "Ajoute une description pour guider l'IA"
        : "";

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

            {/* Description — inline editable, feeds the AI */}
            <div className="mt-2.5">
              {editingDesc ? (
                <textarea
                  autoFocus
                  defaultValue={program.description ?? ""}
                  onBlur={handleDescriptionBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingDesc(false);
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                      (e.target as HTMLTextAreaElement).blur();
                  }}
                  placeholder="Décris ton objectif, ton niveau, tes contraintes, ta fréquence… (alimente l'IA)"
                  rows={3}
                  className="w-full bg-surface rounded-xl border border-border px-3 py-2 text-sm text-muted leading-relaxed focus:outline-none focus:border-accent-ink transition-colors resize-none"
                  aria-label="Description du programme"
                />
              ) : program.description ? (
                <button
                  type="button"
                  onClick={() => setEditingDesc(true)}
                  className="text-left text-sm text-muted leading-relaxed hover:text-foreground transition-colors cursor-text"
                >
                  {program.description}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDesc(true)}
                  className="text-left text-sm text-subtle italic hover:text-muted transition-colors cursor-text"
                >
                  + Ajouter une description (objectif, niveau, contraintes…)
                </button>
              )}
            </div>
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
            {emptySlotCount > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-signal-ink">{emptySlotCount}</span>
                {" à remplir"}
              </>
            )}
          </p>
        </div>

        {/* AI Fill CTA — primary action when there are empty slots + description */}
        {mentorEnabled && emptySlotCount > 0 && (
          <button
            type="button"
            onClick={handleFillCycles}
            disabled={filling || isPending || !canFillWithAI || !program.description}
            title={fillTooltip}
            className="inline-flex items-center gap-2 rounded-xl bg-accent text-accent-foreground px-4 py-2.5 text-sm font-bold shadow-card hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {filling
              ? "Génération…"
              : `Remplir ${emptySlotCount} créneau${emptySlotCount > 1 ? "x" : ""} avec l'IA`}
          </button>
        )}

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
            cycleCount={program.cycleCount}
            cycleDays={program.cycleDays}
            startDate={program.startDate}
            slots={slots}
            currentSlotId={program.isActive ? program.currentSlotId : null}
            expandedSlotId={expandedSlotId}
            onSlotClickTemplate={(slotId) => {
              const slot = program.slots.find((s) => s.id === slotId);
              // No template yet → straight to picker. Otherwise toggle the
              // inline detail panel below the slot card.
              if (!slot?.templateId) {
                setEditingSlotId(slotId);
              } else {
                setExpandedSlotId((cur) => (cur === slotId ? null : slotId));
              }
            }}
            onChangeTemplate={(slotId) => setEditingSlotId(slotId)}
            onAddSlot={() => handleAddSlot(cycle)}
            onAddSlotAtDay={(cycle, day) =>
              startTransition(() => addSlotAction(program.id, cycle, { day }))
            }
            onDeleteSlot={handleDeleteSlot}
            onUpdateSlot={handleUpdateSlot}
            onCloneCycle={handleCloneCycle}
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
