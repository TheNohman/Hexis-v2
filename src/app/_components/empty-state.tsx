import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  /** Optional secondary action slot (e.g. a <form> with a submit button). */
  secondary?: React.ReactNode;
};

/**
 * Pedagogical empty state: big icon, short title, 1-sentence description,
 * primary CTA to the creation action. Use inside a parent that owns the
 * outer spacing (this renders a dashed rounded card).
 */
export function EmptyState({ icon: Icon, title, description, cta, secondary }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center flex flex-col items-center gap-3">
      <div className="rounded-full bg-surface border border-border p-3 text-muted">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-xs text-subtle max-w-xs mx-auto">{description}</p>
        )}
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="mt-2 rounded-xl bg-accent text-white px-5 py-2.5 text-sm font-semibold hover:bg-accent-hover transition-colors"
        >
          {cta.label}
        </Link>
      )}
      {secondary}
    </div>
  );
}
