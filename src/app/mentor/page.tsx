import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MentorChat } from "./_components/mentor-chat";

export const dynamic = "force-dynamic";

export default async function MentorPage() {
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mentorEnabled: true },
  });

  if (!user?.mentorEnabled) {
    redirect("/profile");
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 pb-24">
      <div className="max-w-2xl w-full flex flex-col h-full space-y-4">
        <header className="flex items-start justify-between gap-3 shrink-0">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              Mentor IA
            </h1>
            <p className="text-xs text-muted mt-1">
              Ton coach personnel analyse tes donn&eacute;es pour t&rsquo;aider
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Retour
          </Link>
        </header>

        <MentorChat />
      </div>
    </main>
  );
}
