"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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

export function TemplateEditor({ template, exercises }: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [showNewBlockInput, setShowNewBlockInput] = useState(false);
  const [showHiitDialog, setShowHiitDialog] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  return (
    <main className="flex-1 flex flex-col px-4 py-6">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <header className="flex items-start justify-between gap-3">
          {isEditingName ? (
            <input
              type="text"
              defaultValue={template.name}
              autoFocus
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
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setIsEditingName(false);
              }}
              className="flex-1 text-2xl font-display font-bold bg-transparent outline-none border-b-2 border-accent/50"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="text-2xl font-display font-bold cursor-pointer text-left hover:text-accent transition-colors"
            >
              {template.name}
            </button>
          )}
          <Link
            href="/templates"
            className="text-xs text-subtle hover:text-foreground whitespace-nowrap px-3 py-2 rounded-lg hover:bg-surface transition-colors"
          >
            &larr; Mod&egrave;les
          </Link>
        </header>

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
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted">
                Commence en ajoutant un premier bloc.
              </p>
            </div>
          )}

          {showNewBlockInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder='ex. "Haut du corps"'
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
                className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddBlock}
                disabled={isPending}
                className="rounded-xl bg-accent text-background px-5 text-sm font-bold disabled:opacity-50 cursor-pointer hover:bg-accent-hover transition-colors"
              >
                Ajouter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowNewBlockInput(true)}
                className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-subtle hover:text-accent hover:border-accent/30 cursor-pointer transition-colors"
              >
                + Bloc muscu
              </button>
              <button
                type="button"
                onClick={() => setShowHiitDialog(true)}
                className="rounded-2xl border border-dashed border-accent/30 bg-accent/5 px-4 py-4 text-sm text-accent hover:bg-accent/10 cursor-pointer transition-colors"
              >
                🔥 Bloc HIIT
              </button>
            </div>
          )}
        </div>

        <div className="pt-4 space-y-3">
          <button
            type="button"
            onClick={handleStartSession}
            disabled={isPending || optimisticBlocks.length === 0}
            className="w-full rounded-2xl bg-done text-white py-4 font-bold tracking-wide hover:bg-done/90 transition-colors cursor-pointer disabled:opacity-50 uppercase"
          >
            D&eacute;marrer une s&eacute;ance
          </button>
          <button
            type="button"
            onClick={handleClone}
            disabled={isPending}
            className="w-full rounded-2xl border border-border text-muted py-3 text-sm font-medium hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            Dupliquer ce mod&egrave;le
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={isPending}
            className="w-full rounded-2xl border border-danger/30 text-danger py-3 text-sm font-bold hover:bg-danger-light transition-colors cursor-pointer disabled:opacity-50"
          >
            Supprimer ce mod&egrave;le
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Supprimer ce mod\u00e8le ?"
        message={`\u00ab\u00a0${template.name}\u00a0\u00bb sera d\u00e9finitivement supprim\u00e9. Les s\u00e9ances d\u00e9j\u00e0 lanc\u00e9es depuis ce mod\u00e8le ne seront pas affect\u00e9es.`}
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
