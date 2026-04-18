import type { ReactNode } from "react";

type Variant = "default" | "accent" | "done";

type Props = {
  /** Main value rendered big and tabular. */
  value: ReactNode;
  /** Caption under the value. */
  label: string;
  /** Visual emphasis. `accent` = brand color, `done` = success green. */
  variant?: Variant;
  /** Tighter card with smaller paddings (for inline rows of stats). */
  dense?: boolean;
  className?: string;
};

/**
 * Single stat tile — consolidates the 4+ near-identical "big number /
 * small caption" card patterns that were scattered across
 * workout-readonly, summary page, stats page, interval-block-section
 * and template-interval-block-card.
 */
export function Stat({ value, label, variant = "default", dense = false, className = "" }: Props) {
  const valueClass =
    variant === "accent"
      ? "text-foreground"
      : variant === "done"
        ? "text-foreground"
        : "text-foreground";
  const outerPadding = dense ? "py-2 px-3" : "p-4";
  const rounded = dense ? "rounded-xl" : "rounded-2xl";
  const valueSize = dense
    ? "text-base font-display font-extrabold"
    : "text-2xl font-display font-black";
  return (
    <div className={`${rounded} bg-surface shadow-card ${outerPadding} ${className}`}>
      <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">{label}</p>
      <p className={`${valueSize} tabular-nums mt-1.5 ${valueClass}`}>{value}</p>
    </div>
  );
}
