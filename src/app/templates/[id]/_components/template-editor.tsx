"use client";

import { useEffect, useState, useTransition } from "react";
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
  deleteTemplateAction,
  renameTemplateAction,
  reorderTemplateBlocksAction,
  startSessionFromTemplateAction,
} from "@/app/templates/actions";
import { TemplateBlockCard } from "./template-block-card";

type Props = {
  template: TemplateDetail;
  exercises: ExerciseListItem[];
};

export function TemplateEditor({ template, exercises }: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [showNewBlockInput, setShowNewBlockInput] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [optimisticBlocks, setOptimisticBlocks] = useState(template.blocks);
  useEffect(() => {
    setOptimisticBlocks(template.blocks);
  }, [template.blocks]);

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
    if (!confirm(`Supprimer le template "${template.name}" ?`)) return;
    startTransition(() => deleteTemplateAction(template.id));
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
            className="text-xs text-subtle hover:text-foreground whitespace-nowrap px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            &larr; Templates
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
              {optimisticBlocks.map((block) => (
                <TemplateBlockCard
                  key={block.id}
                  templateId={template.id}
                  block={block}
                  exercises={exercises}
                />
              ))}
            </SortableContext>
          </DndContext>

          {optimisticBlocks.length === 0 && !showNewBlockInput && (
            <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center">
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
                className="flex-1 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddBlock}
                disabled={isPending}
                className="rounded-xl bg-accent text-background px-5 text-sm font-bold disabled:opacity-50 cursor-pointer hover:bg-accent-dark transition-colors"
              >
                Ajouter
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewBlockInput(true)}
              className="w-full rounded-2xl border border-dashed border-surface-border px-4 py-4 text-sm text-subtle hover:text-accent hover:border-accent/30 cursor-pointer transition-colors"
            >
              + Ajouter un bloc
            </button>
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
            onClick={handleDelete}
            disabled={isPending}
            className="w-full rounded-2xl border border-danger/30 text-danger py-3 text-sm font-bold hover:bg-danger-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            Supprimer ce template
          </button>
        </div>
      </div>
    </main>
  );
}
