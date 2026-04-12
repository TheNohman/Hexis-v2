"use client";

type TemplateOption = { id: string; name: string };

type Props = {
  templates: TemplateOption[];
  currentTemplateId: string | null;
  onSelect: (templateId: string | null) => void;
  onClose: () => void;
};

export function TemplatePickerDialog({ templates, currentTemplateId, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Choisir un template</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-subtle hover:text-foreground cursor-pointer transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {/* Remove template option */}
          {currentTemplateId && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="w-full text-left rounded-lg px-3 py-3 text-sm text-danger hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Retirer le template
            </button>
          )}

          {templates.length === 0 ? (
            <p className="text-sm text-subtle text-center py-6">
              Aucun template disponible. Cr&eacute;e-en un d&rsquo;abord.
            </p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t.id)}
                className={`w-full text-left rounded-lg px-3 py-3 text-sm transition-colors cursor-pointer ${
                  t.id === currentTemplateId
                    ? "bg-accent/10 text-accent font-medium"
                    : "hover:bg-surface-hover"
                }`}
              >
                {t.name}
                {t.id === currentTemplateId && (
                  <span className="ml-2 text-xs text-accent">(actuel)</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
