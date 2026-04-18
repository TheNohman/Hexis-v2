import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant = "default" | "accent" | "done" | "danger" | "dashed";
export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardRounded = "md" | "lg" | "xl" | "2xl";
export type CardAs = "div" | "section" | "article" | "li";

type Props = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  variant?: CardVariant;
  padding?: CardPadding;
  rounded?: CardRounded;
  as?: CardAs;
  /** When true (and variant="default"), adds hover:bg-surface-hover transition. */
  hover?: boolean;
  className?: string;
  children: ReactNode;
};

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

const ROUNDED: Record<CardRounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

const VARIANT: Record<CardVariant, string> = {
  default: "border border-border bg-surface",
  accent: "border border-accent/30 bg-accent/5",
  done: "border border-done/40 bg-done/10",
  danger: "border border-danger/30 bg-danger-light",
  dashed: "border border-dashed border-border",
};

/**
 * Unified card primitive — consolidates the ubiquitous
 * `rounded-xl border border-border bg-surface p-4` pattern.
 *
 * Variants cover the main visual states (default/accent/done/danger/dashed).
 * Use `padding` and `rounded` for scale overrides. Pass `hover` to add the
 * standard hover:bg-surface-hover interaction (default variant only).
 */
export function Card({
  variant = "default",
  padding = "md",
  rounded = "xl",
  as = "div",
  hover = false,
  className = "",
  children,
  ...rest
}: Props) {
  const Tag = as as "div";
  const hoverClass =
    hover && variant === "default" ? "hover:bg-surface-hover transition-colors" : "";
  const classes = [
    ROUNDED[rounded],
    VARIANT[variant],
    PADDING[padding],
    hoverClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
