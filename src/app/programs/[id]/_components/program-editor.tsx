"use client";

import { useState, useTransition } from "react";
import {
  MoreHorizontal,
  Settings2,
  ChevronDown,
  Sparkles,
  Plus,
  X as XIcon,
} from "lucide-react";
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
  updateProgramObjectiveAction,
  updateProgramTagsAction,
  fillProgramCyclesAction,
  cloneCycleAction,
} from "@/app/programs/actions";
import type { ProgramDetail } from "@/lib/programs/types";
// formatSlotDate / computeSlotDate / cycleLabel not used here after the
// "Prochaine séance" hero card was removed; cycle utilities live in CycleSection.
import { Card } from "@/app/_components/card";
import { useToast } from "@/app/_components/toast";
import { CycleSection } from "./cycle-section";
import { TemplatePickerDialog } from "./template-picker-dialog";

type TemplateOption = { id: string; name: string };
type Props = {
  program: ProgramDetail;
  templates: TemplateOption[];
  mentorEnabled: boolean;
  completionBySlot: Record<string, number>;
};

export function ProgramEditor({
  program,
  templates,
  mentorEnabled,
  completionBySlot,
}: Props) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingObjective, setEditingObjective] = useState(false);
  const [filling, setFilling] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  const MAX_TAGS = 10;
  const MAX_TAG_LEN = 32;

  function handleAddTag() {
    const raw = tagDraft.trim().slice(0, MAX_TAG_LEN);
    if (!raw) {
      setIsAddingTag(false);
      setTagDraft("");
      return;
    }
    const existingLower = program.tags.map((t) => t.toLowerCase());
    if (existingLower.includes(raw.toLowerCase())) {
      setTagDraft("");
      setIsAddingTag(false);
      return;
    }
    if (program.tags.length >= MAX_TAGS) {
      setTagDraft("");
      setIsAddingTag(false);
      return;
    }
    const next = [...program.tags, raw];
    setTagDraft("");
    setIsAddingTag(false);
    startTransition(() => updateProgramTagsAction(program.id, next));
  }

  function handleRemoveTag(tag: string) {
    const next = program.tags.filter((t) => t !== tag);
    startTransition(() => updateProgramTagsAction(program.id, next));
  }

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

  function handleObjectiveBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.target.value.trim() || null;
    setEditingObjective(false);
    if (val !== (program.objective ?? null)) {
      startTransition(() => updateProgramObjectiveAction(program.id, val));
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
  // Completed slots: slots where the user has at least one finished workout.
  const completedSlotCount = program.slots.filter(
    (s) => s.templateId && (completionBySlot[s.id] ?? 0) > 0,
  ).length;
  const progressPct =
    slotCount > 0 ? Math.round((completedSlotCount / slotCount) * 100) : 0;
  // Which cycle is "current" — defaults to cycle of currentSlotId, else 0.
  const currentSlot = program.slots.find((s) => s.id === program.currentSlotId);
  const currentCycleIdx = currentSlot?.cycle ?? 0;
  const canFillWithAI = mentorEnabled && emptySlotCount > 0;
  const fillTooltip = !mentorEnabled
    ? "Active le Mentor IA dans ton profil"
    : emptySlotCount === 0
      ? "Tous les créneaux ont déjà un modèle"
      : !program.objective
        ? "Définis l'objectif du programme pour guider l'IA"
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

            {/* Objectif — inline editable, feeds the AI */}
            <div className="mt-2.5">
              {editingObjective ? (
                <textarea
                  autoFocus
                  defaultValue={program.objective ?? ""}
                  onBlur={handleObjectiveBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingObjective(false);
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                      (e.target as HTMLTextAreaElement).blur();
                  }}
                  placeholder="Décris ton objectif et tes contraintes (niveau, fréquence, équipement, durée cible)…"
                  rows={3}
                  className="w-full bg-surface rounded-xl border border-border px-3 py-2 text-sm text-muted leading-relaxed focus:outline-none focus:border-accent-ink transition-colors resize-none"
                  aria-label="Objectif du programme"
                />
              ) : program.objective ? (
                <button
                  type="button"
                  onClick={() => setEditingObjective(true)}
                  className="text-left text-[15px] font-display font-medium text-ink-strong leading-snug hover:text-foreground transition-colors cursor-text block max-w-[60ch]"
                >
                  {program.objective}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingObjective(true)}
                  className="text-left text-sm text-subtle italic hover:text-accent-ink transition-colors cursor-text"
                >
                  + Définir l&apos;objectif du programme
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

        {/* Meta row — status dot + summary line + source badge */}
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

          {program.source === "AI" && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground px-2.5 py-1 text-[11px] font-bold"
              aria-label="Programme généré par l'IA"
            >
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              IA
            </span>
          )}

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

        {/* Tags — inline editor (parity with template-editor) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {program.tags.map((tag) => (
            <span
              key={tag}
              className="group/tag inline-flex items-center gap-1 rounded-full bg-surface border border-border pl-2 pr-1 py-0.5 text-[11px] font-medium text-muted"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                disabled={isPending}
                aria-label={`Retirer le tag ${tag}`}
                className="flex items-center justify-center w-4 h-4 rounded-full text-subtle hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer disabled:opacity-60"
              >
                <XIcon className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          {isAddingTag ? (
            <input
              type="text"
              value={tagDraft}
              autoFocus
              maxLength={MAX_TAG_LEN}
              placeholder="nouveau tag"
              aria-label="Nouveau tag"
              onChange={(e) => setTagDraft(e.target.value)}
              onBlur={handleAddTag}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
                if (e.key === "Escape") {
                  setIsAddingTag(false);
                  setTagDraft("");
                }
              }}
              className="rounded-full bg-surface border border-accent-ink px-2 py-0.5 text-[11px] font-medium outline-none w-32"
            />
          ) : (
            program.tags.length < MAX_TAGS && (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                aria-label="Ajouter un tag"
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] font-medium text-subtle hover:text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                Ajouter un tag
              </button>
            )
          )}
        </div>

        {/* AI Fill CTA — primary action when there are empty slots + description */}
        {mentorEnabled && emptySlotCount > 0 && (
          <button
            type="button"
            onClick={handleFillCycles}
            disabled={filling || isPending || !canFillWithAI || !program.objective}
            title={fillTooltip}
            className="inline-flex items-center gap-2 rounded-xl bg-accent text-accent-foreground px-4 py-2.5 text-sm font-bold shadow-card hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {filling
              ? "Génération…"
              : `Remplir ${emptySlotCount} créneau${emptySlotCount > 1 ? "x" : ""} avec l'IA`}
          </button>
        )}

        {/* Progress strip — shows trajectory when there's at least 1 planned slot */}
        {slotCount > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted">
                Progression
              </p>
              <p className="text-xs tabular-nums">
                <span className="font-display font-black text-foreground text-base">
                  {completedSlotCount}
                </span>
                <span className="text-muted"> / {slotCount} </span>
                <span className="text-subtle">
                  · {progressPct}%
                </span>
              </p>
            </div>
            <div
              className="relative h-1.5 rounded-full bg-border/60 overflow-hidden"
              role="progressbar"
              aria-valuenow={completedSlotCount}
              aria-valuemin={0}
              aria-valuemax={slotCount}
              aria-label="Progression du programme"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-accent rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
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

      {/* Onboarding nudge — brand-new program with no slots and no objective */}
      {program.slots.length === 0 && !program.objective && (
        <Card rounded="2xl" padding="lg" className="bg-accent-light/40 border-accent/30 space-y-2 animate-fade-in-up">
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-ink">
            Pour commencer
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Définis l&apos;objectif ci-dessus (ex. « prise de masse 3×/sem, 1h max, pas de barre »), puis laisse l&apos;IA générer {emptySlotCount} séance{emptySlotCount > 1 ? "s" : ""} — ou ajoute-les manuellement dans le cycle ci-dessous.
          </p>
        </Card>
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
            completionBySlot={completionBySlot}
            isFocusCycle={cycle === currentCycleIdx}
            nextCycleSlotCount={
              cycles.find((c) => c.cycle === cycle + 1)?.slots.length ?? 0
            }
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
