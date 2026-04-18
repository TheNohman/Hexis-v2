import type { Metadata, Viewport } from "next";
import { DM_Sans, Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "./_components/bottom-nav";
import { ActiveSessionBanner } from "./_components/active-session-banner";
import { ToastProvider } from "./_components/toast";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hexis",
  description: "Hexis - Fitness Tracking App",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh pt-[env(safe-area-inset-top)] pb-[calc(60px+env(safe-area-inset-bottom))]">
        <a
          href="#main-content"
          className="sr-only-focusable fixed top-3 left-3 z-[100] rounded-xl bg-foreground text-background px-4 py-2 text-sm font-semibold shadow-floating"
        >
          Aller au contenu principal
        </a>
        <ToastProvider>
          <ActiveSessionBanner />
          <div id="main-content">{children}</div>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
