import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWorkout } from "@/lib/workouts/queries";
import { ActiveSessionBannerClient } from "./active-session-banner-client";

/**
 * Persistent banner that stays visible on every page (except the session
 * itself, the landing page, and auth callbacks) while a workout is in
 * progress. Fetches auth + active session data server-side, then delegates
 * pathname-based visibility to a small client component.
 */
export async function ActiveSessionBanner() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const active = await getActiveWorkout(user.id);
  if (!active) return null;

  return (
    <ActiveSessionBannerClient
      sessionId={active.id}
      name={active.name}
      completedEntries={active.completedEntries}
      totalEntries={active.totalEntries}
      startedAt={active.startedAt.toISOString()}
    />
  );
}
