"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "info" | "success" | "error";

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  /** Auto-dismiss delay in ms. 0 = sticky. */
  ttlMs: number;
};

type ToastContextValue = {
  show: (message: string, options?: { kind?: ToastKind; ttlMs?: number }) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Minimal, dependency-free toast system. One provider in the root layout,
 * any client component can call `useToast().show("…")`. Toasts stack in
 * the bottom-right (above the bottom nav), auto-dismiss after 4 s by
 * default, and are keyboard-dismissible via Escape.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue["show"]>(
    (message, options) => {
      const id = ++idRef.current;
      const ttlMs = options?.ttlMs ?? 4000;
      const next: Toast = {
        id,
        kind: options?.kind ?? "info",
        message,
        ttlMs,
      };
      setToasts((prev) => [...prev, next]);
      if (ttlMs > 0) {
        setTimeout(() => dismiss(id), ttlMs);
      }
    },
    [dismiss],
  );

  // Global Escape → dismiss newest.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setToasts((prev) => prev.slice(0, -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastOutlet toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Don't throw in server components / outside provider — no-op instead.
    return {
      show: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

function ToastOutlet({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed z-[200] bottom-[calc(60px+env(safe-area-inset-bottom)+8px)] right-3 left-3 sm:left-auto sm:max-w-sm flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md animate-[slideUp_200ms_ease-out] ${styleFor(t.kind)}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-base leading-5 shrink-0">{iconFor(t.kind)}</span>
            <p className="text-sm flex-1 min-w-0">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Fermer"
              className="text-subtle hover:text-foreground cursor-pointer text-base leading-5"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function styleFor(kind: ToastKind): string {
  switch (kind) {
    case "success":
      return "border-done/40 bg-done/10 text-foreground";
    case "error":
      return "border-danger/40 bg-danger/10 text-foreground";
    default:
      return "border-border bg-surface text-foreground";
  }
}

function iconFor(kind: ToastKind): string {
  switch (kind) {
    case "success":
      return "✓";
    case "error":
      return "✕";
    default:
      return "•";
  }
}
