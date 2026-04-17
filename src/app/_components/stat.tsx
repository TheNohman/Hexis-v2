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
      ? "text-accent"
      : variant === "done"
        ? "text-done"
        : "";
  const outerPadding = dense ? "py-2" : "p-3";
  const valueSize = dense ? "text-sm font-bold" : "text-xl font-display font-bold";
  return (
    <div
      className={`rounded-lg border border-border bg-surface ${outerPadding} text-center ${className}`}
    >
      <p className={`${valueSize} tabular-nums ${valueClass}`}>{value}</p>
      <p className="text-[10px] text-muted mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}
