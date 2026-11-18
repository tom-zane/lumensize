import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Crop as CropIcon,
  Compass,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Upload,
  ArrowLeftRight,
  Maximize2,
  Sparkles,
  Columns,
  Image as ImageIcon,
  FileText,
  Layers,
} from 'lucide-react';
import { formatBytes } from '../utils/units';
import { SAMPLE_PRESETS } from '../utils/sampleImages';

const CROP_RATIO_PRESETS = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '3:4', label: '3:4', ratio: 3 / 4, invLabel: '4:3' },
  { id: '5:7', label: '5:7', ratio: 5 / 7, invLabel: '7:5' },
  { id: '2:3', label: '2:3', ratio: 2 / 3, invLabel: '3:2' },
  { id: '4:5', label: '4:5', ratio: 4 / 5, invLabel: '5:4' },
  { id: '9:16', label: '9:16', ratio: 9 / 16, invLabel: '16:9' },
  { id: '16:9', label: '16:9', ratio: 16 / 9, invLabel: '9:16' },
];

export default function Workspace({
  previewUrl,
  originalUrl,
  dimensions,
  previewSize,
  originalMeta,
  isProcessing,
  onFileDrop,
  onOpenClick,
  onSelectSample,
  // Crop & Perspective
  isCropActive,
  setIsCropActive,
  cropMode, // 'rect' | 'perspective'
  setCropMode,
  appliedCrop,
  onApplyCrop,
  onCancelCrop,
  appliedPerspectiveQuad,
  onApplyPerspectiveQuad,
  // Aspect ratio preset for crop box
  aspectRatio,
  lockAspectRatio,
  onSwapCropOrientation,
  // Rotation
  isRotateActive,
  setIsRotateActive,
  rotationAngle,
  onRotateStep,
  onRotateCommit,
  onRotateCancel,
}) {
  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const imgRef = useRef(null);

  // Available viewport dimensions
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  // Zoom & Pan state
  const [isFit, setIsFit] = useState(true);
  const [zoomMultiplier, setZoomMultiplier] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Before/After Split Compare state
  const [isCompareActive, setIsCompareActive] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // Multi-touch pinch-to-zoom & pan tracking
  const activePointersRef = useRef(new Map());
  const pinchStateRef = useRef(null);
  const isPinching = useRef(false);
  const isWheelZooming = useRef(false);
  const wheelZoomTimer = useRef(null);

  // Synchronized transform state ref for non-passive DOM event listeners
  const transformRef = useRef({
    pan: { x: 0, y: 0 },
    zoomMultiplier: 1,
    isFit: true,
    fitScale: 1,
    effectiveScale: 1,
  });

  // Interactive Rectangular Crop box (normalized 0..1 relative to stage)
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const [activeHandle, setActiveHandle] = useState(null);
  const [cropAspect, setCropAspect] = useState(null);
  const [isCropFlipped, setIsCropFlipped] = useState(false);
  const cropStartRef = useRef(null);

  const snapCropBoxToRatio = useCallback(
    (targetRatio) => {
      if (!originalMeta || !targetRatio || targetRatio <= 0) return;
      const imgRatio = originalMeta.width / originalMeta.height;
      const desiredBoxRatio = targetRatio / imgRatio;

      setCropBox((prev) => {
        let w = prev.width;
        let h = w / desiredBoxRatio;
        if (h > 1) {
          h = 1;
          w = h * desiredBoxRatio;
        }
        if (w > 1) {
          w = 1;
          h = w / desiredBoxRatio;
        }
        const x = Math.max(0, Math.min(1 - w, (1 - w) / 2));
        const y = Math.max(0, Math.min(1 - h, (1 - h) / 2));
        return { x, y, width: w, height: h };
      });
    },
    [originalMeta]
  );

  const handleSelectCropRatio = useCallback(
    (preset) => {
      if (!preset.ratio) {
        setCropAspect(null);
        return;
      }
      const targetRatio = isCropFlipped && preset.ratio !== 1 ? 1 / preset.ratio : preset.ratio;
      setCropAspect(targetRatio);
      snapCropBoxToRatio(targetRatio);
    },
    [isCropFlipped, snapCropBoxToRatio]
  );

  const handleSwapCropOrientation = useCallback(() => {
    setIsCropFlipped((prev) => !prev);
    if (cropAspect) {
      const inverted = 1 / cropAspect;
      setCropAspect(inverted);
      snapCropBoxToRatio(inverted);
    } else if (originalMeta) {
      const curPxW = cropBox.width * originalMeta.width;
      const curPxH = cropBox.height * originalMeta.height;
      if (curPxW > 0 && curPxH > 0) {
        const targetRatio = curPxH / curPxW;
        snapCropBoxToRatio(targetRatio);
      }
    }
  }, [cropAspect, originalMeta, cropBox.width, cropBox.height, snapCropBoxToRatio]);

  // Interactive Perspective 4-corner Quad (normalized 0..1 relative to stage)
  const [quadPins, setQuadPins] = useState([
    { x: 0.05, y: 0.05 }, // top-left
    { x: 0.95, y: 0.05 }, // top-right
    { x: 0.95, y: 0.95 }, // bottom-right
    { x: 0.05, y: 0.95 }, // bottom-left
  ]);
  const [activePin, setActivePin] = useState(null);

  // Live rotation ruler drag
  const [liveAngle, setLiveAngle] = useState(rotationAngle);
  const isRulerDraggingRef = useRef(false);
  const rulerStartRef = useRef({ clientX: 0, initialAngle: 0 });

  useEffect(() => {
    setLiveAngle(rotationAngle);
  }, [rotationAngle]);

  // Keep viewport size measured
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const updateSize = () => {
      setViewportSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute base canvas dimensions
  const imgW = dimensions?.pixelWidth || originalMeta?.width || 1200;
  const imgH = dimensions?.pixelHeight || originalMeta?.height || 800;

  // Fit scale calculation
  const paddingMargin = 48;
  const availableW = Math.max(10, viewportSize.width - paddingMargin);
  const availableH = Math.max(10, viewportSize.height - paddingMargin);
  const rawFitScale = Math.min(availableW / imgW, availableH / imgH);
  const fitScale = Number.isFinite(rawFitScale) && rawFitScale > 0 ? rawFitScale : 1;

  // Effective scale
  const effectiveScale = isFit ? fitScale : fitScale * zoomMultiplier;

  // Update transformRef for non-passive listeners
  useEffect(() => {
    transformRef.current = {
      pan,
      zoomMultiplier,
      isFit,
      fitScale,
      effectiveScale,
    };
  }, [pan, zoomMultiplier, isFit, fitScale, effectiveScale]);

  // On new image load, reset to Fit view with pan centered
  useEffect(() => {
    setIsFit(true);
    setZoomMultiplier(1);
    setPan({ x: 0, y: 0 });
    setIsCompareActive(false);
  }, [previewUrl]);

  // Sync crop / perspective state when tool opens
  useEffect(() => {
    if (isCropActive) {
      if (appliedCrop && originalMeta) {
        setCropBox({
          x: appliedCrop.x / originalMeta.width,
          y: appliedCrop.y / originalMeta.height,
          width: appliedCrop.width / originalMeta.width,
          height: appliedCrop.height / originalMeta.height,
        });
      } else {
        setCropBox({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
      }

      if (appliedPerspectiveQuad && originalMeta) {
        setQuadPins(
          appliedPerspectiveQuad.map((p) => ({
            x: p.x / originalMeta.width,
            y: p.y / originalMeta.height,
          }))
        );
      } else {
        setQuadPins([
          { x: 0.05, y: 0.05 },
          { x: 0.95, y: 0.05 },
          { x: 0.95, y: 0.95 },
          { x: 0.05, y: 0.95 },
        ]);
      }
    }
  }, [isCropActive, appliedCrop, appliedPerspectiveQuad, originalMeta]);

  // -------------------------------------------------------------
  // CURSOR-ANCHORED ZOOMING ROUTINE
  // -------------------------------------------------------------
  const zoomAtPoint = useCallback((clientX, clientY, zoomDelta) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const Px = clientX - rect.left;
    const Py = clientY - rect.top;
    const Vw = rect.width;
    const Vh = rect.height;

    const {
      pan: curPan,
      effectiveScale: curScale,
      fitScale: curFitScale,
    } = transformRef.current;

    const minScale = curFitScale * 0.1;
    const maxScale = Math.max(10, curFitScale * 25);
    const rawNewScale = curScale * zoomDelta;
    const newScale = Math.min(maxScale, Math.max(minScale, rawNewScale));

    const scaleRatio = newScale / curScale;
    const newPanX = (Px - Vw / 2) - (Px - Vw / 2 - curPan.x) * scaleRatio;
    const newPanY = (Py - Vh / 2) - (Py - Vh / 2 - curPan.y) * scaleRatio;

    const newMultiplier = curFitScale > 0 ? newScale / curFitScale : 1;

    isWheelZooming.current = true;
    if (wheelZoomTimer.current) clearTimeout(wheelZoomTimer.current);
    wheelZoomTimer.current = setTimeout(() => {
      isWheelZooming.current = false;
    }, 120);

    setIsFit(false);
    setZoomMultiplier(Number(newMultiplier.toFixed(4)));
    setPan({
      x: Number(newPanX.toFixed(2)),
      y: Number(newPanY.toFixed(2)),
    });
  }, []);

  // -------------------------------------------------------------
  // NON-PASSIVE WHEEL LISTENER (Ctrl+Scroll / Pinch to Zoom)
  // -------------------------------------------------------------
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const zoomFactor = Math.exp(-e.deltaY * 0.006);
        zoomAtPoint(e.clientX, e.clientY, zoomFactor);
      }
    };

    const preventGesture = (e) => {
      e.preventDefault();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('gesturestart', preventGesture, { passive: false });
    el.addEventListener('gesturechange', preventGesture, { passive: false });
    el.addEventListener('gestureend', preventGesture, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('gesturestart', preventGesture);
      el.removeEventListener('gesturechange', preventGesture);
      el.removeEventListener('gestureend', preventGesture);
    };
  }, [zoomAtPoint]);

  // Zoom button actions
  const handleZoomIn = useCallback(() => {
    const el = viewportRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.25);
    } else {
      setIsFit(false);
      setZoomMultiplier((prev) => Math.min(10, Number((prev * 1.25).toFixed(2))));
    }
  }, [zoomAtPoint]);

  const handleZoomOut = useCallback(() => {
    const el = viewportRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.8);
    } else {
      setIsFit(false);
      setZoomMultiplier((prev) => Math.max(0.1, Number((prev * 0.8).toFixed(2))));
    }
  }, [zoomAtPoint]);

  const handleZoomFit = useCallback(() => {
    setIsFit(true);
    setZoomMultiplier(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomActual = useCallback(() => {
    setIsFit(false);
    setZoomMultiplier(fitScale > 0 ? Number((1 / fitScale).toFixed(2)) : 1);
    setPan({ x: 0, y: 0 });
  }, [fitScale]);

  // Keyboard zoom enhancement (Ctrl + +, Ctrl + -, Ctrl + 0)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleZoomFit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomFit]);

  // -------------------------------------------------------------
  // UNIFIED POINTER & TOUCH PINCH-TO-ZOOM / PAN HANDLING
  // -------------------------------------------------------------
  const handlePointerDown = (e) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      if (isCropActive) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
    } else if (activePointersRef.current.size === 2) {
      setIsPanning(false);
      isPinching.current = true;
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };

      pinchStateRef.current = {
        initialDist: Math.max(10, dist),
        initialScale: transformRef.current.effectiveScale,
        initialPan: { ...transformRef.current.pan },
        initialMid: mid,
      };
    }
  };

  const handlePointerMove = (e) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle Split Compare dragging
    if (isDraggingSplit && stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const pct = Math.min(100, Math.max(0, (relativeX / rect.width) * 100));
      setSplitPercent(Number(pct.toFixed(1)));
      return;
    }

    if (activePointersRef.current.size === 2 && pinchStateRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const curMid = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };

      const { initialDist, initialScale, initialPan, initialMid } = pinchStateRef.current;
      const curFitScale = transformRef.current.fitScale;
      const pinchRatio = curDist / initialDist;

      const minScale = curFitScale * 0.1;
      const maxScale = Math.max(10, curFitScale * 25);
      const newScale = Math.min(maxScale, Math.max(minScale, initialScale * pinchRatio));

      const el = viewportRef.current;
      if (!el) return;
      const vRect = el.getBoundingClientRect();

      const Px = initialMid.x - vRect.left;
      const Py = initialMid.y - vRect.top;
      const Vw = vRect.width;
      const Vh = vRect.height;

      const scaleRatio = newScale / initialScale;
      const panScaledX = (Px - Vw / 2) - (Px - Vw / 2 - initialPan.x) * scaleRatio;
      const panScaledY = (Py - Vh / 2) - (Py - Vh / 2 - initialPan.y) * scaleRatio;

      const deltaMidX = curMid.x - initialMid.x;
      const deltaMidY = curMid.y - initialMid.y;

      const finalPanX = panScaledX + deltaMidX;
      const finalPanY = panScaledY + deltaMidY;

      const newMultiplier = curFitScale > 0 ? newScale / curFitScale : 1;

      setIsFit(false);
      setZoomMultiplier(Number(newMultiplier.toFixed(4)));
      setPan({
        x: Number(finalPanX.toFixed(2)),
        y: Number(finalPanY.toFixed(2)),
      });
    } else if (activePointersRef.current.size === 1 && isPanning && !isCropActive) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handlePointerUp = (e) => {
    activePointersRef.current.delete(e.pointerId);
    if (isDraggingSplit) setIsDraggingSplit(false);

    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = null;
      isPinching.current = false;
    }

    if (activePointersRef.current.size === 1 && !isCropActive) {
      const remaining = activePointersRef.current.values().next().value;
      panStartRef.current = {
        x: remaining.x - transformRef.current.pan.x,
        y: remaining.y - transformRef.current.pan.y,
      };
      setIsPanning(true);
    } else if (activePointersRef.current.size === 0) {
      setIsPanning(false);
    }
  };

  const handlePointerCancel = (e) => {
    handlePointerUp(e);
  };

  // Drag and Drop files onto workspace
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files[0]);
    }
  };

  // -------------------------------------------------------------
  // RECTANGULAR CROP BOX HANDLERS
  // -------------------------------------------------------------
  const handleBoxDragStart = (e, handle) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveHandle(handle);
    cropStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialBox: { ...cropBox },
      stageW: imgW * effectiveScale,
      stageH: imgH * effectiveScale,
    };
  };

  const handleQuadPinDown = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    setActivePin(index);
  };

  useEffect(() => {
    if (!activeHandle && activePin === null) return;

    const handlePointerMoveGlobal = (e) => {
      if (activeHandle && cropStartRef.current) {
        const { clientX, clientY, initialBox, stageW, stageH } = cropStartRef.current;
        const dx = (e.clientX - clientX) / stageW;
        const dy = (e.clientY - clientY) / stageH;

        let next = { ...initialBox };

        if (activeHandle === 'move') {
          next.x = Math.max(0, Math.min(1 - next.width, initialBox.x + dx));
          next.y = Math.max(0, Math.min(1 - next.height, initialBox.y + dy));
        } else {
          if (activeHandle.includes('e')) {
            next.width = Math.max(0.05, Math.min(1 - next.x, initialBox.width + dx));
          }
          if (activeHandle.includes('s')) {
            next.height = Math.max(0.05, Math.min(1 - next.y, initialBox.height + dy));
          }
          if (activeHandle.includes('w')) {
            const rawW = initialBox.width - dx;
            const clampedW = Math.max(0.05, Math.min(initialBox.x + initialBox.width, rawW));
            next.x = initialBox.x + (initialBox.width - clampedW);
            next.width = clampedW;
          }
          if (activeHandle.includes('n')) {
            const rawH = initialBox.height - dy;
            const clampedH = Math.max(0.05, Math.min(initialBox.y + initialBox.height, rawH));
            next.y = initialBox.y + (initialBox.height - clampedH);
            next.height = clampedH;
          }

          if (cropAspect && originalMeta) {
            const imgRatio = originalMeta.width / originalMeta.height;
            const desiredBoxRatio = cropAspect / imgRatio;
            if (activeHandle.includes('e') || activeHandle.includes('w')) {
              next.height = Math.max(0.05, Math.min(1 - next.y, next.width / desiredBoxRatio));
            } else {
              next.width = Math.max(0.05, Math.min(1 - next.x, next.height * desiredBoxRatio));
            }
          }
        }
        setCropBox(next);
      } else if (activePin !== null && stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        setQuadPins((prev) => {
          const next = [...prev];
          next[activePin] = { x: normX, y: normY };
          return next;
        });
      }
    };

    const handlePointerUpGlobal = () => {
      setActiveHandle(null);
      setActivePin(null);
    };

    window.addEventListener('pointermove', handlePointerMoveGlobal);
    window.addEventListener('pointerup', handlePointerUpGlobal);
    return () => {
      window.removeEventListener('pointermove', handlePointerMoveGlobal);
      window.removeEventListener('pointerup', handlePointerUpGlobal);
    };
  }, [activeHandle, activePin, imgW, imgH, effectiveScale, cropAspect, originalMeta]);

  // Apply crop box to image
  const commitCropBox = () => {
    if (!originalMeta) return;
    const pixelCrop = {
      x: Math.round(cropBox.x * originalMeta.width),
      y: Math.round(cropBox.y * originalMeta.height),
      width: Math.round(cropBox.width * originalMeta.width),
      height: Math.round(cropBox.height * originalMeta.height),
    };
    onApplyCrop(pixelCrop);
    setIsCropActive(false);
  };

  const commitPerspectiveQuad = () => {
    if (!originalMeta) return;
    const pixelCorners = quadPins.map((p) => ({
      x: Math.round(p.x * originalMeta.width),
      y: Math.round(p.y * originalMeta.height),
    }));
    onApplyPerspectiveQuad(pixelCorners);
    setIsCropActive(false);
  };

  // Rotation Ruler Drag
  const handleRulerPointerDown = (e) => {
    isRulerDraggingRef.current = true;
    rulerStartRef.current = {
      clientX: e.clientX,
      initialAngle: liveAngle,
    };
  };

  useEffect(() => {
    const handleRulerMove = (e) => {
      if (!isRulerDraggingRef.current) return;
      const dx = e.clientX - rulerStartRef.current.clientX;
      const angleDelta = Math.round((dx / 300) * 90);
      let newA = rulerStartRef.current.initialAngle + angleDelta;
      newA = Math.max(-180, Math.min(180, newA));
      setLiveAngle(newA);
    };

    const handleRulerUp = () => {
      if (isRulerDraggingRef.current) {
        isRulerDraggingRef.current = false;
        onRotateCommit(liveAngle);
      }
    };

    window.addEventListener('pointermove', handleRulerMove);
    window.addEventListener('pointerup', handleRulerUp);
    return () => {
      window.removeEventListener('pointermove', handleRulerMove);
      window.removeEventListener('pointerup', handleRulerUp);
    };
  }, [liveAngle, onRotateCommit]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col h-full min-w-0 bg-canvas relative overflow-hidden select-none ${
        isDragOver ? 'ring-2 ring-accent ring-inset' : ''
      }`}
    >
      {/* Top compact workspace toolbar */}
      <div className="h-9 bg-surface border-b border-subtle px-3 flex items-center justify-between text-xs text-txt shrink-0 z-20">
        <div className="flex items-center gap-1.5">
          {/* Tools: Crop & Rotate */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setIsCropActive((prev) => !prev);
                if (!isCropActive) setIsRotateActive(false);
              }}
              disabled={!previewUrl}
              className={`h-7 px-2.5 rounded-control border flex items-center gap-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                isCropActive
                  ? 'bg-accent text-accent-foreground border-accent font-semibold'
                  : appliedCrop || appliedPerspectiveQuad
                  ? 'bg-surface text-accent border-accent/40'
                  : 'bg-elevated text-txt border-subtle hover:bg-surface'
              }`}
              title="Crop and Perspective correction"
            >
              <CropIcon className="w-3.5 h-3.5" />
              <span>Crop & Perspective</span>
              {(appliedCrop || appliedPerspectiveQuad) && !isCropActive && (
                <span className="text-[10px] text-accent">•</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRotateActive((prev) => !prev);
                if (!isRotateActive) setIsCropActive(false);
              }}
              disabled={!previewUrl}
              className={`h-7 px-2.5 rounded-control border flex items-center gap-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                isRotateActive
                  ? 'bg-accent text-accent-foreground border-accent font-semibold'
                  : rotationAngle !== 0
                  ? 'bg-surface text-accent border-accent/40'
                  : 'bg-elevated text-txt border-subtle hover:bg-surface'
              }`}
              title="Rotate image"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Rotate</span>
              {rotationAngle !== 0 && (
                <span className="font-mono text-[10px] text-accent">{rotationAngle}°</span>
              )}
            </button>

            {/* Quick 90 deg steppers */}
            <button
              type="button"
              onClick={() => onRotateStep(-90)}
              disabled={!previewUrl}
              className="h-7 w-7 rounded-control bg-elevated hover:bg-surface border border-subtle flex items-center justify-center text-txt-muted hover:text-txt disabled:opacity-40 transition-colors"
              title="Rotate -90°"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onRotateStep(90)}
              disabled={!previewUrl}
              className="h-7 w-7 rounded-control bg-elevated hover:bg-surface border border-subtle flex items-center justify-center text-txt-muted hover:text-txt disabled:opacity-40 transition-colors"
              title="Rotate +90°"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right status */}
        <div className="flex items-center gap-2 text-[11px] text-txt-muted">
          {isProcessing && (
            <span className="text-accent text-[11px] font-medium animate-pulse flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-spin" />
              <span>Rendering...</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`flex-1 w-full h-full relative overflow-hidden select-none canvas-viewport-interactive ${
          previewUrl ? 'canvas-checkerboard' : 'bg-canvas'
        } ${
          isCropActive ? 'cursor-default' : !isFit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {previewUrl ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* The Transformed Stage: Centered canvas artwork */}
            <div
              ref={stageRef}
              style={{
                width: `${imgW}px`,
                height: `${imgH}px`,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale})`,
                transformOrigin: 'center center',
              }}
              className="relative pointer-events-auto shadow-floating canvas-stage-transform"
            >
              {/* Processed Output Image */}
              <img
                ref={imgRef}
                src={previewUrl}
                alt="Canvas preview"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  userSelect: 'none',
                }}
                draggable={false}
              />

              {/* Before/After Split Comparison Overlay */}
              {isCompareActive && originalUrl && (
                <>
                  {/* Clipped Original Source Image */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{
                      clipPath: `inset(0 ${100 - splitPercent}% 0 0)`,
                    }}
                  >
                    <img
                      src={originalUrl}
                      alt="Original source compare"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                      }}
                      draggable={false}
                    />
                  </div>

                  {/* Vertical Hairline Split Divider & Drag Pill */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-accent shadow-floating cursor-ew-resize pointer-events-auto z-20 flex items-center justify-center -translate-x-[1px]"
                    style={{ left: `${splitPercent}%` }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setIsDraggingSplit(true);
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-floating border-2 border-surface text-[10px] font-bold">
                      <ArrowLeftRight className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Badges: BEFORE & AFTER */}
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-xs text-white rounded-control font-mono text-[10px] font-bold tracking-wider z-20">
                    ORIGINAL
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-xs text-accent rounded-control font-mono text-[10px] font-bold tracking-wider z-20">
                    OPTIMIZED
                  </div>
                </>
              )}

              {/* RECTANGULAR CROP OVERLAY */}
              {isCropActive && cropMode === 'rect' && (
                <div
                  className="absolute inset-0 pointer-events-auto"
                  style={{ width: '100%', height: '100%' }}
                >
                  <div
                    className="absolute border-2 border-accent shadow-floating cursor-move"
                    style={{
                      left: `${cropBox.x * 100}%`,
                      top: `${cropBox.y * 100}%`,
                      width: `${cropBox.width * 100}%`,
                      height: `${cropBox.height * 100}%`,
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                    }}
                    onPointerDown={(e) => handleBoxDragStart(e, 'move')}
                  >
                    {/* Rules of Thirds Gridlines */}
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                      <div className="border-r border-b border-accent/40" />
                      <div className="border-r border-b border-accent/40" />
                      <div className="border-b border-accent/40" />
                      <div className="border-r border-b border-accent/40" />
                      <div className="border-r border-b border-accent/40" />
                      <div className="border-b border-accent/40" />
                      <div className="border-r border-accent/40" />
                      <div className="border-r border-accent/40" />
                      <div />
                    </div>

                    {/* Corner & Edge Drag Handles */}
                    {['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].map((h) => {
                      const posClass = {
                        nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
                        ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
                        se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
                        sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
                        n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
                        s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
                        e: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
                        w: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
                      }[h];

                      const isCorner = ['nw', 'ne', 'se', 'sw'].includes(h);

                      return (
                        <div
                          key={h}
                          onPointerDown={(e) => handleBoxDragStart(e, h)}
                          className={`absolute ${posClass} bg-accent border-2 border-surface shadow-floating ${
                            isCorner ? 'w-4 h-4 rounded-control' : 'w-3 h-3 rounded-full'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PERSPECTIVE QUAD OVERLAY */}
              {isCropActive && cropMode === 'perspective' && (
                <div
                  className="absolute inset-0 pointer-events-auto"
                  style={{ width: '100%', height: '100%' }}
                >
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <polygon
                      points={quadPins.map((p) => `${p.x * imgW},${p.y * imgH}`).join(' ')}
                      fill="rgba(56, 189, 248, 0.16)"
                      stroke="var(--theme-accent-primary)"
                      strokeWidth="2"
                    />
                  </svg>

                  {quadPins.map((pin, i) => {
                    const labels = ['TL', 'TR', 'BR', 'BL'];
                    return (
                      <div
                        key={i}
                        onPointerDown={(e) => handleQuadPinDown(e, i)}
                        className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 bg-accent text-accent-foreground border-2 border-surface rounded-full shadow-floating flex items-center justify-center font-bold text-[10px] cursor-crosshair z-30 hover:scale-125 transition-transform"
                        style={{
                          left: `${pin.x * 100}%`,
                          top: `${pin.y * 100}%`,
                        }}
                        title={`Drag ${labels[i]} pin`}
                      >
                        {labels[i]}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ARCHITECTURAL EMPTY STATE DROPZONE */
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
            <div className="relative w-full max-w-xl p-6 sm:p-10 rounded-panel bg-surface/90 backdrop-blur-glass border border-subtle shadow-floating text-center">
              {/* Corner Registration Reticles */}
              <div className="corner-reticle top-3 left-3 border-t-2 border-l-2" />
              <div className="corner-reticle top-3 right-3 border-t-2 border-r-2" />
              <div className="corner-reticle bottom-3 left-3 border-b-2 border-l-2" />
              <div className="corner-reticle bottom-3 right-3 border-b-2 border-r-2" />

              {/* Main Upload Icon & Heading */}
              <div className="w-12 h-12 mx-auto mb-4 rounded-control bg-accent/15 border border-accent/40 flex items-center justify-center text-accent shadow-xs">
                <Upload className="w-6 h-6" />
              </div>

              <h2 className="font-heading font-bold text-base text-txt mb-1">
                Precision Image Resizer & Optimizer
              </h2>
              <p className="text-xs text-txt-muted max-w-md mx-auto mb-5 leading-relaxed">
                Drag and drop high-resolution images, browse your device, or paste from your clipboard (<code className="font-mono text-accent">Ctrl+V</code>).
              </p>

              <button
                type="button"
                onClick={onOpenClick}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-accent-foreground text-xs font-semibold rounded-control shadow-xs transition-colors mb-6"
              >
                Choose Image File
              </button>

              {/* Sample Images Section */}
              <div className="pt-5 border-t border-subtle">
                <div className="text-[10px] font-mono uppercase tracking-wider text-txt-muted mb-3">
                  Or test presets with sample assets
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
                  {SAMPLE_PRESETS.map((sample) => {
                    const iconMap = {
                      photo: <ImageIcon className="w-4 h-4 text-accent" />,
                      document: <FileText className="w-4 h-4 text-accent" />,
                      graphic: <Layers className="w-4 h-4 text-accent" />,
                    };

                    return (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => onSelectSample && onSelectSample(sample.id)}
                        className="p-2.5 rounded-control border border-subtle bg-elevated hover:bg-surface hover:border-strong transition-all flex flex-col justify-between group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="p-1 rounded-control bg-accent/10">{iconMap[sample.id]}</span>
                          <span className="font-mono text-[9px] text-txt-muted">{sample.aspect}</span>
                        </div>
                        <div>
                          <h4 className="font-heading font-semibold text-xs text-txt group-hover:text-accent transition-colors">
                            {sample.title}
                          </h4>
                          <p className="text-[10px] text-txt-muted line-clamp-1">
                            {sample.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Crop / Perspective action bar */}
      {isCropActive && previewUrl && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 max-w-[95vw] bg-surface/95 backdrop-blur-glass border border-subtle shadow-floating p-1.5 sm:px-3 sm:py-2 rounded-panel flex flex-col sm:flex-row items-center gap-2 text-xs">
          <div className="flex bg-elevated p-0.5 rounded-control border border-subtle shrink-0">
            <button
              type="button"
              onClick={() => setCropMode('rect')}
              className={`px-2.5 py-1 text-[11px] rounded-control font-medium transition-colors ${
                cropMode === 'rect' ? 'bg-surface text-accent font-semibold shadow-xs' : 'text-txt-muted hover:text-txt'
              }`}
            >
              Rectangular Box
            </button>
            <button
              type="button"
              onClick={() => setCropMode('perspective')}
              className={`px-2.5 py-1 text-[11px] rounded-control font-medium transition-colors ${
                cropMode === 'perspective' ? 'bg-surface text-accent font-semibold shadow-xs' : 'text-txt-muted hover:text-txt'
              }`}
            >
              4-Corner Perspective
            </button>
          </div>

          {cropMode === 'rect' && (
            <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5">
              <div className="w-[1px] h-4 bg-border/40 mx-0.5 hidden sm:block shrink-0" />
              <div className="flex items-center gap-1 shrink-0">
                {CROP_RATIO_PRESETS.map((p) => {
                  const targetR = p.ratio ? (isCropFlipped && p.ratio !== 1 ? 1 / p.ratio : p.ratio) : null;
                  const isSelected =
                    p.id === 'free'
                      ? cropAspect === null
                      : cropAspect !== null && targetR !== null && Math.abs(cropAspect - targetR) < 0.005;
                  const displayLabel = isCropFlipped && p.invLabel ? p.invLabel : p.label;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectCropRatio(p)}
                      className={`px-2 py-0.5 rounded-control text-[11px] font-mono transition-all ${
                        isSelected
                          ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                          : 'bg-elevated hover:bg-surface text-txt-muted hover:text-txt border border-subtle'
                      }`}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleSwapCropOrientation}
                className="px-2 py-0.5 rounded-control bg-elevated hover:bg-surface border border-subtle text-txt-muted hover:text-txt text-[11px] flex items-center gap-1 transition-colors shrink-0 ml-1"
                title="Swap Crop Orientation (Portrait / Landscape)"
              >
                <ArrowLeftRight className="w-3 h-3 text-accent" />
                <span className="hidden md:inline">Swap</span>
              </button>
            </div>
          )}

          <div className="w-[1px] h-4 bg-border/40 mx-0.5 hidden sm:block shrink-0" />

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={cropMode === 'rect' ? commitCropBox : commitPerspectiveQuad}
              className="px-3 py-1 bg-accent hover:bg-accent-hover text-accent-foreground font-semibold rounded-control text-xs flex items-center gap-1 shadow-xs transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Apply</span>
            </button>

            <button
              type="button"
              onClick={onCancelCrop}
              className="p-1 text-txt-muted hover:text-txt rounded-control hover:bg-elevated transition-colors"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Rotation action bar */}
      {isRotateActive && previewUrl && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-surface/95 backdrop-blur-glass border border-subtle shadow-floating px-4 py-2 rounded-panel flex flex-col items-center gap-2 text-xs w-[340px]">
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold text-txt text-[11px]">Rotate Horizon</span>
            <span className="font-mono text-accent font-bold text-xs">{liveAngle}°</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onRotateCommit(liveAngle)}
                className="px-2 py-0.5 bg-accent hover:bg-accent-hover text-accent-foreground rounded-control font-semibold text-[11px]"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={onRotateCancel}
                className="p-0.5 text-txt-muted hover:text-txt"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            onPointerDown={handleRulerPointerDown}
            className="w-full h-8 bg-elevated border border-subtle rounded-control relative overflow-hidden cursor-ew-resize flex items-center justify-center rotation-ruler-ticks"
          >
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-subtle pointer-events-none -translate-x-1/2" />
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-accent z-10 pointer-events-none"
              style={{
                left: `calc(50% + ${(liveAngle / 180) * 45}%)`,
              }}
            >
              <div className="w-2 h-2 bg-accent rounded-full -translate-x-[3px] -translate-y-1" />
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BOTTOM VIEWPORT HUD (Frosted Pill) */}
      {previewUrl && (
        <div className="absolute bottom-4 right-4 z-30 sm:bottom-5 sm:right-6 flex items-center gap-1 bg-surface/85 backdrop-blur-glass border border-subtle shadow-floating rounded-pill p-1 text-xs text-txt">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-7 h-7 rounded-control text-txt-muted hover:text-txt hover:bg-elevated flex items-center justify-center transition-colors"
            title="Zoom out (Ctrl + -)"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Tabular Percentage Readout */}
          <button
            type="button"
            onClick={handleZoomActual}
            className="font-mono text-[11px] px-1.5 py-0.5 rounded-control text-txt hover:bg-elevated transition-colors min-w-[42px] text-center"
            title="Click to reset to 100%"
          >
            {isFit ? 'Fit' : `${Math.round(effectiveScale * 100)}%`}
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-7 h-7 rounded-control text-txt-muted hover:text-txt hover:bg-elevated flex items-center justify-center transition-colors"
            title="Zoom in (Ctrl + +)"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-subtle mx-0.5" />

          {/* Fit Toggle */}
          <button
            type="button"
            onClick={handleZoomFit}
            className={`px-2 py-1 text-[11px] rounded-control font-medium transition-colors ${
              isFit ? 'bg-accent text-accent-foreground font-semibold' : 'text-txt-muted hover:text-txt hover:bg-elevated'
            }`}
            title="Fit image to viewport (Ctrl + 0)"
          >
            Fit
          </button>

          {/* 1:1 Actual Toggle */}
          <button
            type="button"
            onClick={handleZoomActual}
            className={`px-2 py-1 text-[11px] rounded-control font-medium transition-colors ${
              !isFit && Math.round(effectiveScale * 100) === 100
                ? 'bg-accent text-accent-foreground font-semibold'
                : 'text-txt-muted hover:text-txt hover:bg-elevated'
            }`}
            title="View at native 100% scale"
          >
            1:1
          </button>

          {/* Before/After Split Compare Toggle */}
          {originalUrl && (
            <>
              <div className="w-[1px] h-3.5 bg-subtle mx-0.5" />
              <button
                type="button"
                onClick={() => setIsCompareActive((prev) => !prev)}
                className={`px-2 py-1 text-[11px] rounded-control font-medium transition-colors flex items-center gap-1 ${
                  isCompareActive
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-txt-muted hover:text-txt hover:bg-elevated'
                }`}
                title="Toggle Before/After Split Comparison"
              >
                <Columns className="w-3 h-3" />
                <span className="hidden sm:inline">Compare</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Bottom workspace status bar */}
      <div className="h-7 bg-surface border-t border-subtle px-3 flex items-center justify-between text-[11px] text-txt-muted shrink-0 z-10 font-mono">
        <div className="flex items-center gap-2 truncate">
          {previewUrl ? (
            <>
              <span>
                Output:{' '}
                <strong className="text-txt font-medium">
                  {dimensions.pixelWidth} × {dimensions.pixelHeight} px
                </strong>
              </span>
              <span>•</span>
              <span>
                Size:{' '}
                <strong className="text-txt font-medium">
                  {previewSize ? formatBytes(previewSize) : '—'}
                </strong>
              </span>
              {originalMeta && previewSize > 0 && (
                <span className="text-[10px]">
                  ({previewSize < originalMeta.size
                    ? `-${Math.round((1 - previewSize / originalMeta.size) * 100)}%`
                    : `+${Math.round((previewSize / originalMeta.size - 1) * 100)}%`})
                </span>
              )}
            </>
          ) : (
            <span>Ready for image input</span>
          )}
        </div>

        <div>
          {isProcessing && <span className="text-accent text-[11px]">Rendering...</span>}
        </div>
      </div>
    </div>
  );
}
