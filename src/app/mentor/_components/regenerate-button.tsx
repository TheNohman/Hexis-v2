"use client";

import { useTransition } from "react";
import { useToast } from "@/app/_components/toast";
import { regenerateMentorAdviceAction } from "../actions";

type Props = {
  disabled?: boolean;
  disabledReason?: string | null;
};

/**
 * Button that calls `regenerateMentorAdviceAction` and surfaces a toast
 * when the regeneration is done. When `disabled` (rate-limit exhausted
 * or mentor off), we still let the user click to see the reason toast,
 * but we don't call the server.
 */
export function RegenerateButton({ disabled, disabledReason }: Props) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function onClick() {
    if (disabled) {
      toast.show(
        disabledReason ?? "Impossible de r\u00e9g\u00e9n\u00e9rer pour le moment.",
        { kind: "info" },
      );
      return;
    }
    startTransition(async () => {
      try {
        await regenerateMentorAdviceAction();
        toast.show("Nouveau conseil g\u00e9n\u00e9r\u00e9.", { kind: "success" });
      } catch (error) {
        console.error("[mentor] regenerate", error);
        toast.show("La r\u00e9g\u00e9n\u00e9ration a \u00e9chou\u00e9.", { kind: "error" });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-accent text-white px-4 py-2 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "G\u00e9n\u00e9ration\u2026" : "R\u00e9g\u00e9n\u00e9rer maintenant"}
    </button>
  );
}
