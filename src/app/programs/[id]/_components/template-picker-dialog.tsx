"use client";

import { X as XIcon } from "lucide-react";

type TemplateOption = { id: string; name: string };

type Props = {
  templates: TemplateOption[];
  currentTemplateId: string | null;
  onSelect: (templateId: string | null) => void;
  onClose: () => void;
};

export function TemplatePickerDialog({ templates, currentTemplateId, onSelect, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-picker-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-0 sm:mx-4 mb-0 sm:mb-0 rounded-t-3xl sm:rounded-3xl bg-surface shadow-hero overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3
            id="template-picker-title"
            className="font-display font-bold text-base tracking-tight"
          >
            Choisir un template
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-subtle hover:text-foreground hover:bg-surface-hover cursor-pointer transition-colors"
          >
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {/* Remove template option */}
          {currentTemplateId && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="w-full text-left rounded-xl px-3 py-3 text-sm font-medium text-danger hover:bg-danger-soft transition-colors cursor-pointer"
            >
              Retirer le template
            </button>
          )}

          {templates.length === 0 ? (
            <p className="text-sm text-subtle text-center py-6">
              Aucun template disponible. Crée-en un d&rsquo;abord.
            </p>
          ) : (
            templates.map((t) => {
              const isActive = t.id === currentTemplateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  aria-pressed={isActive}
                  className={`w-full text-left rounded-xl px-3 py-3 text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "hover:bg-surface-hover"
                  }`}
                >
                  {t.name}
                  {isActive && (
                    <span className="ml-2 text-[10px] uppercase tracking-widest font-bold">
                      Actuel
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
