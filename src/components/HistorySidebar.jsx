import React from 'react';
import {
  Undo2,
  Redo2,
  Clock,
  ChevronLeft,
  ChevronRight,
  History as HistoryIcon,
  Check,
  RotateCcw,
} from 'lucide-react';

export default function HistorySidebar({
  history,
  currentIndex,
  onSelectStep,
  onUndo,
  onRedo,
  isCollapsed,
  onToggleCollapse,
}) {
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  if (isCollapsed) {
    return (
      <aside className="w-9 bg-surface border-r border-subtle flex flex-col items-center py-2.5 shrink-0 select-none z-20">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-control text-txt-muted hover:text-txt hover:bg-elevated flex items-center justify-center transition-colors"
          title="Expand history timeline"
          aria-label="Expand history"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-6 rotate-90 text-[10px] font-mono font-bold text-txt-muted tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap">
          <HistoryIcon className="w-3 h-3 text-accent -rotate-90" />
          <span>Timeline ({history.length})</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-52 lg:w-56 bg-surface border-r border-subtle flex flex-col h-full shrink-0 select-none text-xs text-txt z-20">
      {/* Drawer Header */}
      <div className="h-10 px-3 border-b border-subtle flex items-center justify-between shrink-0 bg-surface">
        <div className="flex items-center gap-1.5 font-heading font-semibold text-xs text-txt">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>History ({history.length})</span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="w-7 h-7 rounded-control text-txt-muted hover:text-txt hover:bg-elevated disabled:opacity-25 flex items-center justify-center transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="w-7 h-7 rounded-control text-txt-muted hover:text-txt hover:bg-elevated disabled:opacity-25 flex items-center justify-center transition-colors"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-control text-txt-muted hover:text-txt hover:bg-elevated flex items-center justify-center transition-colors ml-0.5"
            title="Collapse history drawer"
            aria-label="Collapse history"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {history.length === 0 ? (
          <div className="p-4 text-center text-txt-muted text-[11px] leading-relaxed">
            No transformations recorded yet
          </div>
        ) : (
          history.map((step, idx) => {
            const isCurrent = idx === currentIndex;
            const isFuture = idx > currentIndex;

            return (
              <button
                key={step.id || idx}
                type="button"
                onClick={() => onSelectStep(idx)}
                className={`w-full text-left p-2 rounded-panel border transition-all flex items-start gap-2 ${
                  isCurrent
                    ? 'border-accent bg-accent/15 text-accent font-semibold shadow-xs ring-1 ring-accent'
                    : isFuture
                    ? 'border-subtle/50 bg-elevated/40 text-txt-muted opacity-50 hover:opacity-80 hover:bg-elevated'
                    : 'border-subtle bg-elevated hover:bg-surface hover:border-strong text-txt'
                }`}
                title={isFuture ? `Redo forward to: ${step.label}` : `Restore step: ${step.label}`}
              >
                {/* Step sequence index */}
                <span
                  className={`w-5 h-5 rounded-control flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5 ${
                    isCurrent
                      ? 'bg-accent text-accent-foreground font-bold'
                      : 'bg-base border border-subtle text-txt-muted'
                  }`}
                >
                  {idx + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-heading font-medium leading-tight">
                    {step.label}
                  </div>
                  {step.state && (
                    <div className="text-[10px] font-mono text-txt-muted mt-0.5 flex items-center gap-1">
                      <span>{step.state.pixelWidth}×{step.state.pixelHeight}</span>
                      <span>•</span>
                      <span>{step.state.format?.replace('image/', '').toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {isCurrent && <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />}
              </button>
            );
          })
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-2.5 border-t border-subtle bg-surface text-[10px] text-txt-muted text-center font-mono">
        <kbd className="px-1 py-0.5 bg-elevated rounded-control border border-subtle">Ctrl+Z</kbd> Undo •{' '}
        <kbd className="px-1 py-0.5 bg-elevated rounded-control border border-subtle">Ctrl+Y</kbd> Redo
      </div>
    </aside>
  );
}
