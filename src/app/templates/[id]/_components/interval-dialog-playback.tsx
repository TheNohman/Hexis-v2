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
      aria-pressed={active}
      className={`text-left rounded-xl p-3 cursor-pointer transition-all ${
        active
          ? "bg-accent text-accent-foreground shadow-card"
          : "bg-surface shadow-card hover:shadow-hero hover:-translate-y-0.5"
      }`}
    >
      <p className="text-sm font-display font-bold">{title}</p>
      <p className={`text-[10px] mt-0.5 ${active ? "text-accent-foreground/80" : "text-muted"}`}>
        {subtitle}
      </p>
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
      <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
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
