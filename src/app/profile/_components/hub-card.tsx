import Link from "next/link";

type Props = {
  href: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function HubCard({ href, title, icon, children, className }: Props) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border border-border bg-surface p-4 hover:border-accent/40 transition-colors ${className ?? ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            {icon}
          </div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">{title}</p>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted group-hover:text-accent transition-colors shrink-0"
        >
          <path d="M5 3l4 4-4 4" />
        </svg>
      </div>
      {children}
    </Link>
  );
}
