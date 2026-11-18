import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Palette, RotateCcw, Check, Sliders } from 'lucide-react';
import { SUPPORTED_FORMATS } from '../utils/imageProcessor';
import { useTheme } from '../context/ThemeContext';
import { THEME_CATEGORIES } from '../themes/index';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
}) {
  const { theme, themeId, setThemeId, allThemes } = useTheme();
  const [activeTab, setActiveTab] = useState('themes'); // 'themes' | 'defaults'
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Escape key closing
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter themes by normalized category with smart attribute matching
  const filteredThemes = allThemes.filter((th) => {
    if (!selectedCategory || selectedCategory === 'all') return true;
    const cat = (th.meta?.category || '').toLowerCase().trim();
    const target = selectedCategory.toLowerCase().trim();
    if (cat === target) return true;

    if (target === 'dark') {
      return cat === 'dark' || ['studio-graphite', 'obsidian-monolith', 'velvet-dusk', 'darkroom-safelight', 'nebula-glass'].includes(th.meta?.id);
    }
    if (target === 'light') {
      return cat === 'light' || cat === 'editorial' || ['alabaster-seamless', 'arctic-frost', 'matcha-pebble', 'academic-latex', 'swiss-brutalist'].includes(th.meta?.id);
    }
    if (target === 'glass') {
      return parseFloat(th.geometry?.glassBlur || '0') > 0 || th.meta?.styleTag?.toLowerCase().includes('glass') || ['nebula-glass', 'arctic-frost'].includes(th.meta?.id);
    }
    if (target === 'borderless') {
      return parseFloat(th.geometry?.borderWidth || '1') === 0 || th.meta?.styleTag?.toLowerCase().includes('borderless') || ['alabaster-seamless'].includes(th.meta?.id);
    }
    if (target === 'hardware') {
      return cat === 'hardware' || parseFloat(th.geometry?.borderWidth || '1') >= 1.5 || th.meta?.styleTag?.toLowerCase().includes('hardware') || ['field-synthesizer', 'swiss-brutalist'].includes(th.meta?.id);
    }

    return false;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-panel shadow-floating w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[780px] h-[840px] max-h-[85dvh] text-xs text-txt overflow-hidden flex flex-col md:flex-row relative z-10"
      >
        {/* ========================================================= */}
        {/* LEFT SECTION: SCROLLABLE VIEWPORT & PINNED FOOTER         */}
        {/* ========================================================= */}
        <div className="order-2 md:order-1 flex-1 min-w-0 flex flex-col bg-base/40 h-full overflow-hidden">
          {/* Scrollable Tab Viewport */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {activeTab === 'themes' && (
              <div className="space-y-3.5">
                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                  {THEME_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-pill text-[11px] font-medium transition-colors border ${
                        selectedCategory === cat.id
                          ? 'bg-accent text-accent-foreground border-accent font-bold shadow-xs'
                          : 'bg-elevated text-txt-muted hover:text-txt border-subtle hover:border-strong'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 2-Column Theme Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredThemes.map((th) => {
                    const isSelected = themeId === th.meta.id;
                    const swatches = th.meta.previewSwatches || [
                      th.colors?.bgBase,
                      th.colors?.bgSurface,
                      th.colors?.accentPrimary,
                      th.colors?.textPrimary,
                    ];

                    const cardBorderRadius = th.geometry?.radiusPanel || '8px';
                    const cardBorderWidth = th.geometry?.borderWidth || '1px';
                    const cardBorderColor = isSelected
                      ? th.colors?.borderFocus || th.colors?.accentPrimary
                      : th.colors?.borderSubtle || 'rgba(255, 255, 255, 0.1)';
                    const cardBgColor = th.colors?.bgSurface || '#15171C';

                    return (
                      <button
                        key={th.meta.id}
                        type="button"
                        onClick={() => setThemeId(th.meta.id)}
                        className={`text-left p-3.5 transition-all relative flex flex-col justify-between gap-3 group focus:outline-none min-w-0 ${
                          isSelected
                            ? 'ring-2 ring-accent shadow-panel'
                            : 'hover:shadow-panel opacity-90 hover:opacity-100'
                        }`}
                        style={{
                          borderRadius: cardBorderRadius,
                          borderWidth: cardBorderWidth,
                          borderColor: cardBorderColor,
                          backgroundColor: cardBgColor,
                          boxShadow: isSelected ? `0 0 0 1px ${th.colors?.accentPrimary}` : undefined,
                        }}
                      >
                        {/* Top Row: Title, Style Tag & Active Check */}
                        <div className="flex items-start justify-between gap-2 w-full min-w-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="font-heading font-bold text-xs truncate max-w-full"
                                style={{ color: th.colors?.textPrimary }}
                              >
                                {th.meta.name}
                              </span>
                              {th.meta.styleTag && (
                                <span
                                  className="px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider rounded-pill truncate max-w-full"
                                  style={{
                                    backgroundColor: th.colors?.accentMuted || 'rgba(56, 189, 248, 0.16)',
                                    color: th.colors?.accentPrimary,
                                    border: `1px solid ${th.colors?.borderSubtle}`,
                                  }}
                                >
                                  {th.meta.styleTag}
                                </span>
                              )}
                            </div>
                            <p
                              className="text-[11px] mt-1 line-clamp-2 leading-tight"
                              style={{ color: th.colors?.textMuted }}
                            >
                              {th.meta.description}
                            </p>
                          </div>

                          {isSelected && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs ml-1"
                              style={{
                                backgroundColor: th.colors?.accentPrimary,
                                color: th.colors?.accentForeground || '#FFFFFF',
                              }}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Bottom Row: 4 Color Swatches and Geometry Specs */}
                        <div
                          className="flex items-center justify-between w-full pt-2 border-t min-w-0"
                          style={{ borderColor: th.colors?.borderSubtle }}
                        >
                          <div className="flex items-center -space-x-1 shrink-0">
                            {swatches.map((color, i) => (
                              <span
                                key={i}
                                className="w-3.5 h-3.5 rounded-full border shadow-xs"
                                style={{
                                  backgroundColor: color,
                                  borderColor: th.colors?.borderStrong || 'rgba(0,0,0,0.3)',
                                }}
                                title={color}
                              />
                            ))}
                          </div>

                          <div
                            className="font-mono text-[9px] truncate ml-2"
                            style={{ color: th.colors?.textMuted }}
                          >
                            R:{th.geometry?.radiusPanel} • B:{th.geometry?.borderWidth}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'defaults' && (
              <div className="space-y-4">
                {/* Default Unit */}
                <div className="space-y-1.5 p-3.5 rounded-panel bg-elevated border border-subtle">
                  <label className="block text-[11px] font-heading font-semibold text-txt">Default Physical Unit</label>
                  <div className="flex bg-base p-0.5 rounded-control border border-subtle">
                    {['cm', 'mm', 'in', 'px'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => onUpdateSettings({ defaultUnit: u })}
                        className={`flex-1 py-1 rounded-control text-xs font-medium transition-colors ${
                          settings.defaultUnit === u
                            ? 'bg-surface text-accent font-bold shadow-xs'
                            : 'text-txt-muted hover:text-txt'
                        }`}
                      >
                        {u.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-txt-muted">Used for initial dimension inputs on freshly loaded artwork.</p>
                </div>

                {/* Default DPI */}
                <div className="space-y-1.5 p-3.5 rounded-panel bg-elevated border border-subtle">
                  <label htmlFor="pref-dpi" className="block text-[11px] font-heading font-semibold text-txt">
                    Default Density Target (DPI / PPI)
                  </label>
                  <select
                    id="pref-dpi"
                    value={settings.defaultDpi}
                    onChange={(e) => onUpdateSettings({ defaultDpi: Number(e.target.value) })}
                    className="w-full h-8 bg-base border border-subtle rounded-input px-2 text-xs text-txt focus:border-accent outline-none"
                  >
                    <option value={300}>300 DPI (High-resolution Print & Photo Standard)</option>
                    <option value={150}>150 DPI (Standard Medium Print)</option>
                    <option value={96}>96 DPI (Desktop Display Standard)</option>
                    <option value={72}>72 DPI (Standard Web & Screen)</option>
                  </select>
                </div>

                {/* Default Format */}
                <div className="space-y-1.5 p-3.5 rounded-panel bg-elevated border border-subtle">
                  <label className="block text-[11px] font-heading font-semibold text-txt">
                    Default Export Format
                  </label>
                  <div className="flex bg-base p-0.5 rounded-control border border-subtle">
                    {Object.values(SUPPORTED_FORMATS).map((f) => {
                      const isSelected = (settings?.defaultFormat || 'image/jpeg') === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onUpdateSettings({ defaultFormat: f.id })}
                          className={`flex-1 py-1 rounded-control text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-surface text-accent font-bold shadow-xs'
                              : 'text-txt-muted hover:text-txt'
                          }`}
                        >
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-txt-muted">
                    Default: JPEG with clean white alpha matte fill.
                  </p>
                </div>

                {/* Default Quality */}
                <div className="space-y-1.5 p-3.5 rounded-panel bg-elevated border border-subtle">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="pref-quality" className="font-heading font-semibold text-txt">
                      Default Compression Quality Slider
                    </label>
                    <span className="font-mono text-accent font-bold px-1.5 py-0.2 bg-base rounded-input border border-subtle">
                      {Math.round((settings?.defaultQuality ?? 0.90) * 100)}%
                    </span>
                  </div>
                  <input
                    id="pref-quality"
                    type="range"
                    min="5"
                    max="100"
                    step="1"
                    value={Math.round((settings?.defaultQuality ?? 0.90) * 100)}
                    onChange={(e) => onUpdateSettings({ defaultQuality: Number(e.target.value) / 100 })}
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pinned Bottom Bar */}
          <div className="shrink-0 px-5 py-3 border-t border-subtle bg-surface flex items-center justify-between">
            <button
              type="button"
              onClick={onResetSettings}
              className="text-[11px] text-txt-muted hover:text-txt transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 bg-accent hover:bg-accent-hover text-accent-foreground rounded-control text-xs font-semibold transition-colors shadow-panel"
            >
              Done
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT SECTION: TITLE, CLOSE & VERTICAL NAVIGATION NAV     */}
        {/* ========================================================= */}
        <div className="order-1 md:order-2 w-full md:w-[220px] shrink-0 bg-surface border-b md:border-b-0 md:border-l border-subtle p-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header row: Title & Close Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-control bg-accent/15 border border-accent/40 flex items-center justify-center text-accent shrink-0">
                  <SettingsIcon className="w-3.5 h-3.5" />
                </div>
                <h2 id="settings-title" className="font-title font-bold text-sm text-txt leading-none">
                  Settings
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="w-7 h-7 rounded-control flex items-center justify-center text-txt-muted hover:text-txt hover:bg-elevated transition-colors border border-transparent hover:border-subtle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-txt-muted leading-tight">
              Personalize interface & export preferences
            </p>

            {/* Vertical Navigation Stack */}
            <nav className="flex md:flex-col gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('themes')}
                className={`flex-1 md:flex-initial px-3 py-2 rounded-control text-xs text-left transition-all flex items-center justify-between gap-2 border ${
                  activeTab === 'themes'
                    ? 'bg-accent/15 text-accent font-semibold border-accent/40'
                    : 'text-txt-muted hover:text-txt hover:bg-elevated border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Appearance</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-pill bg-elevated border border-subtle text-[10px] font-mono font-bold">
                  {allThemes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('defaults')}
                className={`flex-1 md:flex-initial px-3 py-2 rounded-control text-xs text-left transition-all flex items-center gap-2 border ${
                  activeTab === 'defaults'
                    ? 'bg-accent/15 text-accent font-semibold border-accent/40'
                    : 'text-txt-muted hover:text-txt hover:bg-elevated border-transparent'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Export Defaults</span>
              </button>
            </nav>
          </div>

          {/* Footer App Badge */}
          <div className="hidden md:block pt-4 border-t border-subtle text-[10px] text-txt-muted font-mono">
            LumenSize v1.2 • Studio
          </div>
        </div>
      </div>
    </div>
  );
}
