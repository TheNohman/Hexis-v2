"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/app/_components/toast";

type Props = {
  flash?: string;
};

/**
 * Renders nothing; fires a toast once when the ?flash= query param is
 * present. Used to relay a success message across a redirect (where an
 * in-memory toast would have been lost).
 */
export function HistoryFlash({ flash }: Props) {
  const toast = useToast();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!flash) return;
    firedRef.current = true;
    if (flash === "deleted") {
      toast.show("Séance supprimée.", { kind: "success" });
    }
  }, [flash, toast]);

  return null;
}
