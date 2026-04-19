"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal, Sparkles, Star, X as XIcon, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { ExerciseListItem } from "@/lib/workouts/types";
import type { TemplateDetail } from "@/lib/templates/types";
import {
  addTemplateBlockAction,
  cloneTemplateAction,
  deleteTemplateAction,
  renameTemplateAction,
  reorderTemplateBlocksAction,
  startSessionFromTemplateAction,
  toggleTemplateFavoriteAction,
  updateTemplateObjectiveAction,
  updateTemplateTagsAction,
} from "@/app/templates/actions";
import { TemplateBlockCard } from "./template-block-card";
import dynamic from "next/dynamic";
import { TemplateIntervalBlockCard } from "./template-interval-block-card";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";

// Lazy-load the HIIT dialog so its dnd-kit / interval-specific bundle
// doesn't ship with the first render of a template page that never
// opens it. Loaded on first click of "+ Bloc HIIT".
const IntervalBlockDialog = dynamic(
  () => import("./interval-block-dialog").then((m) => m.IntervalBlockDialog),
  { ssr: false },
);

type Props = {
  template: TemplateDetail;
  exercises: ExerciseListItem[];
};

function sourceBadge(source: TemplateDetail["source"]) {
  if (source === "AI") {
    return {
      label: "IA",
      className: "bg-accent text-accent-foreground",
      withIcon: true,
    };
  }
  if (source === "CLONED") {
    return {
      label: "Cloné",
      className: "bg-surface border border-border text-muted",
      withIcon: false,
    };
  }
  return {
    label: "Manuel",
    className: "bg-surface border border-border text-muted",
    withIcon: false,
  };
}

export function TemplateEditor({ template, exercises }: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [showNewBlockInput, setShowNewBlockInput] = useState(false);
  const [showHiitDialog, setShowHiitDialog] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isPending, startTransition] = useTransition();

  const MAX_TAGS = 10;
  const MAX_TAG_LEN = 32;

  function handleToggleFavorite() {
    startTransition(() => toggleTemplateFavoriteAction(template.id));
  }

  function handleAddTag() {
    const raw = tagDraft.trim().slice(0, MAX_TAG_LEN);
    if (!raw) {
      setIsAddingTag(false);
      setTagDraft("");
      return;
    }
    const existingLower = template.tags.map((t) => t.toLowerCase());
    if (existingLower.includes(raw.toLowerCase())) {
      setTagDraft("");
      setIsAddingTag(false);
      return;
    }
    if (template.tags.length >= MAX_TAGS) {
      setTagDraft("");
      setIsAddingTag(false);
      return;
    }
    const next = [...template.tags, raw];
    setTagDraft("");
    setIsAddingTag(false);
    startTransition(() => updateTemplateTagsAction(template.id, next));
  }

  function handleRemoveTag(tag: string) {
    const next = template.tags.filter((t) => t !== tag);
    startTransition(() => updateTemplateTagsAction(template.id, next));
  }

  const [optimisticBlocks, setOptimisticBlocks] = useState(template.blocks);
  // Sync optimistic state with server-provided `template.blocks` using the
  // React 19 "reset state during render" pattern (avoids setState in effect).
  const [prevBlocks, setPrevBlocks] = useState(template.blocks);
  if (prevBlocks !== template.blocks) {
    setPrevBlocks(template.blocks);
    setOptimisticBlocks(template.blocks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleBlockDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = optimisticBlocks.findIndex((b) => b.id === active.id);
    const newIndex = optimisticBlocks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(optimisticBlocks, oldIndex, newIndex);

    setOptimisticBlocks(reordered);
    startTransition(() =>
      reorderTemplateBlocksAction(
        template.id,
        reordered.map((b) => b.id),
      ),
    );
  }

  function handleAddBlock() {
    const name = newBlockName.trim() || "Nouveau bloc";
    startTransition(async () => {
      await addTemplateBlockAction(template.id, name);
      setNewBlockName("");
      setShowNewBlockInput(false);
    });
  }

  function handleDelete() {
    setConfirmDeleteOpen(false);
    startTransition(() => deleteTemplateAction(template.id));
  }

  function handleClone() {
    startTransition(() => cloneTemplateAction(template.id));
  }

  function handleStartSession() {
    startTransition(() => startSessionFromTemplateAction(template.id));
  }

  function handleObjectiveBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.target.value.trim() || null;
    setIsEditingObjective(false);
    if (val !== (template.objective ?? null)) {
      startTransition(() =>
        updateTemplateObjectiveAction(template.id, val),
      );
    }
  }

  // Total rows (1 row = 1 planned set) vs distinct movements. "6 séries"
  // + "2 exercices" is how the French fitness vocabulary expects counts,
  // and matches the row layout the user sees below.
  const setCount = template.blocks.reduce(
    (acc, b) => acc + b.entries.length,
    0,
  );
  const exerciseCount = new Set(
    template.blocks.flatMap((b) => b.entries.map((e) => e.exercise.id)),
  ).size;
  const blockCount = template.blocks.length;
  const durationMin = Math.max(1, Math.round(template.estimatedDurationSecs / 60));
  const badge = sourceBadge(template.source);

  return (
    <main id="main-content" className="flex-1 flex flex-col px-4 py-6">
      <div className="max-w-2xl w-full mx-auto space-y-8">
        {/* Back link */}
        <Link
          href="/planning?tab=templates"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
        >
          <span aria-hidden="true">←</span> Retour à la planification
        </Link>

        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <header className="relative space-y-4 pt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted">
                Modèle
              </p>

              {isEditingName ? (
                <input
                  type="text"
                  defaultValue={template.name}
                  autoFocus
                  aria-label="Nom du modèle"
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next && next !== template.name) {
                      startTransition(() =>
                        renameTemplateAction(template.id, next),
                      );
                    }
                    setIsEditingName(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  className="mt-1 w-full bg-transparent font-display font-extrabold text-3xl sm:text-4xl tracking-tight outline-none border-b-2 border-foreground focus:border-accent-ink transition-colors"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="mt-1 text-left font-display font-extrabold text-3xl sm:text-4xl tracking-tight leading-tight hover:text-accent-ink transition-colors cursor-text truncate max-w-full"
                >
                  {template.name}
                </button>
              )}

              {/* Objectif — inline editable */}
              <div className="mt-2.5">
                {isEditingObjective ? (
                  <textarea
                    autoFocus
                    defaultValue={template.objective ?? ""}
                    onBlur={handleObjectiveBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setIsEditingObjective(false);
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                        (e.target as HTMLTextAreaElement).blur();
                    }}
                    placeholder="Décris l'objectif de cette séance, quand l'utiliser, les cues de forme…"
                    rows={3}
                    className="w-full bg-surface rounded-xl border border-border px-3 py-2 text-sm text-muted leading-relaxed focus:outline-none focus:border-accent-ink transition-colors resize-none"
                    aria-label="Objectif du modèle"
                  />
                ) : template.objective ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingObjective(true)}
                    className="text-left text-[15px] font-display font-medium text-ink-strong leading-snug hover:text-foreground transition-colors cursor-text block max-w-[60ch]"
                  >
                    {template.objective}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingObjective(true)}
                    className="text-left text-sm text-subtle italic hover:text-accent-ink transition-colors cursor-text"
                  >
                    + Décris l&apos;objectif de cette séance, quand l&apos;utiliser, les cues de forme…
                  </button>
                )}
              </div>
            </div>

            {/* Kebab menu */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Actions du modèle"
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
                        setMenuOpen(false);
                        handleClone();
                      }}
                      disabled={isPending}
                      className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-surface-hover cursor-pointer transition-colors disabled:opacity-50"
                    >
                      Dupliquer ce modèle
                    </button>
                    <div aria-hidden="true" className="h-px bg-border" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmDeleteOpen(true);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-danger-soft cursor-pointer transition-colors"
                    >
                      Supprimer ce modèle
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Meta + badges row */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}
            >
              {badge.withIcon && (
                <Sparkles className="w-3 h-3" aria-hidden="true" />
              )}
              {badge.label}
            </span>

            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={isPending}
              aria-pressed={template.isFavorite}
              aria-label={
                template.isFavorite
                  ? "Retirer des favoris"
                  : "Ajouter aux favoris"
              }
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-foreground hover:border-foreground/40 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  template.isFavorite
                    ? "fill-[var(--butter-ink)] text-[var(--butter-ink)]"
                    : ""
                }`}
                aria-hidden="true"
              />
              {template.isFavorite ? "Favori" : "Favori"}
            </button>

            <p className="text-muted">
              <span className="font-semibold text-foreground">{exerciseCount}</span>
              {" exercice"}{exerciseCount > 1 ? "s" : ""}
              {setCount > 0 && setCount !== exerciseCount && (
                <>
                  {" · "}
                  <span className="font-semibold text-foreground">{setCount}</span>
                  {" série"}{setCount > 1 ? "s" : ""}
                </>
              )}
              {" · "}
              <span className="font-semibold text-foreground">{blockCount}</span>
              {" bloc"}{blockCount > 1 ? "s" : ""}
              {setCount > 0 && (
                <>
                  {" · durée ~"}
                  <span className="font-semibold text-foreground">
                    {durationMin}
                  </span>
                  {" min"}
                </>
              )}
            </p>
          </div>

          {/* Tags — inline editor */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {template.tags.map((tag) => (
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
              template.tags.length < MAX_TAGS && (
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

          {/* Program usage */}
          {template.programUsageCount > 0 && (
            <Link
              href="/planning?tab=programs"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
            >
              Utilisé dans{" "}
              <span className="font-semibold text-foreground">
                {template.programUsageCount}
              </span>{" "}
              programme{template.programUsageCount > 1 ? "s" : ""}
              <span aria-hidden="true"> →</span>
            </Link>
          )}

          {/* Primary CTA — Start session */}
          <button
            type="button"
            onClick={handleStartSession}
            disabled={isPending || optimisticBlocks.length === 0}
            className="w-full rounded-xl bg-foreground text-background py-4 font-semibold tracking-wide hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-card"
          >
            Démarrer une séance
          </button>
        </header>

        {/* ═══════════════════════ BLOCKS ═══════════════════════ */}
        <div className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleBlockDragEnd}
          >
            <SortableContext
              items={optimisticBlocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {optimisticBlocks.map((block) =>
                block.mode === "INTERVAL" ? (
                  <TemplateIntervalBlockCard
                    key={block.id}
                    templateId={template.id}
                    block={block}
                    exercises={exercises}
                  />
                ) : (
                  <TemplateBlockCard
                    key={block.id}
                    templateId={template.id}
                    block={block}
                    exercises={exercises}
                  />
                ),
              )}
            </SortableContext>
          </DndContext>

          {optimisticBlocks.length === 0 && !showNewBlockInput && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Aucun bloc pour l&apos;instant
              </p>
              <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
                Ajoute un bloc muscu (séries/reps) ou un bloc HIIT (intervalles)
                pour commencer à construire ta séance.
              </p>
            </div>
          )}

          {showNewBlockInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder='ex. « Haut du corps »'
                aria-label="Nom du bloc"
                value={newBlockName}
                onChange={(e) => setNewBlockName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddBlock();
                  if (e.key === "Escape") {
                    setShowNewBlockInput(false);
                    setNewBlockName("");
                  }
                }}
                autoFocus
                className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={handleAddBlock}
                disabled={isPending}
                className="rounded-xl bg-foreground text-background px-5 text-sm font-semibold disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity"
              >
                Ajouter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowNewBlockInput(true)}
                className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm font-medium text-muted hover:text-foreground hover:border-foreground/40 cursor-pointer transition-colors"
              >
                + Bloc muscu
              </button>
              <button
                type="button"
                onClick={() => setShowHiitDialog(true)}
                className="rounded-2xl bg-[var(--butter)] text-foreground px-4 py-4 text-sm font-semibold hover:brightness-95 cursor-pointer transition-all shadow-card"
              >
                <span aria-hidden="true">🔥</span> Bloc HIIT
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Supprimer ce modèle ?"
        message={`« ${template.name} » sera définitivement supprimé. Les séances déjà lancées depuis ce modèle ne seront pas affectées.`}
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <IntervalBlockDialog
        open={showHiitDialog}
        onClose={() => setShowHiitDialog(false)}
        templateId={template.id}
        exercises={exercises}
      />
    </main>
  );
}
