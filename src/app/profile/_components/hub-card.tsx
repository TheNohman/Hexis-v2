import Link from "next/link";
import { Card } from "@/app/_components/card";

type Props = {
  href?: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function HubCard({ href, title, icon, children, className }: Props) {
  const inner = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            {icon}
          </div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">
            {title}
          </p>
        </div>
        {href && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-muted group-hover:text-accent-ink transition-colors shrink-0"
          >
            <path d="M5 3l4 4-4 4" />
          </svg>
        )}
      </div>
      {children}
    </>
  );

  if (!href) {
    return (
      <Card
        rounded="2xl"
        padding="md"
        className={`group ${className ?? ""}`}
      >
        {inner}
      </Card>
    );
  }

  return (
    <Link
      href={href}
      className={`group block rounded-2xl bg-surface shadow-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-hero ${className ?? ""}`}
    >
      {inner}
    </Link>
  );
}
