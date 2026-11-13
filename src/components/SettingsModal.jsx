import React from 'react';
import { X, Check } from 'lucide-react';
import { SUPPORTED_FORMATS } from '../utils/imageProcessor';

export const AVAILABLE_THEMES = [
  {
    id: 'theme-warm-paper',
    name: 'Warm Paper',
    mode: 'Light',
    baseColor: '#fbf9f4',
    secondaryColor: '#ffffff',
    borderColor: '#ded9cc',
    accentColor: '#d94a26',
    textColor: '#1c1b18',
  },
  {
    id: 'theme-obsidian',
    name: 'Obsidian Ember',
    mode: 'Dark',
    baseColor: '#111215',
    secondaryColor: '#181a1f',
    borderColor: '#2d323d',
    accentColor: '#e8562e',
    textColor: '#e8ebf0',
  },
  {
    id: 'theme-clean-studio',
    name: 'Clean Studio',
    mode: 'Light',
    baseColor: '#f4f5f8',
    secondaryColor: '#ffffff',
    borderColor: '#d2d6df',
    accentColor: '#2563eb',
    textColor: '#11141a',
  },
  {
    id: 'theme-nordic-slate',
    name: 'Nordic Slate',
    mode: 'Dark',
    baseColor: '#0f1319',
    secondaryColor: '#171d26',
    borderColor: '#2b3647',
    accentColor: '#0284c7',
    textColor: '#e6edf5',
  },
  {
    id: 'theme-editorial-sage',
    name: 'Editorial Sage',
    mode: 'Dark',
    baseColor: '#131714',
    secondaryColor: '#1a201c',
    borderColor: '#2e3932',
    accentColor: '#d97706',
    textColor: '#e4ebe5',
  },
];

export default function SettingsModal({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
  settings,
  onUpdateSettings,
  onResetSettings,
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-secondary border border-border rounded-sm w-full max-w-md shadow-2xl p-4 text-xs text-txt space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h2 id="settings-title" className="font-semibold text-txt text-sm">
            Preferences & Themes
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferences"
            className="p-1 rounded-xs text-txt-muted hover:text-txt hover:bg-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Selection Section */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-txt">Interface Theme</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AVAILABLE_THEMES.map((th) => {
              const isSelected = currentThemeId === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => onSelectTheme(th.id)}
                  className={`p-2.5 rounded-sm border text-left transition-all relative ${
                    isSelected
                      ? 'border-accent bg-accent/10 shadow-xs'
                      : 'border-border bg-surface hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-txt text-xs">{th.name}</span>
                    <span className="text-[10px] text-txt-muted px-1.5 py-0.2 rounded-xs border border-border">
                      {th.mode}
                    </span>
                  </div>

                  {/* Swatch color row */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-xs border border-black/20"
                      style={{ backgroundColor: th.baseColor }}
                      title="Base page"
                    />
                    <span
                      className="w-4 h-4 rounded-xs border border-black/20"
                      style={{ backgroundColor: th.secondaryColor }}
                      title="Panel surface"
                    />
                    <span
                      className="w-4 h-4 rounded-xs border border-black/20"
                      style={{ backgroundColor: th.borderColor }}
                      title="Border rule"
                    />
                    <span
                      className="w-4 h-4 rounded-xs border border-black/20"
                      style={{ backgroundColor: th.accentColor }}
                      title="Vivid accent"
                    />
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-accent ml-auto" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Default Unit */}
        <div className="space-y-1 pt-1 border-t border-border">
          <label className="block text-[11px] font-medium text-txt-muted">Default Unit</label>
          <div className="flex bg-base p-0.5 rounded-xs border border-border">
            {['cm', 'in', 'px'].map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onUpdateSettings({ defaultUnit: u })}
                className={`flex-1 py-1 rounded-xs text-xs font-medium transition-colors ${
                  settings.defaultUnit === u ? 'bg-secondary text-accent font-bold shadow-xs' : 'text-txt-muted hover:text-txt'
                }`}
              >
                {u.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Default DPI */}
        <div className="space-y-1">
          <label htmlFor="pref-dpi" className="block text-[11px] font-medium text-txt-muted">Default DPI / PPI</label>
          <select
            id="pref-dpi"
            value={settings.defaultDpi}
            onChange={(e) => onUpdateSettings({ defaultDpi: Number(e.target.value) })}
            className="w-full h-7 bg-base border border-border rounded-xs px-2 text-xs text-txt focus:border-accent outline-none"
          >
            <option value={300}>300 DPI (High-resolution Print & Photo)</option>
            <option value={150}>150 DPI (Standard Medium Print)</option>
            <option value={96}>96 DPI (Desktop Display Standard)</option>
            <option value={72}>72 DPI (Standard Web & Screen)</option>
          </select>
        </div>

        {/* Default Format */}
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-txt-muted">Default Export Format</label>
          <div className="flex bg-base p-0.5 rounded-xs border border-border">
            {Object.values(SUPPORTED_FORMATS).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onUpdateSettings({ defaultFormat: f.id })}
                className={`flex-1 py-1 rounded-xs text-xs font-medium transition-colors ${
                  settings.defaultFormat === f.id ? 'bg-secondary text-accent font-bold shadow-xs' : 'text-txt-muted hover:text-txt'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            type="button"
            onClick={onResetSettings}
            className="text-[11px] text-txt-muted hover:text-txt transition-colors"
          >
            Reset defaults
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-7 px-4 bg-accent hover:bg-accent-hover text-white rounded-xs text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
