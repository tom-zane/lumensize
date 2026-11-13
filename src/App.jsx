import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import HistorySidebar from './components/HistorySidebar';
import Workspace from './components/Workspace';
import ControlPanel from './components/ControlPanel';
import SettingsModal from './components/SettingsModal';
import {
  loadImageFromBlob,
  processImage,
  downloadBlob,
  generateFilename,
  renderTransformedSource,
  SUPPORTED_FORMATS,
} from './utils/imageProcessor';
import { pxToUnit, unitToPx, toBytes, formatBytes } from './utils/units';
import { optimizeToTargetSize } from './utils/targetSizeOptimizer';

const SETTINGS_KEY = 'lumensize_settings_v4';
const THEME_KEY = 'lumensize_theme_v4';

const DEFAULT_SETTINGS = {
  defaultUnit: 'cm',
  defaultDpi: 72,
  defaultFormat: 'image/webp',
  defaultQuality: 0.85,
};

const ALL_THEME_IDS = [
  'theme-warm-paper',
  'theme-obsidian',
  'theme-clean-studio',
  'theme-nordic-slate',
  'theme-editorial-sage',
];

export default function App() {
  // Coordinated theme state
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) {
        if (ALL_THEME_IDS.includes(saved)) return saved;
        if (saved === 'dark') return 'theme-obsidian';
        if (saved === 'light') return 'theme-warm-paper';
      }
    } catch (e) {
      // ignore
    }
    return 'theme-obsidian';
  });

  useEffect(() => {
    const root = document.documentElement;
    ALL_THEME_IDS.forEach((id) => root.classList.remove(id));
    root.classList.remove('dark', 'light');

    root.classList.add(theme);
    const isDark =
      theme === 'theme-obsidian' ||
      theme === 'theme-nordic-slate' ||
      theme === 'theme-editorial-sage';
    root.classList.add(isDark ? 'dark' : 'light');

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  // Settings state
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // History timeline state (non-destructive)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  // Pristine source image (kept untouched)
  const [imgElement, setImgElement] = useState(null);
  const [originalMeta, setOriginalMeta] = useState(null);

  // Active transforms
  const [crop, setCrop] = useState(null);
  const [perspectiveQuad, setPerspectiveQuad] = useState(null);
  const [rotationAngle, setRotationAngle] = useState(0);

  // Tool active modes
  const [isCropActive, setIsCropActive] = useState(false);
  const [cropMode, setCropMode] = useState('rect'); // 'rect' | 'perspective'
  const [isRotateActive, setIsRotateActive] = useState(false);

  // Sizing & canvas margins
  const [unit, setUnit] = useState(settings.defaultUnit);
  const [dpi, setDpi] = useState(settings.defaultDpi);
  const [pixelWidth, setPixelWidth] = useState(1200);
  const [pixelHeight, setPixelHeight] = useState(800);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1200 / 800);
  const [fitMode, setFitMode] = useState('contain');
  const [fillColor, setFillColor] = useState('#FFFFFF');

  // Format & Quality
  const [format, setFormat] = useState(settings.defaultFormat);
  const [quality, setQuality] = useState(settings.defaultQuality);

  // Preview & output
  const [transformedBase, setTransformedBase] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewSize, setPreviewSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Target size optimizer state
  const [targetMin, setTargetMin] = useState('0');
  const [targetMax, setTargetMax] = useState('100');
  const [targetUnit, setTargetUnit] = useState('KB');
  const [allowScaling, setAllowScaling] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  // References
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const cancelSearchRef = useRef(false);

  // Memory cleanup
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // Update Settings
  const handleUpdateSettings = (newSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
    if (newSettings.defaultDpi) setDpi(newSettings.defaultDpi);
    if (newSettings.defaultUnit) setUnit(newSettings.defaultUnit);
    if (newSettings.defaultFormat) setFormat(newSettings.defaultFormat);
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {
      // ignore
    }
    setDpi(DEFAULT_SETTINGS.defaultDpi);
    setUnit(DEFAULT_SETTINGS.defaultUnit);
    setFormat(DEFAULT_SETTINGS.defaultFormat);
  };

  // -------------------------------------------------------------
  // RECOMPUTE TRANSFORMED BASE & PREVIEW
  // -------------------------------------------------------------
  const recomputeCanvas = useCallback(
    async (sourceImg, {
      pQuad = perspectiveQuad,
      cr = crop,
      rot = rotationAngle,
      w = pixelWidth,
      h = pixelHeight,
      fmt = format,
      q = quality,
      fMode = fitMode,
      fColor = fillColor,
    } = {}) => {
      if (!sourceImg) return null;

      const { canvas, width: baseW, height: baseH } = renderTransformedSource(sourceImg, {
        perspectiveQuad: pQuad,
        crop: cr,
        rotationAngle: rot,
        fillColor: fColor,
      });

      setTransformedBase(canvas);

      try {
        setIsProcessing(true);
        const res = await processImage(canvas, {
          width: w,
          height: h,
          format: fmt,
          quality: q,
          fitMode: fMode,
          fillColor: fColor,
        });

        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = res.objectUrl;

        setPreviewBlob(res.blob);
        setPreviewUrl(res.objectUrl);
        setPreviewSize(res.size);
        setIsProcessing(false);
      } catch (err) {
        setIsProcessing(false);
        console.error(err);
      }

      return canvas;
    },
    [perspectiveQuad, crop, rotationAngle, pixelWidth, pixelHeight, format, quality, fitMode, fillColor]
  );

  // Debounced preview update for sliders
  const triggerDebouncedPreview = useCallback(
    (w, h, fmt, q, fMode, fColor) => {
      if (!transformedBase) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setIsProcessing(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const res = await processImage(transformedBase, {
            width: w,
            height: h,
            format: fmt,
            quality: q,
            fitMode: fMode,
            fillColor: fColor,
          });

          if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
          }
          previewUrlRef.current = res.objectUrl;

          setPreviewBlob(res.blob);
          setPreviewUrl(res.objectUrl);
          setPreviewSize(res.size);
          setIsProcessing(false);
        } catch (err) {
          setIsProcessing(false);
          console.error(err);
        }
      }, 80);
    },
    [transformedBase]
  );

  // -------------------------------------------------------------
  // NON-DESTRUCTIVE HISTORY MANAGEMENT
  // -------------------------------------------------------------
  const recordHistory = useCallback(
    (label, snapshot) => {
      const step = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        label,
        timestamp: Date.now(),
        ...snapshot,
      };

      setHistory((prev) => {
        // Non-destructive: if user is in the past, append new action while preserving past
        const next = [...prev.slice(0, historyIndex + 1), step];
        return next;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const restoreHistoryStep = useCallback(
    (idx) => {
      if (idx < 0 || idx >= history.length || !imgElement) return;
      const step = history[idx];
      setHistoryIndex(idx);

      setCrop(step.crop);
      setPerspectiveQuad(step.perspectiveQuad);
      setRotationAngle(step.rotationAngle);
      setPixelWidth(step.pixelWidth);
      setPixelHeight(step.pixelHeight);
      setAspectRatio(step.pixelWidth / step.pixelHeight);
      setUnit(step.unit || 'px');
      setDpi(step.dpi || 72);
      setFormat(step.format);
      setQuality(step.quality);
      setFitMode(step.fitMode || 'contain');
      setFillColor(step.fillColor || '#FFFFFF');
      setSearchResult(null);
      setSearchStatus('');

      recomputeCanvas(imgElement, {
        pQuad: step.perspectiveQuad,
        cr: step.crop,
        rot: step.rotationAngle,
        w: step.pixelWidth,
        h: step.pixelHeight,
        fmt: step.format,
        q: step.quality,
        fMode: step.fitMode || 'contain',
        fColor: step.fillColor || '#FFFFFF',
      });
    },
    [history, imgElement, recomputeCanvas]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      restoreHistoryStep(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      restoreHistoryStep(historyIndex + 1);
    }
  };

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // -------------------------------------------------------------
  // IMAGE INGESTION (Starts with empty canvas)
  // -------------------------------------------------------------
  const handleLoadImage = async (file) => {
    if (!file) return;

    try {
      setIsProcessing(true);
      const img = await loadImageFromBlob(file);

      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      const ratio = origW / origH;

      setImgElement(img);
      setOriginalMeta({
        name: file.name,
        size: file.size,
        width: origW,
        height: origH,
        type: file.type,
        aspectRatio: ratio,
      });

      // Reset transformations
      setCrop(null);
      setPerspectiveQuad(null);
      setRotationAngle(0);
      setIsCropActive(false);
      setIsRotateActive(false);

      setPixelWidth(origW);
      setPixelHeight(origH);
      setAspectRatio(ratio);
      setLockAspectRatio(true);
      setUnit(settings.defaultUnit);
      setDpi(settings.defaultDpi);
      setFormat(settings.defaultFormat);
      setQuality(settings.defaultQuality);
      setFitMode('contain');
      setFillColor('#FFFFFF');

      setSearchResult(null);
      setSearchStatus('');

      const { canvas } = renderTransformedSource(img, { fillColor: '#FFFFFF' });
      setTransformedBase(canvas);

      const initial = await processImage(canvas, {
        width: origW,
        height: origH,
        format: settings.defaultFormat,
        quality: settings.defaultQuality,
        fitMode: 'contain',
        fillColor: '#FFFFFF',
      });

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = initial.objectUrl;

      setPreviewBlob(initial.blob);
      setPreviewUrl(initial.objectUrl);
      setPreviewSize(initial.size);
      setIsProcessing(false);

      // Record initial history step
      const initialStep = {
        id: `init-${Date.now()}`,
        label: 'Original Image',
        timestamp: Date.now(),
        crop: null,
        perspectiveQuad: null,
        rotationAngle: 0,
        pixelWidth: origW,
        pixelHeight: origH,
        unit: settings.defaultUnit,
        dpi: settings.defaultDpi,
        format: settings.defaultFormat,
        quality: settings.defaultQuality,
        fitMode: 'contain',
        fillColor: '#FFFFFF',
      };
      setHistory([initialStep]);
      setHistoryIndex(0);
    } catch (err) {
      setIsProcessing(false);
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // CROP & PERSPECTIVE ACTIONS
  // -------------------------------------------------------------
  const handleApplyRectCrop = (pixelCrop) => {
    setCrop(pixelCrop);
    setSearchResult(null);

    const { canvas, width: newW, height: newH } = renderTransformedSource(imgElement, {
      perspectiveQuad,
      crop: pixelCrop,
      rotationAngle,
      fillColor,
    });
    setTransformedBase(canvas);
    setPixelWidth(newW);
    setPixelHeight(newH);
    setAspectRatio(newW / newH);

    recomputeCanvas(imgElement, {
      cr: pixelCrop,
      w: newW,
      h: newH,
    });

    recordHistory(`Crop (${newW}×${newH})`, {
      crop: pixelCrop,
      perspectiveQuad,
      rotationAngle,
      pixelWidth: newW,
      pixelHeight: newH,
      unit,
      dpi,
      format,
      quality,
      fitMode,
      fillColor,
    });
  };

  const handleApplyPerspectiveQuad = (pixelCorners) => {
    setPerspectiveQuad(pixelCorners);
    setSearchResult(null);

    const { canvas, width: newW, height: newH } = renderTransformedSource(imgElement, {
      perspectiveQuad: pixelCorners,
      crop,
      rotationAngle,
      fillColor,
    });
    setTransformedBase(canvas);
    setPixelWidth(newW);
    setPixelHeight(newH);
    setAspectRatio(newW / newH);

    recomputeCanvas(imgElement, {
      pQuad: pixelCorners,
      w: newW,
      h: newH,
    });

    recordHistory('Perspective Correction', {
      crop,
      perspectiveQuad: pixelCorners,
      rotationAngle,
      pixelWidth: newW,
      pixelHeight: newH,
      unit,
      dpi,
      format,
      quality,
      fitMode,
      fillColor,
    });
  };

  const handleResetCrop = () => {
    setCrop(null);
    recomputeCanvas(imgElement, { cr: null });
    recordHistory('Reset Crop', {
      crop: null,
      perspectiveQuad,
      rotationAngle,
      pixelWidth,
      pixelHeight,
      unit,
      dpi,
      format,
      quality,
      fitMode,
      fillColor,
    });
  };

  const handleResetPerspective = () => {
    setPerspectiveQuad(null);
    recomputeCanvas(imgElement, { pQuad: null });
    recordHistory('Reset Perspective', {
      crop,
      perspectiveQuad: null,
      rotationAngle,
      pixelWidth,
      pixelHeight,
      unit,
      dpi,
      format,
      quality,
      fitMode,
      fillColor,
    });
  };

  // -------------------------------------------------------------
  // ROTATION ACTIONS (Smooth Drag Commit)
  // -------------------------------------------------------------
  const handleRotationCommit = (newAngle) => {
    setRotationAngle(newAngle);
    setSearchResult(null);

    const { canvas, width: newW, height: newH } = renderTransformedSource(imgElement, {
      perspectiveQuad,
      crop,
      rotationAngle: newAngle,
      fillColor,
    });
    setTransformedBase(canvas);
    setPixelWidth(newW);
    setPixelHeight(newH);
    setAspectRatio(newW / newH);

    recomputeCanvas(imgElement, {
      rot: newAngle,
      w: newW,
      h: newH,
    });

    recordHistory(`Rotate ${newAngle > 0 ? '+' : ''}${newAngle}°`, {
      crop,
      perspectiveQuad,
      rotationAngle: newAngle,
      pixelWidth: newW,
      pixelHeight: newH,
      unit,
      dpi,
      format,
      quality,
      fitMode,
      fillColor,
    });
  };

  const handleRotateStep = (deltaDeg) => {
    let next = ((rotationAngle + deltaDeg) % 360);
    if (next > 180) next -= 360;
    if (next < -180) next += 360;
    handleRotationCommit(next);
  };

  const handleResetRotation = () => {
    handleRotationCommit(0);
  };

  // -------------------------------------------------------------
  // DIMENSIONS & CONTROL PANEL ACTIONS
  // -------------------------------------------------------------
  const handleDimensionChange = (field, value) => {
    if (value === '' || isNaN(value) || value <= 0) return;

    let newW = pixelWidth;
    let newH = pixelHeight;

    if (field === 'width') {
      newW = unitToPx(value, unit, dpi);
      if (lockAspectRatio && aspectRatio > 0) {
        newH = Math.max(1, Math.round(newW / aspectRatio));
      }
    } else {
      newH = unitToPx(value, unit, dpi);
      if (lockAspectRatio && aspectRatio > 0) {
        newW = Math.max(1, Math.round(newH * aspectRatio));
      }
    }

    newW = Math.min(16384, Math.max(1, newW));
    newH = Math.min(16384, Math.max(1, newH));

    setPixelWidth(newW);
    setPixelHeight(newH);
    setSearchResult(null);

    triggerDebouncedPreview(newW, newH, format, quality, fitMode, fillColor);
  };

  const handleUnitChange = (newUnit) => {
    setUnit(newUnit);
  };

  const handleDpiChange = (newDpi) => {
    const validDpi = Math.max(1, Math.min(1200, newDpi));
    setDpi(validDpi);

    if (unit !== 'px') {
      const curDisplayW = pxToUnit(pixelWidth, unit, dpi);
      const newPxW = unitToPx(curDisplayW, unit, validDpi);
      const newPxH = lockAspectRatio
        ? Math.max(1, Math.round(newPxW / aspectRatio))
        : unitToPx(pxToUnit(pixelHeight, unit, dpi), unit, validDpi);

      setPixelWidth(newPxW);
      setPixelHeight(newPxH);
      triggerDebouncedPreview(newPxW, newPxH, format, quality, fitMode, fillColor);
    }
  };

  const handleToggleLock = () => {
    if (!lockAspectRatio && pixelHeight > 0) {
      setAspectRatio(pixelWidth / pixelHeight);
    }
    setLockAspectRatio((prev) => !prev);
  };

  const handleFormatChange = (newFmt) => {
    setFormat(newFmt);
    setSearchResult(null);
    triggerDebouncedPreview(pixelWidth, pixelHeight, newFmt, quality, fitMode, fillColor);
  };

  const handleQualityChange = (newQ) => {
    setQuality(newQ);
    setSearchResult(null);
    triggerDebouncedPreview(pixelWidth, pixelHeight, format, newQ, fitMode, fillColor);
  };

  const handleFitModeChange = (newMode) => {
    setFitMode(newMode);
    triggerDebouncedPreview(pixelWidth, pixelHeight, format, quality, newMode, fillColor);
  };

  const handleFillColorChange = (newColor) => {
    setFillColor(newColor);
    recomputeCanvas(imgElement, { fColor: newColor });
  };

  const handleResetAll = () => {
    if (!originalMeta || !imgElement) return;

    setCrop(null);
    setPerspectiveQuad(null);
    setRotationAngle(0);
    setIsCropActive(false);
    setIsRotateActive(false);

    setPixelWidth(originalMeta.width);
    setPixelHeight(originalMeta.height);
    setAspectRatio(originalMeta.aspectRatio);
    setLockAspectRatio(true);
    setUnit(settings.defaultUnit || 'cm');
    setDpi(settings.defaultDpi || 72);
    setFormat(settings.defaultFormat || 'image/webp');
    setQuality(settings.defaultQuality || 0.85);
    setFitMode('contain');
    setFillColor('#FFFFFF');

    setSearchResult(null);
    setSearchStatus('');

    const { canvas } = renderTransformedSource(imgElement, { fillColor: '#FFFFFF' });
    setTransformedBase(canvas);

    recomputeCanvas(imgElement, {
      pQuad: null,
      cr: null,
      rot: 0,
      w: originalMeta.width,
      h: originalMeta.height,
      fmt: settings.defaultFormat || 'image/webp',
      q: settings.defaultQuality || 0.85,
      fMode: 'contain',
      fColor: '#FFFFFF',
    });

    recordHistory('Reset All Edits', {
      crop: null,
      perspectiveQuad: null,
      rotationAngle: 0,
      pixelWidth: originalMeta.width,
      pixelHeight: originalMeta.height,
      unit: settings.defaultUnit || 'cm',
      dpi: settings.defaultDpi || 72,
      format: settings.defaultFormat || 'image/webp',
      quality: settings.defaultQuality || 0.85,
      fitMode: 'contain',
      fillColor: '#FFFFFF',
    });
  };

  // -------------------------------------------------------------
  // UNIFIED TARGET SIZE SEARCH (Binary Search & Auto Safe Padding)
  // -------------------------------------------------------------
  const handleStartTargetSearch = async () => {
    if (!transformedBase || isSearching) return;

    const minBytes = toBytes(targetMin, targetUnit);
    const maxBytes = toBytes(targetMax, targetUnit);

    if (maxBytes <= 0 || maxBytes < minBytes) {
      setSearchResult({
        success: false,
        message: 'Invalid size range: Max must be positive and greater than or equal to Min.',
      });
      return;
    }

    cancelSearchRef.current = false;
    setIsSearching(true);
    setSearchResult(null);
    setSearchStatus('Starting search...');

    const result = await optimizeToTargetSize({
      img: transformedBase,
      baseWidth: pixelWidth,
      baseHeight: pixelHeight,
      format,
      minBytes,
      maxBytes,
      allowDimensionScaling: allowScaling,
      fitMode,
      fillColor,
      onProgress: ({ step, candidate, status }) => {
        setSearchStatus(status);
        if (candidate?.objectUrl) {
          if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
          }
          previewUrlRef.current = candidate.objectUrl;
          setPreviewBlob(candidate.blob);
          setPreviewUrl(candidate.objectUrl);
          setPreviewSize(candidate.size);
          setPixelWidth(candidate.width);
          setPixelHeight(candidate.height);
          if (candidate.quality) setQuality(candidate.quality);
        }
      },
      shouldCancel: () => cancelSearchRef.current,
    });

    setIsSearching(false);
    setSearchResult(result);

    if (result.bestCandidate) {
      if (previewUrlRef.current && previewUrlRef.current !== result.bestCandidate.objectUrl) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = result.bestCandidate.objectUrl;
      setPreviewBlob(result.bestCandidate.blob);
      setPreviewUrl(result.bestCandidate.objectUrl);
      setPreviewSize(result.bestCandidate.size);
      setPixelWidth(result.bestCandidate.width);
      setPixelHeight(result.bestCandidate.height);
      setQuality(result.bestCandidate.quality);

      recordHistory(`Target Search: ${formatBytes(result.bestCandidate.size)}`, {
        crop,
        perspectiveQuad,
        rotationAngle,
        pixelWidth: result.bestCandidate.width,
        pixelHeight: result.bestCandidate.height,
        unit,
        dpi,
        format,
        quality: result.bestCandidate.quality,
        fitMode,
        fillColor,
      });
    }
  };

  const handleCancelTargetSearch = () => {
    cancelSearchRef.current = true;
    setIsSearching(false);
  };

  // -------------------------------------------------------------
  // DOWNLOAD ACTION (Exports exact previewed blob)
  // -------------------------------------------------------------
  const handleDownload = () => {
    if (!previewBlob) return;

    const filename = generateFilename(
      originalMeta?.name,
      pixelWidth,
      pixelHeight,
      format
    );
    downloadBlob(previewBlob, filename);
  };

  const displayDimensions = {
    pixelWidth,
    pixelHeight,
    widthDisplay: pxToUnit(pixelWidth, unit, dpi),
    heightDisplay: pxToUnit(pixelHeight, unit, dpi),
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden bg-base text-txt font-sans select-none ${theme}`}>
      {/* Hidden file picker input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleLoadImage(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Header bar */}
      <Header
        imageMeta={originalMeta}
        onOpenClick={() => fileInputRef.current?.click()}
        onResetAll={handleResetAll}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main workspace layout */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* Left History Sidebar (Timeline) */}
        <HistorySidebar
          history={history}
          currentIndex={historyIndex}
          onSelectStep={restoreHistoryStep}
          onUndo={handleUndo}
          onRedo={handleRedo}
          isCollapsed={isHistoryCollapsed}
          onToggleCollapse={() => setIsHistoryCollapsed((p) => !p)}
        />

        {/* Center Workspace & Right Control Panel */}
        <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Centered Image Canvas */}
          <Workspace
            previewUrl={previewUrl}
            dimensions={displayDimensions}
            previewSize={previewSize}
            originalMeta={originalMeta}
            isProcessing={isProcessing}
            onFileDrop={handleLoadImage}
            onOpenClick={() => fileInputRef.current?.click()}
            // Crop & Perspective
            isCropActive={isCropActive}
            setIsCropActive={setIsCropActive}
            cropMode={cropMode}
            setCropMode={setCropMode}
            appliedCrop={crop}
            onApplyCrop={handleApplyRectCrop}
            onCancelCrop={() => setIsCropActive(false)}
            onResetCrop={handleResetCrop}
            appliedPerspectiveQuad={perspectiveQuad}
            onApplyPerspective={handleApplyPerspectiveQuad}
            onResetPerspective={handleResetPerspective}
            // Rotation
            isRotateActive={isRotateActive}
            setIsRotateActive={setIsRotateActive}
            rotationAngle={rotationAngle}
            onRotationCommit={handleRotationCommit}
            onRotateStep={handleRotateStep}
            onResetRotation={handleResetRotation}
          />

          {/* Right Control Panel */}
          <ControlPanel
            dimensions={displayDimensions}
            onDimensionChange={handleDimensionChange}
            unit={unit}
            onUnitChange={handleUnitChange}
            dpi={dpi}
            onDpiChange={handleDpiChange}
            lockAspectRatio={lockAspectRatio}
            onToggleLockAspectRatio={handleToggleLock}
            format={format}
            onFormatChange={handleFormatChange}
            quality={quality}
            onQualityChange={handleQualityChange}
            estimatedSize={previewSize}
            isProcessing={isProcessing}
            onDownload={handleDownload}
            originalMeta={originalMeta}
            // Canvas Fit & Fill
            fitMode={fitMode}
            setFitMode={handleFitModeChange}
            fillColor={fillColor}
            setFillColor={handleFillColorChange}
            // Target File Size Search
            targetMin={targetMin}
            setTargetMin={setTargetMin}
            targetMax={targetMax}
            setTargetMax={setTargetMax}
            targetUnit={targetUnit}
            setTargetUnit={setTargetUnit}
            allowScaling={allowScaling}
            setAllowScaling={setAllowScaling}
            isSearching={isSearching}
            searchStatus={searchStatus}
            searchResult={searchResult}
            onStartSearch={handleStartTargetSearch}
            onCancelSearch={handleCancelTargetSearch}
          />
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentThemeId={theme}
        onSelectTheme={setTheme}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
      />
    </div>
  );
}
