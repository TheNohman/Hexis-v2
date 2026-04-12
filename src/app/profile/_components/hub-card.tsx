import Link from "next/link";

type Props = {
  href: string;
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
};

export function HubCard({ href, title, value, subtitle, icon }: Props) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-surface p-4 hover:border-accent/40 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
          {icon}
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
          className="text-muted group-hover:text-accent transition-colors"
        >
          <path d="M5 3l4 4-4 4" />
        </svg>
      </div>
      <p className="text-xl font-display font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted mt-0.5">{title}</p>
      <p className="text-xs text-subtle mt-1">{subtitle}</p>
    </Link>
  );
}
