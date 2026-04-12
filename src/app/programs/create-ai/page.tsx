import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AICreateForm } from "./_components/ai-create-form";

export const dynamic = "force-dynamic";

export default async function CreateAIProgramPage() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mentorEnabled: true },
  });

  if (!user?.mentorEnabled) {
    redirect("/planning");
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Cr&eacute;er avec l&rsquo;IA
          </h1>
          <Link
            href="/planning"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Retour
          </Link>
        </header>

        <AICreateForm />
      </div>
    </main>
  );
}
