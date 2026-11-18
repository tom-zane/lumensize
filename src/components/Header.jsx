import React from 'react';
import {
  RotateCcw,
  FolderOpen,
  Settings as SettingsIcon,
  Undo2,
  Redo2,
  Clock,
} from 'lucide-react';
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
  isHistoryOpen,
  onToggleHistory,
  historyCount = 0,
}) {
  return (
    <header className="h-[52px] bg-surface border-b border-subtle px-3 sm:px-4 flex items-center justify-between shrink-0 select-none text-xs text-txt z-30 relative">
      {/* Brand & File Metadata */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-6 h-6 rounded-control bg-accent text-accent-foreground flex items-center justify-center font-title font-bold text-xs leading-none shadow-xs">
            ⚡
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-title text-sm font-bold tracking-tight text-txt">
              LumenSize
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-pill bg-elevated border border-subtle text-[10px] font-mono text-txt-muted">
              v1.2
            </span>
          </div>
        </div>

        {imageMeta && (
          <div className="hidden md:flex items-center gap-2 text-txt-muted text-[11px] truncate border-l border-subtle pl-3">
            <span className="text-txt font-medium truncate max-w-[200px]" title={imageMeta.name}>
              {imageMeta.name}
            </span>
            <span>•</span>
            <span className="font-mono text-accent font-semibold">{imageMeta.width}×{imageMeta.height}</span>
            <span>•</span>
            <span className="font-mono">{formatBytes(imageMeta.size)}</span>
          </div>
        )}
      </div>

      {/* Center / Right Action Cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Undo / Redo */}
        {imageMeta && (
          <div className="flex items-center gap-0.5 border-r border-subtle pr-1.5 sm:pr-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="w-8 h-8 rounded-control bg-elevated hover:bg-surface text-txt-muted hover:text-txt disabled:opacity-25 border border-subtle flex items-center justify-center transition-colors"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="w-8 h-8 rounded-control bg-elevated hover:bg-surface text-txt-muted hover:text-txt disabled:opacity-25 border border-subtle flex items-center justify-center transition-colors"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Open Image CTA */}
        <button
          type="button"
          onClick={onOpenClick}
          className="h-8 px-2.5 sm:px-3 rounded-control bg-elevated hover:bg-surface text-txt border border-subtle flex items-center gap-1.5 transition-colors shadow-xs"
          title="Open image file"
        >
          <FolderOpen className="w-3.5 h-3.5 text-accent" />
          <span className="font-medium hidden sm:inline">Open</span>
        </button>

        {/* Reset All (only when modified image is loaded) */}
        {imageMeta && (
          <button
            type="button"
            onClick={onResetAll}
            className="h-8 px-2 sm:px-2.5 rounded-control bg-elevated hover:bg-surface text-txt border border-subtle flex items-center gap-1 transition-colors"
            title="Reset all transformations and filters to original"
          >
            <RotateCcw className="w-3.5 h-3.5 text-txt-muted" />
            <span className="hidden md:inline font-medium">Reset</span>
          </button>
        )}

        {/* History Drawer Toggle with count badge */}
        <button
          type="button"
          onClick={onToggleHistory}
          className={`h-8 px-2 sm:px-2.5 rounded-control border flex items-center gap-1.5 transition-colors ${
            isHistoryOpen
              ? 'bg-accent/15 border-accent text-accent font-semibold'
              : 'bg-elevated hover:bg-surface border-subtle text-txt'
          }`}
          title="Toggle history timeline drawer"
          aria-label="Toggle history"
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="hidden lg:inline text-[11px] font-medium">History</span>
          {historyCount > 0 && (
            <span className="px-1 py-0.2 rounded-pill bg-accent text-accent-foreground font-mono text-[10px] font-bold leading-none">
              {historyCount}
            </span>
          )}
        </button>

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-8 h-8 sm:w-auto sm:px-2.5 sm:h-8 rounded-control bg-elevated hover:bg-surface text-txt border border-subtle flex items-center justify-center sm:justify-start gap-1.5 transition-colors"
          title="Preferences & Theme Settings"
          aria-label="Settings"
        >
          <SettingsIcon className="w-3.5 h-3.5 text-txt-muted" />
          <span className="hidden sm:inline font-medium">Settings</span>
        </button>
      </div>
    </header>
  );
}
