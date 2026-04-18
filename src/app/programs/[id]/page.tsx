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
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
            Programme
          </h1>
          <Link
            href="/planning"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            <span aria-hidden="true">←</span> Retour
          </Link>
        </header>

        <ProgramEditor program={program} templates={templateOptions} />
      </div>
    </main>
  );
}
