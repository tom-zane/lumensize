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
    SUPPORTED_FORMATS.WEBP;

  const handleWidthChange = (e) => {
    const val = parseFloat(e.target.value);
    onDimensionChange('width', isNaN(val) ? '' : val);
  };

  const handleHeightChange = (e) => {
    const val = parseFloat(e.target.value);
    onDimensionChange('height', isNaN(val) ? '' : val);
  };

  return (
    <aside className="w-full lg:w-[310px] bg-secondary flex flex-col h-full shrink-0 select-none text-xs text-txt border-l border-border relative">
      {/* Scrollable settings body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* ========================================================= */}
        {/* SECTION 1: TARGET FILE SIZE (PROMINENTLY HIGHLIGHTED)     */}
        {/* ========================================================= */}
        <section className="p-3 bg-accent/5 border-2 border-accent/40 rounded-sm space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-accent text-xs uppercase tracking-wide">
              <Target className="w-4 h-4 text-accent" />
              <span>Target File Size</span>
            </div>
            {isSearching && (
              <span className="text-[10px] font-semibold text-accent flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Optimizing</span>
              </span>
            )}
          </div>

          {/* Min & Max inputs */}
          <div className="grid grid-cols-[1fr,1fr,56px] gap-1.5 items-end">
            <div>
              <label htmlFor="target-min-input" className="block text-[10px] font-medium text-txt-muted mb-0.5">
                Min
              </label>
              <input
                id="target-min-input"
                type="number"
                min="0"
                value={targetMin}
                onChange={(e) => setTargetMin(e.target.value)}
                disabled={isSearching}
                placeholder="0"
                className="w-full h-7 bg-base border border-border rounded-xs px-2 font-mono text-xs text-txt focus:border-accent outline-none"
              />
            </div>

            <div>
              <label htmlFor="target-max-input" className="block text-[10px] font-medium text-txt-muted mb-0.5">
                Max
              </label>
              <input
                id="target-max-input"
                type="number"
                min="1"
                value={targetMax}
                onChange={(e) => setTargetMax(e.target.value)}
                disabled={isSearching}
                placeholder="100"
                className="w-full h-7 bg-base border border-border rounded-xs px-2 font-mono text-xs text-txt focus:border-accent outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-txt-muted mb-0.5">Unit</label>
              <select
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                disabled={isSearching}
                className="w-full h-7 bg-base border border-border rounded-xs px-1 text-xs text-txt font-medium focus:border-accent outline-none"
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
              className="w-3.5 h-3.5 rounded-xs bg-base border-border accent-accent cursor-pointer"
            />
            <label htmlFor="target-allow-scaling" className="text-[11px] text-txt cursor-pointer">
              Allow dimension scaling
            </label>
          </div>

          {/* Search Action */}
          {!isSearching ? (
            <button
              type="button"
              onClick={onStartSearch}
              disabled={!originalMeta}
              className="w-full h-8 bg-accent hover:bg-accent-hover text-white rounded-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Search Target Size</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancelSearch}
              className="w-full h-8 bg-surface hover:bg-border/30 text-accent border border-accent/40 rounded-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Search</span>
            </button>
          )}

          {/* Status readout */}
          {isSearching && searchStatus && (
            <div className="p-2 bg-base/90 border border-border rounded-xs text-[11px] font-mono text-txt-muted leading-tight">
              {searchStatus}
            </div>
          )}

          {searchResult && (
            <div
              className={`p-2 rounded-xs border text-[11px] space-y-1 ${
                searchResult.success
                  ? 'bg-accent/10 border-accent/50 text-txt'
                  : 'bg-surface border-border text-txt-muted'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className={searchResult.success ? 'text-accent' : 'text-txt'}>
                  {searchResult.success ? 'Target Reached' : 'Target Unreachable'}
                </span>
                {searchResult.bestCandidate && (
                  <span className="font-mono text-accent">
                    {formatBytes(searchResult.bestCandidate.size)}
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-tight">{searchResult.message}</p>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: DIMENSIONS (W, H, DPI, QUALITY SLIDER)        */}
        {/* ========================================================= */}
        <section className="space-y-2.5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-txt">Dimensions</span>
            {/* Unit selector: cm (default), in, px */}
            <div className="flex bg-base p-0.5 rounded-xs border border-border">
              {['cm', 'in', 'px'].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onUnitChange(u)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-xs transition-colors ${
                    unit === u ? 'bg-secondary text-accent font-bold shadow-xs' : 'text-txt-muted hover:text-txt'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Width, Aspect Lock, Height */}
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-1.5">
            <div>
              <label htmlFor="dim-w-val" className="block text-[10px] text-txt-muted mb-0.5">
                W ({unit})
              </label>
              <input
                id="dim-w-val"
                type="number"
                min="0.1"
                step={unit === 'px' ? '1' : '0.01'}
                value={dimensions.widthDisplay}
                onChange={handleWidthChange}
                className="w-full h-7 bg-base border border-border rounded-xs px-2 font-mono text-xs text-txt focus:border-accent outline-none"
              />
            </div>

            <div className="pt-3.5 flex justify-center">
              <button
                type="button"
                onClick={onToggleLockAspectRatio}
                title={lockAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                aria-label={lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                className={`p-1.5 rounded-xs border transition-colors ${
                  lockAspectRatio
                    ? 'bg-surface border-accent/50 text-accent'
                    : 'bg-base border-border text-txt-muted hover:text-txt'
                }`}
              >
                {lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div>
              <label htmlFor="dim-h-val" className="block text-[10px] text-txt-muted mb-0.5">
                H ({unit})
              </label>
              <input
                id="dim-h-val"
                type="number"
                min="0.1"
                step={unit === 'px' ? '1' : '0.01'}
                value={dimensions.heightDisplay}
                onChange={handleHeightChange}
                className="w-full h-7 bg-base border border-border rounded-xs px-2 font-mono text-xs text-txt focus:border-accent outline-none"
              />
            </div>
          </div>

          {/* DPI Input directly below Width and Height */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="dpi-field-input" className="text-[10px] font-medium text-txt-muted">
                DPI / PPI
              </label>
              <span className="font-mono text-[10px] text-txt-muted">
                = {dimensions.pixelWidth} × {dimensions.pixelHeight} px
              </span>
            </div>
            <div className="grid grid-cols-[1fr,64px] gap-1.5">
              <select
                id="dpi-field-select"
                value={dpi}
                onChange={(e) => onDpiChange(Number(e.target.value))}
                className="h-7 bg-base border border-border rounded-xs px-1.5 text-xs text-txt focus:border-accent outline-none"
              >
                <option value={300}>300  </option>
                <option value={150}>150 </option>
                <option value={96}>96</option>
                <option value={72}>72 </option>
              </select>
              <input
                id="dpi-field-input"
                type="number"
                min="1"
                max="1200"
                value={dpi}
                onChange={(e) => onDpiChange(Math.max(1, Number(e.target.value)))}
                className="h-7 bg-base border border-border rounded-xs px-1 font-mono text-xs text-center text-txt focus:border-accent outline-none"
                aria-label="Custom DPI"
              />
            </div>
          </div>

          {/* Quality Slider (moved into Dimensions section) */}
          {currentFormatMeta.lossy && (
            <div className="space-y-1 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between text-[10px]">
                <label htmlFor="dim-quality-range" className="text-txt-muted">
                  Compression Quality
                </label>
                <span className="font-mono text-txt font-semibold">{Math.round(quality * 100)}%</span>
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
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: OUTPUT FORMAT & CANVAS FITTING                 */}
        {/* ========================================================= */}
        <section className="space-y-2.5 pb-2">
          {/* Format selection */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-txt">Format</span>
            <div className="flex bg-base p-0.5 rounded-xs border border-border">
              {['image/webp', 'image/jpeg', 'image/png'].map((fmtId) => {
                const fMeta = SUPPORTED_FORMATS[Object.keys(SUPPORTED_FORMATS).find((k) => SUPPORTED_FORMATS[k].id === fmtId)];
                return (
                  <button
                    key={fmtId}
                    type="button"
                    onClick={() => onFormatChange(fmtId)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded-xs transition-colors ${
                      format === fmtId ? 'bg-secondary text-accent font-bold shadow-xs' : 'text-txt-muted hover:text-txt'
                    }`}
                  >
                    {fMeta.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canvas Fitting: Show ONLY names Fit and Fill, with Color swatch */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex bg-base p-0.5 rounded-xs border border-border">
              <button
                type="button"
                onClick={() => setFitMode('contain')}
                className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                  fitMode === 'contain' ? 'bg-secondary text-accent font-bold shadow-xs' : 'text-txt-muted hover:text-txt'
                }`}
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setFitMode('cover')}
                className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                  fitMode === 'cover' ? 'bg-secondary text-accent font-bold shadow-xs' : 'text-txt-muted hover:text-txt'
                }`}
              >
                Fill
              </button>
            </div>

            {/* Margin Color swatch input (no text label, defaults to white) */}
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={fillColor === 'transparent' ? '#FFFFFF' : fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="w-7 h-7 p-0 bg-base border border-border rounded-xs cursor-pointer shadow-xs"
                title="Canvas margin fill color"
                aria-label="Margin fill color"
              />
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================= */}
      {/* SECTION 4: DOWNLOAD ACTION (STICKY AT BOTTOM AT ALL TIMES) */}
      {/* ========================================================= */}
      <div className="p-3 bg-secondary border-t border-border shrink-0 z-10 sticky bottom-0 shadow-md">
        <div className="flex items-center justify-between text-[11px] text-txt-muted mb-1.5 px-0.5">
          <span>Result Size:</span>
          <span className="font-mono text-txt font-bold text-xs">
            {estimatedSize ? formatBytes(estimatedSize) : '—'}
          </span>
        </div>

        <button
          type="button"
          onClick={onDownload}
          disabled={isProcessing || isSearching || !originalMeta}
          className="w-full h-9 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>Download Image</span>
        </button>
      </div>
    </aside>
  );
}
