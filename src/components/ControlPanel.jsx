import React from 'react';
import {
  Lock,
  Unlock,
  Download,
  Target,
  Zap,
  RefreshCw,
  X,
} from 'lucide-react';
import { SUPPORTED_FORMATS } from '../utils/imageProcessor';
import { formatBytes } from '../utils/units';

export default function ControlPanel({
  dimensions,
  onDimensionChange,
  unit,
  onUnitChange,
  dpi,
  onDpiChange,
  lockAspectRatio,
  onToggleLockAspectRatio,
  format,
  onFormatChange,
  quality,
  onQualityChange,
  estimatedSize,
  isProcessing,
  onDownload,
  originalMeta,
  // Fit mode & Background fill
  fitMode,
  setFitMode,
  fillColor,
  setFillColor,
  // Combined Target file size search props
  targetMin,
  setTargetMin,
  targetMax,
  setTargetMax,
  targetUnit,
  setTargetUnit,
  allowScaling,
  setAllowScaling,
  isSearching,
  searchStatus,
  searchResult,
  onStartSearch,
  onCancelSearch,
}) {
  const currentFormatMeta =
    Object.values(SUPPORTED_FORMATS).find((f) => f.id === format) ||
    SUPPORTED_FORMATS.JPEG;

  const handleWidthChange = (e) => {
    const val = parseFloat(e.target.value);
    onDimensionChange('width', isNaN(val) ? '' : val);
  };

  const handleHeightChange = (e) => {
    const val = parseFloat(e.target.value);
    onDimensionChange('height', isNaN(val) ? '' : val);
  };

  // Helper for delta calculation
  const sizeDelta = originalMeta && estimatedSize > 0
    ? {
        pct: Math.round(((estimatedSize - originalMeta.size) / originalMeta.size) * 100),
        isReduction: estimatedSize < originalMeta.size,
      }
    : null;

  return (
    <aside className="w-full lg:w-[320px] bg-surface flex flex-col h-full shrink-0 select-none text-xs text-txt border-l border-subtle relative z-20">
      {/* Scrollable settings body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* ========================================================= */}
        {/* SECTION 1: TARGET FILE SIZE (PROMINENT STUDIO CARD)       */}
        {/* ========================================================= */}
        <section className="p-3 bg-accent/5 border border-accent/40 rounded-panel space-y-2.5 shadow-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-heading font-bold text-accent text-xs tracking-wide">
              <Target className="w-4 h-4 text-accent" />
              <span>Target File Size Optimizer</span>
            </div>
            {isSearching && (
              <span className="text-[10px] font-semibold text-accent flex items-center gap-1 animate-pulse font-mono">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Searching</span>
              </span>
            )}
          </div>

          {/* Min & Max inputs */}
          <div className="grid grid-cols-[1fr,1fr,60px] gap-1.5 items-end">
            <div>
              <label htmlFor="target-min-input" className="block text-[10px] font-medium text-txt-muted mb-0.5">
                Min Target
              </label>
              <input
                id="target-min-input"
                type="number"
                min="0"
                value={targetMin}
                onChange={(e) => setTargetMin(e.target.value)}
                disabled={isSearching}
                placeholder="0"
                className="w-full h-7 bg-base border border-subtle rounded-input px-2 font-mono text-xs text-txt focus:border-accent outline-none"
              />
            </div>

            <div>
              <label htmlFor="target-max-input" className="block text-[10px] font-medium text-txt-muted mb-0.5">
                Max Target
              </label>
              <input
                id="target-max-input"
                type="number"
                min="1"
                value={targetMax}
                onChange={(e) => setTargetMax(e.target.value)}
                disabled={isSearching}
                placeholder="100"
                className="w-full h-7 bg-base border border-subtle rounded-input px-2 font-mono text-xs text-txt focus:border-accent outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-txt-muted mb-0.5">Unit</label>
              <select
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                disabled={isSearching}
                className="w-full h-7 bg-base border border-subtle rounded-input px-1 text-xs text-txt font-medium focus:border-accent outline-none"
              >
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
          </div>

          {/* Allow dimension scaling */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <input
              id="target-allow-scaling"
              type="checkbox"
              checked={allowScaling}
              onChange={(e) => setAllowScaling(e.target.checked)}
              disabled={isSearching}
              className="w-3.5 h-3.5 rounded-input bg-base border-subtle accent-accent cursor-pointer"
            />
            <label htmlFor="target-allow-scaling" className="text-[11px] text-txt cursor-pointer">
              Allow adaptive resolution downscaling
            </label>
          </div>

          {/* Search Action CTA */}
          {!isSearching ? (
            <button
              type="button"
              onClick={onStartSearch}
              disabled={!originalMeta}
              className="w-full h-8 bg-accent hover:bg-accent-hover text-accent-foreground rounded-control font-semibold flex items-center justify-center gap-1.5 shadow-panel transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Solve Target File Size</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancelSearch}
              className="w-full h-8 bg-elevated hover:bg-surface text-accent border border-accent/40 rounded-control font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Optimization</span>
            </button>
          )}

          {/* Status readout */}
          {isSearching && searchStatus && (
            <div className="p-2 bg-base/90 border border-subtle rounded-control text-[11px] font-mono text-txt-muted leading-tight">
              {searchStatus}
            </div>
          )}

          {/* Search Result Box */}
          {searchResult && (
            <div
              className={`p-2.5 rounded-panel border text-[11px] space-y-1.5 ${
                searchResult.success
                  ? 'bg-success/10 border-success/40 text-txt'
                  : 'bg-elevated border-subtle text-txt-muted'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className={searchResult.success ? 'text-success' : 'text-txt'}>
                  {searchResult.success ? '✓ Target Reached' : 'Target Unreachable'}
                </span>
                {searchResult.bestCandidate && (
                  <span className="font-mono text-accent font-bold">
                    {formatBytes(searchResult.bestCandidate.size)}
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-tight">{searchResult.message}</p>
              {searchResult.suggestScaling && !allowScaling && (
                <button
                  type="button"
                  onClick={() => {
                    setAllowScaling(true);
                    setTimeout(() => onStartSearch(), 50);
                  }}
                  className="mt-1 w-full py-1.5 px-2 bg-accent hover:bg-accent-hover text-accent-foreground font-semibold rounded-control text-[11px] transition-colors flex items-center justify-center gap-1 shadow-panel"
                >
                  <span>Allow dimension scaling & retry</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: DIMENSIONS & UNITS                             */}
        {/* ========================================================= */}
        <section className="p-3 bg-elevated border border-subtle rounded-panel space-y-3 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-heading font-semibold text-xs text-txt">Dimensions & Units</span>

            {/* Segmented Unit Selector */}
            <div className="flex bg-base p-0.5 rounded-control border border-subtle">
              {['cm', 'mm', 'in', 'px'].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onUnitChange(u)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-control transition-colors ${
                    unit === u
                      ? 'bg-surface text-accent font-bold shadow-panel'
                      : 'text-txt-muted hover:text-txt'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Width, Aspect Lock, Height */}
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 min-w-0">
            <div className="min-w-0">
              <label htmlFor="dim-w-val" className="block text-[10px] font-mono text-txt-muted mb-0.5 truncate">
                WIDTH ({unit})
              </label>
              <input
                id="dim-w-val"
                type="number"
                min="0.1"
                step={unit === 'px' ? '1' : unit === 'mm' ? '0.1' : '0.01'}
                value={dimensions.widthDisplay}
                onChange={handleWidthChange}
                className="w-full min-w-0 h-7 bg-base border border-subtle rounded-input px-2 font-mono text-xs text-txt focus:border-accent outline-none"
              />
            </div>

            <div className="pt-3.5 flex justify-center shrink-0">
              <button
                type="button"
                onClick={onToggleLockAspectRatio}
                title={lockAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                aria-label={lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                className={`p-1.5 rounded-control border transition-colors ${
                  lockAspectRatio
                    ? 'bg-accent/15 border-accent text-accent font-bold'
                    : 'bg-base border-subtle text-txt-muted hover:text-txt'
                }`}
              >
                {lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="min-w-0">
              <label htmlFor="dim-h-val" className="block text-[10px] font-mono text-txt-muted mb-0.5 truncate">
                HEIGHT ({unit})
              </label>
              <input
                id="dim-h-val"
                type="number"
                min="0.1"
                step={unit === 'px' ? '1' : unit === 'mm' ? '0.1' : '0.01'}
                value={dimensions.heightDisplay}
                onChange={handleHeightChange}
                className="w-full min-w-0 h-7 bg-base border border-subtle rounded-input px-2 font-mono text-xs text-txt focus:border-accent outline-none"
              />
            </div>
          </div>

          {/* DPI Input & Resolution Telemetry */}
          <div className="space-y-1 pt-1 border-t border-subtle/60">
            <div className="flex items-center justify-between">
              <label htmlFor="dpi-field-input" className="text-[10px] font-mono text-txt-muted uppercase">
                DPI / PPI DENSITY
              </label>
              <span className="font-mono text-[10px] text-accent font-semibold truncate">
                {dimensions.pixelWidth} × {dimensions.pixelHeight} px
              </span>
            </div>
            <div className="grid grid-cols-[1fr,70px] gap-2 min-w-0">
              <div className="min-w-0">
                <select
                  id="dpi-field-select"
                  value={dpi}
                  onChange={(e) => onDpiChange(Number(e.target.value))}
                  className="w-full max-w-full min-w-0 box-border truncate h-7 bg-base border border-subtle rounded-input px-1.5 text-xs text-txt focus:border-accent outline-none"
                >
                  <option value={300}>300 DPI (High-Res Print & Photo)</option>
                  <option value={150}>150 DPI (Standard Medium Print)</option>
                  <option value={96}>96 DPI (Desktop Display Standard)</option>
                  <option value={72}>72 DPI (Standard Web & Screen)</option>
                </select>
              </div>
              <div className="min-w-0">
                <input
                  id="dpi-field-input"
                  type="number"
                  min="1"
                  max="1200"
                  value={dpi}
                  onChange={(e) => onDpiChange(Math.max(1, Number(e.target.value)))}
                  className="w-full min-w-0 h-7 bg-base border border-subtle rounded-input px-1 font-mono text-xs text-center text-txt focus:border-accent outline-none"
                  aria-label="Custom DPI"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: FORMAT, QUALITY & CANVAS FITTING               */}
        {/* ========================================================= */}
        <section className="p-3 bg-elevated border border-subtle rounded-panel space-y-3 shadow-panel">
          {/* Segmented Format Selector */}
          <div className="flex items-center justify-between">
            <span className="font-heading font-semibold text-xs text-txt">Export Format</span>
            <div className="flex bg-base p-0.5 rounded-control border border-subtle">
              {['image/jpeg', 'image/webp', 'image/png'].map((fmtId) => {
                const fMeta = Object.values(SUPPORTED_FORMATS).find((f) => f.id === fmtId) || { name: fmtId };
                const isSelected = format === fmtId;
                return (
                  <button
                    key={fmtId}
                    type="button"
                    onClick={() => onFormatChange(fmtId)}
                    className={`px-2.5 py-0.5 text-[11px] font-medium rounded-control transition-colors ${
                      isSelected
                        ? 'bg-surface text-accent font-bold shadow-panel'
                        : 'text-txt-muted hover:text-txt'
                    }`}
                  >
                    {fMeta.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tactile Quality Slider with Monospace readout */}
          {currentFormatMeta.lossy && (
            <div className="space-y-1.5 pt-1 border-t border-subtle/60">
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="dim-quality-range" className="text-txt-muted font-medium">
                  Compression Quality
                </label>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs text-accent font-bold px-1.5 py-0.2 bg-base rounded-input border border-subtle">
                    {Math.round(quality * 100)}%
                  </span>
                </div>
              </div>
              <input
                id="dim-quality-range"
                type="range"
                min="5"
                max="100"
                step="1"
                value={Math.round(quality * 100)}
                onChange={(e) => onQualityChange(Number(e.target.value) / 100)}
                className="w-full cursor-pointer"
              />
            </div>
          )}

          {/* Segmented Fit Mode */}
          <div className="flex items-center justify-between pt-1 border-t border-subtle/60">
            <span className="text-txt-muted text-[11px]">Fitting Behavior</span>
            <div className="flex bg-base p-0.5 rounded-control border border-subtle">
              <button
                type="button"
                onClick={() => setFitMode('contain')}
                className={`px-3 py-0.5 text-xs font-medium rounded-control transition-colors ${
                  fitMode === 'contain' ? 'bg-surface text-accent font-bold shadow-panel' : 'text-txt-muted hover:text-txt'
                }`}
              >
                Contain (Fit)
              </button>
              <button
                type="button"
                onClick={() => setFitMode('cover')}
                className={`px-3 py-0.5 text-xs font-medium rounded-control transition-colors ${
                  fitMode === 'cover' ? 'bg-surface text-accent font-bold shadow-panel' : 'text-txt-muted hover:text-txt'
                }`}
              >
                Cover (Fill)
              </button>
            </div>
          </div>

          {/* Background Matte Color Picker (Directive 1 Guardrail) */}
          <div className="flex items-center justify-between pt-1 border-t border-subtle/60">
            <div>
              <span className="font-medium text-txt text-[11px]">
                {format === 'image/jpeg' ? 'Alpha Matte Fill' : 'Canvas Fill'}
              </span>
              {format === 'image/jpeg' && (
                <span className="block text-[10px] text-txt-muted">
                  Replaces transparency in JPEG
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-txt uppercase px-1 py-0.5 bg-base rounded-input border border-subtle">
                {fillColor === 'transparent' ? '#FFFFFF' : fillColor}
              </span>
              <input
                id="background-matte-picker"
                type="color"
                value={fillColor === 'transparent' ? '#FFFFFF' : fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="w-7 h-7 p-0 bg-base border border-subtle rounded-control cursor-pointer shadow-panel"
                title="Color matte picker"
                aria-label="Color matte picker"
              />
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================= */}
      {/* SECTION 4: STICKY EXPORT FOOTER (PRECISION ACTION)        */}
      {/* ========================================================= */}
      <div className="p-3.5 bg-surface border-t border-subtle shrink-0 z-10 sticky bottom-0 shadow-panel space-y-2">
        <div className="flex items-center justify-between text-xs px-0.5">
          <div className="flex items-center gap-1.5 font-mono text-txt-muted text-[11px]">
            <span>{currentFormatMeta.name}</span>
            <span>•</span>
            <span className="text-txt font-semibold">{dimensions.pixelWidth}×{dimensions.pixelHeight}</span>
          </div>

          <div className="flex items-center gap-1 font-mono">
            <span className="text-accent font-bold text-xs">
              {estimatedSize ? formatBytes(estimatedSize) : '—'}
            </span>
            {sizeDelta && (
              <span
                className={`text-[10px] px-1 py-0.2 rounded-pill font-bold ${
                  sizeDelta.isReduction ? 'bg-success/15 text-success' : 'bg-info/15 text-info'
                }`}
              >
                {sizeDelta.pct > 0 ? `+${sizeDelta.pct}%` : `${sizeDelta.pct}%`}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDownload}
          disabled={isProcessing || isSearching || !originalMeta}
          className="w-full h-10 bg-accent hover:bg-accent-hover text-accent-foreground font-semibold rounded-control flex items-center justify-center gap-2 shadow-panel transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-floating"
        >
          <Download className="w-4 h-4" />
          <span>Export & Download Image</span>
        </button>
      </div>
    </aside>
  );
}
