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
  RotateCcw as ResetIcon,
  Upload,
} from 'lucide-react';
import { formatBytes } from '../utils/units';

export default function Workspace({
  previewUrl,
  dimensions,
  previewSize,
  originalMeta,
  isProcessing,
  onFileDrop,
  onOpenClick,
  // Crop & Perspective
  isCropActive,
  setIsCropActive,
  cropMode, // 'rect' | 'perspective'
  setCropMode,
  appliedCrop,
  onApplyCrop,
  onCancelCrop,
  onResetCrop,
  appliedPerspectiveQuad,
  onApplyPerspective,
  onResetPerspective,
  // Rotation
  isRotateActive,
  setIsRotateActive,
  rotationAngle,
  onRotationCommit,
  onRotateStep,
  onResetRotation,
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

  // Live dragging angle for rotation ruler
  const [liveAngle, setLiveAngle] = useState(rotationAngle);
  const isDraggingRulerRef = useRef(false);

  // Crop Box relative coordinates (can extend outside [0..1])
  const [cropBox, setCropBox] = useState({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  const [cropAspect, setCropAspect] = useState('free');
  const cropDragRef = useRef(null);

  // 4 Corner Perspective Quad coordinates [TL, TR, BR, BL]
  const [quadCorners, setQuadCorners] = useState([
    { x: 0.05, y: 0.05 },
    { x: 0.95, y: 0.05 },
    { x: 0.95, y: 0.95 },
    { x: 0.05, y: 0.95 },
  ]);
  const activeQuadPinRef = useRef(null);

  // Sync live angle with rotationAngle prop
  useEffect(() => {
    setLiveAngle(rotationAngle);
  }, [rotationAngle]);

  // Measure viewport size reliably with ResizeObserver
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setViewportSize({ width, height });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Image intrinsic or transformed pixel size
  const imgW = Math.max(1, dimensions?.pixelWidth || originalMeta?.width || 800);
  const imgH = Math.max(1, dimensions?.pixelHeight || originalMeta?.height || 600);

  // Calculate fit scale: image occupies ~78% of available viewport area, preserving aspect ratio
  const calculateFitScale = useCallback(() => {
    const vW = viewportSize.width || 800;
    const vH = viewportSize.height || 600;
    const targetW = vW * 0.78;
    const targetH = vH * 0.78;
    return Math.min(targetW / imgW, targetH / imgH);
  }, [viewportSize, imgW, imgH]);

  const fitScale = calculateFitScale();
  const effectiveScale = isFit ? fitScale : fitScale * zoomMultiplier;

  // On new image load, reset to 78% Fit view with pan centered
  useEffect(() => {
    setIsFit(true);
    setZoomMultiplier(1);
    setPan({ x: 0, y: 0 });
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
        setQuadCorners(
          appliedPerspectiveQuad.map((p) => ({
            x: p.x / originalMeta.width,
            y: p.y / originalMeta.height,
          }))
        );
      } else {
        setQuadCorners([
          { x: 0.05, y: 0.05 },
          { x: 0.95, y: 0.05 },
          { x: 0.95, y: 0.95 },
          { x: 0.05, y: 0.95 },
        ]);
      }
    }
  }, [isCropActive, appliedCrop, appliedPerspectiveQuad, originalMeta]);

  // Zoom actions
  const handleZoomIn = () => {
    setIsFit(false);
    setZoomMultiplier((prev) => Math.min(6, Number((prev * 1.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setIsFit(false);
    setZoomMultiplier((prev) => Math.max(0.15, Number((prev * 0.8).toFixed(2))));
  };

  const handleZoomFit = () => {
    setIsFit(true);
    setZoomMultiplier(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomActual = () => {
    setIsFit(false);
    // 1:1 scale means effectiveScale = 1.0 => zoomMultiplier = 1.0 / fitScale
    setZoomMultiplier(fitScale > 0 ? Number((1 / fitScale).toFixed(2)) : 1);
    setPan({ x: 0, y: 0 });
  };

  // Viewport panning
  const handlePointerDown = (e) => {
    if (isCropActive) return;
    if (e.button !== 0 || (isFit && zoomMultiplier === 1)) return;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handlePointerMove = (e) => {
    if (!isPanning || isCropActive) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setIsFit(false);
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoomMultiplier((prev) => Math.min(6, Math.max(0.15, Number((prev * delta).toFixed(2)))));
    }
  };

  // File drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileDrop(file);
      }
    }
  };

  // -------------------------------------------------------------
  // CROP HANDLES (Can extend beyond image bounds)
  // -------------------------------------------------------------
  const handleCropHandleDown = (e, handleType) => {
    e.stopPropagation();
    e.preventDefault();
    cropDragRef.current = {
      type: handleType,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...cropBox },
    };

    const handleWindowMove = (moveEvt) => {
      if (!cropDragRef.current || !imgRef.current) return;
      // Use stage pixel dimensions scaled
      const stageRect = imgRef.current.getBoundingClientRect();
      if (stageRect.width <= 0 || stageRect.height <= 0) return;

      const deltaX = (moveEvt.clientX - cropDragRef.current.startX) / stageRect.width;
      const deltaY = (moveEvt.clientY - cropDragRef.current.startY) / stageRect.height;
      const init = cropDragRef.current.initialBox;
      const type = cropDragRef.current.type;

      let next = { ...init };

      if (type === 'move') {
        next.x = init.x + deltaX;
        next.y = init.y + deltaY;
      } else {
        if (type.includes('w')) {
          next.x = init.x + deltaX;
          next.width = init.width - deltaX;
        }
        if (type.includes('e')) {
          next.width = Math.max(0.02, init.width + deltaX);
        }
        if (type.includes('n')) {
          next.y = init.y + deltaY;
          next.height = init.height - deltaY;
        }
        if (type.includes('s')) {
          next.height = Math.max(0.02, init.height + deltaY);
        }

        if (cropAspect !== 'free' && originalMeta) {
          let ratio = 1;
          if (cropAspect === '1:1') ratio = 1;
          else if (cropAspect === '16:9') ratio = 16 / 9;
          else if (cropAspect === '4:3') ratio = 4 / 3;
          else if (cropAspect === 'original') ratio = originalMeta.aspectRatio || 1;

          next.height = (next.width * originalMeta.width) / (ratio * originalMeta.height);
        }
      }

      setCropBox(next);
    };

    const handleWindowUp = () => {
      cropDragRef.current = null;
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
  };

  const handleCommitRectCrop = () => {
    if (!originalMeta) return;
    const pixelCrop = {
      x: Math.round(cropBox.x * originalMeta.width),
      y: Math.round(cropBox.y * originalMeta.height),
      width: Math.max(1, Math.round(cropBox.width * originalMeta.width)),
      height: Math.max(1, Math.round(cropBox.height * originalMeta.height)),
    };
    onApplyCrop(pixelCrop);
    setIsCropActive(false);
  };

  // -------------------------------------------------------------
  // PERSPECTIVE CORNER PINS
  // -------------------------------------------------------------
  const handleQuadPinDown = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    activeQuadPinRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      initialPin: { ...quadCorners[index] },
    };

    const handlePinMove = (moveEvt) => {
      if (!activeQuadPinRef.current || !imgRef.current) return;
      const stageRect = imgRef.current.getBoundingClientRect();
      if (stageRect.width <= 0 || stageRect.height <= 0) return;

      const deltaX = (moveEvt.clientX - activeQuadPinRef.current.startX) / stageRect.width;
      const deltaY = (moveEvt.clientY - activeQuadPinRef.current.startY) / stageRect.height;
      const idx = activeQuadPinRef.current.index;
      const init = activeQuadPinRef.current.initialPin;

      setQuadCorners((prev) => {
        const next = [...prev];
        next[idx] = {
          x: init.x + deltaX,
          y: init.y + deltaY,
        };
        return next;
      });
    };

    const handlePinUp = () => {
      activeQuadPinRef.current = null;
      window.removeEventListener('pointermove', handlePinMove);
      window.removeEventListener('pointerup', handlePinUp);
    };

    window.addEventListener('pointermove', handlePinMove);
    window.addEventListener('pointerup', handlePinUp);
  };

  const handleCommitPerspective = () => {
    if (!originalMeta) return;
    const pixelQuad = quadCorners.map((p) => ({
      x: Math.round(p.x * originalMeta.width),
      y: Math.round(p.y * originalMeta.height),
    }));
    onApplyPerspective(pixelQuad);
    setIsCropActive(false);
  };

  // -------------------------------------------------------------
  // ROTATION RULER DRAGGING (Smooth live drag)
  // -------------------------------------------------------------
  const handleRulerPointerDown = (e) => {
    e.preventDefault();
    isDraggingRulerRef.current = true;
    const startX = e.clientX;
    const startAngle = liveAngle;

    const handleRulerMove = (moveEvt) => {
      if (!isDraggingRulerRef.current) return;
      const deltaX = moveEvt.clientX - startX;
      let nextAngle = Math.round((startAngle + deltaX * 0.5) * 10) / 10;
      while (nextAngle > 180) nextAngle -= 360;
      while (nextAngle < -180) nextAngle += 360;
      setLiveAngle(nextAngle);
    };

    const handleRulerUp = () => {
      if (isDraggingRulerRef.current) {
        isDraggingRulerRef.current = false;
        onRotationCommit(liveAngle);
      }
      window.removeEventListener('pointermove', handleRulerMove);
      window.removeEventListener('pointerup', handleRulerUp);
    };

    window.addEventListener('pointermove', handleRulerMove);
    window.addEventListener('pointerup', handleRulerUp);
  };

  const handleAngleInputChange = (val) => {
    const num = Number(val) || 0;
    setLiveAngle(num);
    onRotationCommit(num);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col h-full bg-base relative overflow-hidden select-none border-b lg:border-b-0 lg:border-r border-border ${
        isDragOver ? 'ring-2 ring-accent ring-inset' : ''
      }`}
    >
      {/* Top compact workspace toolbar */}
      <div className="h-9 bg-secondary border-b border-border px-3 flex items-center justify-between text-xs text-txt shrink-0 z-20">
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <div className="flex items-center bg-surface border border-border rounded-xs p-0.5">
            <button
              type="button"
              onClick={handleZoomFit}
              className={`px-1.5 py-0.5 text-[11px] rounded-xs transition-colors ${
                isFit ? 'bg-secondary text-accent font-medium shadow-xs' : 'text-txt-muted hover:text-txt'
              }`}
              title="Fit entire image in view with working margins"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={handleZoomActual}
              className={`px-1.5 py-0.5 text-[11px] rounded-xs transition-colors ${
                !isFit && Math.round(effectiveScale * 100) === 100
                  ? 'bg-secondary text-accent font-medium shadow-xs'
                  : 'text-txt-muted hover:text-txt'
              }`}
              title="100% 1:1 view"
            >
              100%
            </button>
            <div className="w-[1px] h-3 bg-border mx-0.5" />
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-txt-muted hover:text-txt rounded-xs"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] px-1 text-txt-muted min-w-[36px] text-center">
              {isFit ? 'Fit' : `${Math.round(effectiveScale * 100)}%`}
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-txt-muted hover:text-txt rounded-xs"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-border mx-1" />

          {/* Tools: Crop & Rotate */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setIsCropActive((prev) => !prev);
                if (!isCropActive) setIsRotateActive(false);
              }}
              disabled={!previewUrl}
              className={`h-6 px-2.5 rounded-xs border flex items-center gap-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                isCropActive
                  ? 'bg-accent text-white border-accent'
                  : appliedCrop || appliedPerspectiveQuad
                  ? 'bg-surface text-accent border-accent/40'
                  : 'bg-surface text-txt border-border hover:bg-border/20'
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
              className={`h-6 px-2.5 rounded-xs border flex items-center gap-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                isRotateActive
                  ? 'bg-accent text-white border-accent'
                  : rotationAngle !== 0
                  ? 'bg-surface text-accent border-accent/40'
                  : 'bg-surface text-txt border-border hover:bg-border/20'
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
              className="h-6 w-6 rounded-xs bg-surface hover:bg-border/20 border border-border flex items-center justify-center text-txt-muted hover:text-txt disabled:opacity-40"
              title="Rotate -90°"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onRotateStep(90)}
              disabled={!previewUrl}
              className="h-6 w-6 rounded-xs bg-surface hover:bg-border/20 border border-border flex items-center justify-center text-txt-muted hover:text-txt disabled:opacity-40"
              title="Rotate +90°"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right status */}
        <div className="flex items-center gap-2 text-[11px] text-txt-muted">
          {isProcessing && (
            <span className="text-accent text-[11px] font-medium animate-pulse">Rendering...</span>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`flex-1 w-full h-full relative overflow-hidden select-none canvas-checkerboard ${
          isCropActive ? 'cursor-default' : !isFit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {previewUrl ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* The Transformed Stage: Fixed pixel dimensions centered with center origin */}
            <div
              ref={stageRef}
              style={{
                width: `${imgW}px`,
                height: `${imgH}px`,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.08s ease-out',
              }}
              className="relative pointer-events-auto shadow-md"
            >
              {/* Image element: always occupies 100% of stage, never clipped by object-none */}
              <img
                ref={imgRef}
                src={previewUrl}
                alt="Canvas viewport"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  objectFit: 'fill',
                  transform:
                    isRotateActive && isDraggingRulerRef.current
                      ? `rotate(${liveAngle - rotationAngle}deg)`
                      : 'none',
                }}
                className={`border border-border/80 transition-opacity duration-75 ${
                  isProcessing ? 'opacity-80' : 'opacity-100'
                }`}
                draggable={false}
              />

              {/* ======================================================= */}
              {/* RECTANGULAR CROP OVERLAY (Can extend beyond image!)     */}
              {/* ======================================================= */}
              {isCropActive && cropMode === 'rect' && (
                <div
                  className="absolute inset-0 pointer-events-auto"
                  style={{ width: '100%', height: '100%' }}
                >
                  <div
                    onPointerDown={(e) => handleCropHandleDown(e, 'move')}
                    className="absolute border-2 border-accent cursor-move shadow-lg"
                    style={{
                      left: `${cropBox.x * 100}%`,
                      top: `${cropBox.y * 100}%`,
                      width: `${cropBox.width * 100}%`,
                      height: `${cropBox.height * 100}%`,
                    }}
                  >
                    {/* Grid lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                      <div className="border-r border-b border-accent" />
                      <div className="border-r border-b border-accent" />
                      <div className="border-b border-accent" />
                      <div className="border-r border-b border-accent" />
                      <div className="border-r border-b border-accent" />
                      <div className="border-b border-accent" />
                      <div className="border-r border-accent" />
                      <div className="border-r border-accent" />
                      <div />
                    </div>

                    {/* 8 Drag Handles */}
                    <div
                      onPointerDown={(e) => handleCropHandleDown(e, 'nw')}
                      className="absolute -left-2.5 -top-2.5 w-5 h-5 bg-secondary border-2 border-accent rounded-xs cursor-nwse-resize z-30"
                    />
                    <div
                      onPointerDown={(e) => handleCropHandleDown(e, 'ne')}
                      className="absolute -right-2.5 -top-2.5 w-5 h-5 bg-secondary border-2 border-accent rounded-xs cursor-nesw-resize z-30"
                    />
                    <div
                      onPointerDown={(e) => handleCropHandleDown(e, 'sw')}
                      className="absolute -left-2.5 -bottom-2.5 w-5 h-5 bg-secondary border-2 border-accent rounded-xs cursor-nesw-resize z-30"
                    />
                    <div
                      onPointerDown={(e) => handleCropHandleDown(e, 'se')}
                      className="absolute -right-2.5 -bottom-2.5 w-5 h-5 bg-secondary border-2 border-accent rounded-xs cursor-nwse-resize z-30"
                    />
                    <div
                      onPointerDown={(e) => handleCropHandleDown(e, 'n')}
                      className="absolute left-1/2 -top-2 -translate-x-1/2 w-8 h-4 bg-secondary border border-accent rounded-xs cursor-ns-resize z-30"
                    />
                    <div
                      onPointerDown={(e) => handleCropHandleDown(e, 's')}
                      className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-8 h-4 bg-secondary border border-accent rounded-xs cursor-ns-resize z-30"
                    />
                    <div
                      onPointerDown={(e) => handleCropHandleDown(e, 'w')}
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-8 bg-secondary border border-accent rounded-xs cursor-ew-resize z-30"
                    />
                    <div
                      onPointerDown={(e) => handleCropHandleDown(e, 'e')}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-8 bg-secondary border border-accent rounded-xs cursor-ew-resize z-30"
                    />
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* PERSPECTIVE QUAD OVERLAY (4 Corner Pins)                */}
              {/* ======================================================= */}
              {isCropActive && cropMode === 'perspective' && (
                <div
                  className="absolute inset-0 pointer-events-auto"
                  style={{ width: '100%', height: '100%' }}
                >
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <polygon
                      points={`${quadCorners[0].x * 100}%,${quadCorners[0].y * 100}% ${quadCorners[1].x * 100}%,${quadCorners[1].y * 100}% ${quadCorners[2].x * 100}%,${quadCorners[2].y * 100}% ${quadCorners[3].x * 100}%,${quadCorners[3].y * 100}%`}
                      fill="rgba(217, 74, 38, 0.08)"
                      stroke="var(--color-accent)"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </svg>

                  {quadCorners.map((pin, i) => {
                    const labels = ['TL', 'TR', 'BR', 'BL'];
                    return (
                      <div
                        key={i}
                        onPointerDown={(e) => handleQuadPinDown(e, i)}
                        className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 bg-accent text-white border-2 border-secondary rounded-full shadow-md flex items-center justify-center font-bold text-[10px] cursor-crosshair z-30 hover:scale-125 transition-transform"
                        style={{
                          left: `${pin.x * 100}%`,
                          top: `${pin.y * 100}%`,
                        }}
                        title={`Drag ${labels[i]} corner pin`}
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
          /* Empty canvas on initial load */
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center p-8 border-2 border-dashed border-border rounded-sm max-w-sm bg-secondary/80 shadow-xs">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-surface border border-border flex items-center justify-center text-accent">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-txt mb-1">Open an image to edit</p>
              <p className="text-xs text-txt-muted mb-4">
                Drag and drop an image file here or browse files
              </p>
              <button
                type="button"
                onClick={onOpenClick}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-xs shadow-xs transition-colors"
              >
                Choose Image File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Crop / Perspective action bar */}
      {isCropActive && previewUrl && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-secondary border border-border shadow-md px-3 py-1.5 rounded-xs flex items-center gap-2 text-xs">
          <div className="flex bg-surface p-0.5 rounded-xs border border-border">
            <button
              type="button"
              onClick={() => setCropMode('rect')}
              className={`px-2 py-0.5 text-[11px] rounded-xs font-medium ${
                cropMode === 'rect' ? 'bg-secondary text-accent shadow-xs' : 'text-txt-muted'
              }`}
            >
              Rectangular Box
            </button>
            <button
              type="button"
              onClick={() => setCropMode('perspective')}
              className={`px-2 py-0.5 text-[11px] rounded-xs font-medium ${
                cropMode === 'perspective' ? 'bg-secondary text-accent shadow-xs' : 'text-txt-muted'
              }`}
            >
              4-Corner Perspective
            </button>
          </div>

          <div className="w-[1px] h-4 bg-border" />

          {cropMode === 'rect' ? (
            <>
              <select
                value={cropAspect}
                onChange={(e) => setCropAspect(e.target.value)}
                className="h-6 bg-surface border border-border rounded-xs px-1.5 text-[11px] text-txt outline-none"
              >
                <option value="free">Free aspect</option>
                <option value="1:1">1:1 Square</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="4:3">4:3 Standard</option>
                <option value="original">Original</option>
              </select>

              <button
                type="button"
                onClick={handleCommitRectCrop}
                className="h-6 px-2.5 bg-accent hover:bg-accent-hover text-white rounded-xs font-medium flex items-center gap-1 text-[11px] transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCommitPerspective}
              className="h-6 px-2.5 bg-accent hover:bg-accent-hover text-white rounded-xs font-medium flex items-center gap-1 text-[11px] transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Perspective</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (cropMode === 'rect') onResetCrop();
              else onResetPerspective();
            }}
            className="h-6 px-2 bg-surface hover:bg-border/30 text-txt rounded-xs border border-border flex items-center gap-1 text-[11px] transition-colors"
            title="Reset crop / perspective"
          >
            <ResetIcon className="w-3 h-3 text-txt-muted" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCropActive(false);
              onCancelCrop();
            }}
            className="h-6 px-2 text-txt-muted hover:text-txt rounded-xs flex items-center gap-1 text-[11px] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Floating Rotation bar */}
      {isRotateActive && previewUrl && (
        <div className="bg-secondary border-t border-border p-2 z-20 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-txt text-[11px]">Rotation Angle:</span>
              <span className="font-mono text-accent font-medium text-xs">
                {liveAngle > 0 ? `+${liveAngle}°` : `${liveAngle}°`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="-180"
                max="180"
                value={liveAngle}
                onChange={(e) => handleAngleInputChange(e.target.value)}
                className="w-14 h-6 bg-surface border border-border rounded-xs text-center font-mono text-[11px] text-txt"
                aria-label="Direct rotation angle in degrees"
              />

              <button
                type="button"
                onClick={onResetRotation}
                className="h-6 px-2 bg-surface hover:bg-border/30 text-txt-muted hover:text-txt border border-border rounded-xs text-[11px] transition-colors"
                title="Reset angle to 0°"
              >
                0° Reset
              </button>

              <button
                type="button"
                onClick={() => setIsRotateActive(false)}
                className="h-6 px-2.5 bg-accent hover:bg-accent-hover text-white rounded-xs text-[11px] font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>

          {/* Draggable Angle Ruler */}
          <div
            onPointerDown={handleRulerPointerDown}
            className="h-7 bg-surface border border-border rounded-xs relative overflow-hidden cursor-ew-resize flex items-center justify-center select-none"
            title="Drag horizontally to smoothly scrub rotation angle"
          >
            <div className="absolute inset-x-0 h-3 rotation-ruler-ticks opacity-60 pointer-events-none" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-border pointer-events-none -translate-x-1/2" />
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-accent z-10 pointer-events-none"
              style={{
                left: `calc(50% + ${(liveAngle / 180) * 45}%)`,
              }}
            >
              <div className="w-2 h-2 bg-accent rounded-full -translate-x-[3px] -translate-y-1" />
            </div>

            <span className="text-[10px] text-txt-muted pointer-events-none z-10">
              Drag ruler to adjust angle • Smooth live preview
            </span>
          </div>
        </div>
      )}

      {/* Bottom workspace status bar */}
      <div className="h-7 bg-secondary border-t border-border px-3 flex items-center justify-between text-[11px] text-txt-muted shrink-0 z-10">
        <div className="flex items-center gap-3">
          {previewUrl ? (
            <>
              <span>
                Output:{' '}
                <strong className="font-mono text-txt font-medium">
                  {dimensions.pixelWidth} × {dimensions.pixelHeight} px
                </strong>
              </span>
              <span>•</span>
              <span>
                Size:{' '}
                <strong className="font-mono text-txt font-medium">
                  {previewSize ? formatBytes(previewSize) : '—'}
                </strong>
              </span>
              {originalMeta && previewSize > 0 && (
                <span className="font-mono text-[10px]">
                  ({previewSize < originalMeta.size
                    ? `-${Math.round((1 - previewSize / originalMeta.size) * 100)}%`
                    : `+${Math.round((previewSize / originalMeta.size - 1) * 100)}%`})
                </span>
              )}
              {appliedCrop && (
                <>
                  <span>•</span>
                  <span className="text-accent text-[10px]">Cropped</span>
                </>
              )}
              {appliedPerspectiveQuad && (
                <>
                  <span>•</span>
                  <span className="text-accent text-[10px]">Perspective</span>
                </>
              )}
              {rotationAngle !== 0 && (
                <>
                  <span>•</span>
                  <span className="text-accent text-[10px]">Rotated {rotationAngle}°</span>
                </>
              )}
            </>
          ) : (
            <span>No image loaded</span>
          )}
        </div>

        <div>
          {isProcessing && <span className="text-accent text-[11px]">Rendering...</span>}
        </div>
      </div>
    </div>
  );
}
