"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props<T> = {
  items: T[];
  /** Stable identifier for each item — used as the dnd-kit id. */
  keyFor: (item: T) => string;
  /** Called with the REORDERED array when the user drops. */
  onReorder: (next: T[]) => void;
  /** Row renderer. Receives a `handleProps` blob to spread on the drag handle. */
  renderItem: (
    item: T,
    index: number,
    handleProps: {
      attributes: React.HTMLAttributes<HTMLButtonElement>;
      listeners: React.HTMLAttributes<HTMLButtonElement>;
      isDragging: boolean;
    },
  ) => ReactNode;
  /** Optional wrapper class for the `<ol>`. */
  className?: string;
};

/**
 * Generic sortable list on top of dnd-kit. Replaces the 3 near-identical
 * implementations that were scattered across template-editor,
 * block-section and interval-block-dialog. Mobile-friendly (TouchSensor
 * with 180 ms delay) and keyboard-navigable.
 *
 * Usage:
 *
 *   <SortableList
 *     items={exs}
 *     keyFor={(ex) => ex.id}
 *     onReorder={setExs}
 *     renderItem={(ex, i, { attributes, listeners }) => (
 *       <li className="…">
 *         <button {...attributes} {...listeners} className="cursor-grab">⠿</button>
 *         <span>{ex.name}</span>
 *       </li>
 *     )}
 *   />
 */
export function SortableList<T>({
  items,
  keyFor,
  onReorder,
  renderItem,
  className,
}: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map(keyFor);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(keyFor)}
        strategy={verticalListSortingStrategy}
      >
        <ol className={className}>
          {items.map((item, i) => (
            <SortableRow key={keyFor(item)} id={keyFor(item)}>
              {(handleProps) => renderItem(item, i, handleProps)}
            </SortableRow>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handleProps: {
    attributes: React.HTMLAttributes<HTMLButtonElement>;
    listeners: React.HTMLAttributes<HTMLButtonElement>;
    isDragging: boolean;
  }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({
        attributes: attributes as React.HTMLAttributes<HTMLButtonElement>,
        listeners: (listeners ?? {}) as React.HTMLAttributes<HTMLButtonElement>,
        isDragging,
      })}
    </div>
  );
}
