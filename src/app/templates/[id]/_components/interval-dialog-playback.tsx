"use client";

import type { PlaybackOrder } from "./interval-dialog-presets";

function OrderButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-3 cursor-pointer transition-all ${
        active
          ? "border-accent bg-accent/10 ring-2 ring-accent/30"
          : "border-border bg-surface hover:border-accent/40"
      }`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>
    </button>
  );
}

export function PlaybackOrderPicker({
  value,
  onChange,
  onPickCustom,
}: {
  value: PlaybackOrder;
  onChange: (next: PlaybackOrder) => void;
  /** Called when user clicks CUSTOM — gives the parent a chance to init the sequence. */
  onPickCustom: () => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
        Répartition des exercices
      </h3>
      <div className="grid grid-cols-3 gap-2">
        <OrderButton
          active={value === "CYCLE"}
          title="Cycle"
          subtitle="A → B → C → A…"
          onClick={() => onChange("CYCLE")}
        />
        <OrderButton
          active={value === "SAME"}
          title="Même exo"
          subtitle="1er exo × tous"
          onClick={() => onChange("SAME")}
        />
        <OrderButton
          active={value === "CUSTOM"}
          title="Personnalisé"
          subtitle="Round par round"
          onClick={onPickCustom}
        />
      </div>
    </section>
  );
}
