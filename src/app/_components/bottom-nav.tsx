"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navigation items. `matchPrefixes` lists pathname prefixes that count as
 * "active" for this item — beyond the canonical `href`. Useful when sub-surfaces
 * live under different URL roots but belong to the same section conceptually.
 */
const NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: "home", matchPrefixes: [] },
  {
    href: "/planning",
    label: "Planification",
    icon: "calendar",
    // /programs/* and /templates/* are planning surfaces too (cycles +
    // session models). They don't live under /planning/ but belong there.
    matchPrefixes: ["/planning", "/programs", "/templates"],
  },
  { href: "/exercises", label: "Exercices", icon: "target", matchPrefixes: [] },
  {
    href: "/profile",
    label: "Profil",
    icon: "user",
    // /mentor is reached from the profile hub — count it under Profil.
    matchPrefixes: ["/profile", "/mentor"],
  },
  { href: "/stats", label: "Stats", icon: "chart", matchPrefixes: ["/stats", "/history"] },
] as const;

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "var(--accent-ink)" : "currentColor";
  const sw = active ? 2.2 : 1.8;

  switch (name) {
    case "home":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
      );
    case "layers":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12,2 2,7 12,12 22,7" />
          <polyline points="2,17 12,22 22,17" />
          <polyline points="2,12 12,17 22,12" />
        </svg>
      );
    case "target":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "clock":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "user":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "chart":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    default:
      return null;
  }
}

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/sessions/")) return null;
  if (pathname === "/") return null;
  // Hide the nav during the onboarding wizard — user hasn't completed
  // setup yet, the tabs expose surfaces they can't meaningfully use,
  // and the visual presence conflicts with the 5-step flow.
  if (pathname.startsWith("/onboarding")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around max-w-2xl mx-auto">
        {NAV_ITEMS.map((item) => {
          // A route is active for this item if it matches the canonical href
          // or any of the declared prefixes (allows sub-surfaces under other
          // URL roots to highlight the correct tab).
          const prefixes =
            item.matchPrefixes.length > 0 ? item.matchPrefixes : [item.href];
          const isActive = prefixes.some(
            (p) => pathname === p || pathname.startsWith(p + "/"),
          );
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-4 min-h-[60px] text-[11px] transition-colors ${
                isActive
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted hover:text-foreground"
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-accent"
                />
              )}
              <NavIcon name={item.icon} active={isActive} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
