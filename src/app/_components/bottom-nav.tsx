"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: "⌂" },
  { href: "/templates", label: "Templates", icon: "☰" },
  { href: "/exercises", label: "Exercices", icon: "◎" },
  { href: "/stats", label: "Stats", icon: "▤" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // Hide nav during active session (sessions/[id] without /readonly)
  if (pathname.startsWith("/sessions/")) return null;
  // Hide on landing page
  if (pathname === "/") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-foreground/10 bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around max-w-2xl mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-4 min-h-[52px] text-xs transition-colors ${
                isActive
                  ? "text-foreground font-semibold"
                  : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
