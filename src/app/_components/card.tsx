import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant = "default" | "accent" | "done" | "danger" | "dashed" | "hero" | "plain";
export type CardPadding = "none" | "sm" | "md" | "lg" | "xl";
export type CardRounded = "md" | "lg" | "xl" | "2xl" | "3xl";
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
  xl: "p-6",
};

const ROUNDED: Record<CardRounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
};

const VARIANT: Record<CardVariant, string> = {
  default: "bg-surface shadow-card",
  plain: "bg-surface",
  accent: "bg-accent text-accent-foreground",
  done: "bg-done/20 text-foreground",
  danger: "bg-danger-light text-foreground",
  dashed: "border border-dashed border-border",
  hero: "bg-foreground text-background shadow-hero",
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
