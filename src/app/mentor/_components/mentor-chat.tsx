"use client";

import { useState, useRef, useTransition } from "react";
import { sendMentorMessageAction } from "@/app/mentor/actions";
import { parseMentorResponse } from "@/lib/mentor/parser";
import { ProgramPreview } from "./program-preview";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_ACTIONS = [
  { label: "Cr\u00e9e-moi un programme", prompt: "Cr\u00e9e-moi un programme d'entra\u00eenement adapt\u00e9 \u00e0 mon niveau et mes objectifs." },
  { label: "Analyse ma progression", prompt: "Analyse ma progression r\u00e9cente et donne-moi des conseils pour m'am\u00e9liorer." },
  { label: "Ajuste mon programme", prompt: "Analyse mon programme actuel et sugg\u00e8re des ajustements pour am\u00e9liorer mes r\u00e9sultats." },
  { label: "Conseils r\u00e9cup\u00e9ration", prompt: "En fonction de mon bien-\u00eatre r\u00e9cent et de mes entra\u00eenements, que me recommandes-tu pour la r\u00e9cup\u00e9ration ?" },
];

export function MentorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function handleSend(text?: string) {
    const userMessage = text ?? input.trim();
    if (!userMessage) return;

    setInput("");
    setError(null);
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    scrollToBottom();

    startTransition(async () => {
      try {
        const response = await sendMentorMessageAction(
          newMessages.map((m) => ({ role: m.role, content: m.content })),
        );
        setMessages([...newMessages, { role: "assistant", content: response }]);
        scrollToBottom();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <p className="text-sm text-muted">
                Pose une question ou choisis une action rapide ci-dessous.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => handleSend(action.prompt)}
                  disabled={isPending}
                  className="rounded-xl border border-border bg-surface p-3 text-left hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50"
                >
                  <p className="text-sm font-medium">{action.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-xl bg-accent text-white px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          }

          const parsed = parseMentorResponse(msg.content);

          return (
            <div key={i} className="space-y-2">
              <div className="max-w-[85%] rounded-xl border border-border bg-surface px-4 py-3">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {parsed.type === "advice" ? parsed.message : parsed.message}
                </p>
              </div>
              {parsed.type === "create_program" && (
                <ProgramPreview program={parsed.program} />
              )}
              {parsed.type === "adjust_program" && (
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider">
                    Ajustements propos&eacute;s
                  </p>
                  {parsed.changes.map((change, j) => (
                    <div key={j} className="text-sm">
                      <p className="font-medium">{change.description}</p>
                      <p className="text-muted text-xs">{change.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isPending && (
          <div className="flex gap-1 px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demande quelque chose \u00e0 ton mentor..."
            disabled={isPending}
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="rounded-xl bg-accent text-white px-5 py-3 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="2" y1="8" x2="14" y2="8" />
              <polyline points="9,3 14,8 9,13" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
