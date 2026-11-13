import React from 'react';
import { RotateCcw, FolderOpen, Settings as SettingsIcon, Undo2, Redo2 } from 'lucide-react';
import { formatBytes } from '../utils/units';

export default function Header({
  imageMeta,
  onOpenClick,
  onResetAll,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenSettings,
}) {
  return (
    <header className="h-10 bg-secondary border-b border-border px-3 flex items-center justify-between shrink-0 select-none text-xs text-txt">
      {/* Brand & File metadata */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-xs bg-accent text-white flex items-center justify-center font-serif font-bold text-xs leading-none shadow-xs">
            L
          </span>
          <span className="font-serif text-sm font-semibold tracking-tight text-txt shrink-0">
            LumenSize
          </span>
        </div>

        {imageMeta && (
          <div className="hidden sm:flex items-center gap-2 text-txt-muted text-[11px] truncate border-l border-border pl-3">
            <span className="text-txt font-medium truncate max-w-[180px]" title={imageMeta.name}>
              {imageMeta.name}
            </span>
            <span>•</span>
            <span className="font-mono">{imageMeta.width}×{imageMeta.height}</span>
            <span>•</span>
            <span>{formatBytes(imageMeta.size)}</span>
          </div>
        )}
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1.5">
        {/* Quick Undo / Redo */}
        {imageMeta && (
          <div className="flex items-center gap-0.5 mr-1 border-r border-border pr-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-7 px-1.5 rounded-xs bg-surface hover:bg-border/30 text-txt-muted hover:text-txt disabled:opacity-30 disabled:hover:bg-transparent border border-border transition-colors"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-7 px-1.5 rounded-xs bg-surface hover:bg-border/30 text-txt-muted hover:text-txt disabled:opacity-30 disabled:hover:bg-transparent border border-border transition-colors"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenClick}
          className="h-7 px-2.5 rounded-xs bg-surface hover:bg-border/30 text-txt border border-border flex items-center gap-1.5 transition-colors focus-visible:outline-accent"
          title="Open image file"
        >
          <FolderOpen className="w-3.5 h-3.5 text-accent" />
          <span>Open</span>
        </button>

        {imageMeta && (
          <button
            type="button"
            onClick={onResetAll}
            className="h-7 px-2 rounded-xs bg-surface hover:bg-border/30 text-txt border border-border flex items-center gap-1 transition-colors focus-visible:outline-accent"
            title="Reset all edits to original source"
          >
            <RotateCcw className="w-3.5 h-3.5 text-txt-muted" />
            <span className="hidden md:inline">Reset</span>
          </button>
        )}

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="h-7 px-2.5 rounded-xs bg-surface hover:bg-border/30 text-txt border border-border flex items-center gap-1.5 transition-colors focus-visible:outline-accent"
          title="Themes & Preferences"
        >
          <SettingsIcon className="w-3.5 h-3.5 text-txt-muted" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}
