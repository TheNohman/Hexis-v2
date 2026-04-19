import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getRecentWellnessLogs,
  getTodayWellnessLog,
} from "@/lib/wellness/queries";
import { WellnessHistorySection } from "../_components/wellness-history";
import { WellnessCheckin } from "@/app/dashboard/_components/wellness-checkin";

export const dynamic = "force-dynamic";

export default async function BienEtrePage() {
  const userId = await getCurrentUserId();
  const [logs, todayLog] = await Promise.all([
    getRecentWellnessLogs(userId, 90),
    getTodayWellnessLog(userId),
  ]);

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] tracking-tight">
              Bien-être
            </h1>
            <p className="text-xs text-muted mt-1">
              90 derniers jours
            </p>
          </div>
          <Link
            href="/profile"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Profil
          </Link>
        </header>

        {/* Inline check-in — formerly redirected to /dashboard#wellness.
            Same component, self-hosting here so the user can backfill or
            edit today's entry without leaving the bien-être screen. */}
        <WellnessCheckin existingLog={todayLog} />

        <WellnessHistorySection logs={logs} />
      </div>
    </main>
  );
}
