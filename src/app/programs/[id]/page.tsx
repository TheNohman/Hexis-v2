import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getProgramById } from "@/lib/programs/queries";
import { listTemplates } from "@/lib/templates/queries";
import { ProgramEditor } from "./_components/program-editor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProgramPage(props: Props) {
  const params = await props.params;
  const userId = await getCurrentUserId();
  const [program, templates] = await Promise.all([
    getProgramById(params.id, userId),
    listTemplates(userId),
  ]);

  const templateOptions = templates.map((t) => ({ id: t.id, name: t.name }));

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-6">
      <div className="max-w-2xl w-full space-y-6">
        {/* Floating back link — no big page-h1, the ProgramEditor owns the hero. */}
        <div className="flex items-center justify-between">
          <Link
            href="/planning"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground transition-colors py-1"
          >
            <span aria-hidden="true">←</span> Retour à la planification
          </Link>
        </div>

        <ProgramEditor program={program} templates={templateOptions} />
      </div>
    </main>
  );
}
