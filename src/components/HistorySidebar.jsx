import React from 'react';
import { Undo2, Redo2, Clock, History as HistoryIcon, ChevronLeft, ChevronRight } from 'lucide-react';

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
      <aside className="w-8 bg-secondary border-r border-border flex flex-col items-center py-2 shrink-0 select-none">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded-sm text-txt-muted hover:text-txt hover:bg-surface transition-colors"
          title="Expand history timeline"
          aria-label="Expand history"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-4 rotate-90 text-[11px] font-medium text-txt-muted tracking-wider uppercase flex items-center gap-1">
          <HistoryIcon className="w-3 h-3" />
          <span>History</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-44 lg:w-48 bg-secondary border-r border-border flex flex-col h-full shrink-0 select-none text-xs text-txt">
      {/* Header with Undo & Redo buttons */}
      <div className="h-9 px-2.5 border-b border-border flex items-center justify-between shrink-0 bg-secondary">
        <div className="flex items-center gap-1.5 font-semibold text-[11px] tracking-wide uppercase text-txt-muted">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>Timeline</span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 rounded-sm text-txt-muted hover:text-txt hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 rounded-sm text-txt-muted hover:text-txt hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-sm text-txt-muted hover:text-txt hover:bg-surface transition-colors ml-1"
            title="Collapse history sidebar"
            aria-label="Collapse history"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* History steps list */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {history.length === 0 ? (
          <div className="p-3 text-center text-txt-muted text-[11px]">
            No image loaded
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
                className={`w-full text-left px-2 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${
                  isCurrent
                    ? 'bg-accent/15 border border-accent text-accent font-medium'
                    : isFuture
                    ? 'text-txt-muted hover:text-txt hover:bg-surface/50 opacity-60'
                    : 'text-txt hover:bg-surface'
                }`}
                title={isFuture ? `Redo to: ${step.label}` : `Restore: ${step.label}`}
              >
                <span
                  className={`w-4 h-4 rounded-sm flex items-center justify-center font-mono text-[10px] shrink-0 ${
                    isCurrent
                      ? 'bg-accent text-white font-bold'
                      : 'bg-surface border border-border text-txt-muted'
                  }`}
                >
                  {idx + 1}
                </span>

                <div className="min-w-0 flex-1 truncate text-[11px]">
                  {step.label}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer shortcut helper */}
      <div className="p-2 border-t border-border text-[10px] text-txt-muted/70 text-center">
        Ctrl+Z to Undo • Ctrl+Y to Redo
      </div>
    </aside>
  );
}
