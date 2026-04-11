import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getTemplateById } from "@/lib/templates/queries";
import { listExercisesForUser } from "@/lib/workouts/queries";
import { TemplateEditor } from "./_components/template-editor";

export const dynamic = "force-dynamic";

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const template = await getTemplateById(id, userId);

  if (!template) {
    notFound();
  }

  const exercises = await listExercisesForUser(userId);
  return <TemplateEditor template={template} exercises={exercises} />;
}
