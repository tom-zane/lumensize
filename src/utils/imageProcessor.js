/**
 * Core image processing routines using HTML5 Canvas API.
 * Supports perspective quad correction, boundless cropping, non-clipping rotation,
 * background margins fill, format conversion, and safe file padding.
 */

import { renderPerspectiveWarp } from './perspectiveWarp';

export const SUPPORTED_FORMATS = {
  WEBP: { id: 'image/webp', ext: 'webp', name: 'WebP', lossy: true, description: 'Lossy compression with alpha transparency support.' },
  JPEG: { id: 'image/jpeg', ext: 'jpg', name: 'JPEG', lossy: true, description: 'Adjustable lossy compression with background fill.' },
  PNG: { id: 'image/png', ext: 'png', name: 'PNG', lossy: false, description: 'Lossless compression preserving transparency.' },
};

/**
 * Loads an image from a File or Blob into an HTMLImageElement.
 */
export function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) {
      reject(new Error('No image file provided.'));
      return;
    }
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image file.'));
    };
    img.src = url;
  });
}

/**
 * Computes the unclipped bounding dimensions of an image rotated by angleDegrees.
 */
export function computeRotatedBounds(width, height, angleDegrees) {
  const normDeg = angleDegrees % 360;
  if (normDeg === 0) return { width: Math.round(width), height: Math.round(height) };

  const rad = (normDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const newW = Math.max(1, Math.round(width * cos + height * sin));
  const newH = Math.max(1, Math.round(width * sin + height * cos));

  return { width: newW, height: newH };
}

/**
 * Applies perspective quad warp, boundless crop, and non-clipping rotation.
 * @param {HTMLImageElement|HTMLCanvasElement} img Source image
 * @param {Object} options
 * @param {Array<{x: number, y: number}>|null} [options.perspectiveQuad] 4 corners [TL, TR, BR, BL]
 * @param {Object|null} [options.crop] { x, y, width, height } in image pixels (may extend beyond bounds)
 * @param {number} [options.rotationAngle=0] rotation angle in degrees
 * @param {string} [options.fillColor='#FFFFFF'] fill color for areas outside original image
 */
export function renderTransformedSource(img, {
  perspectiveQuad = null,
  crop = null,
  rotationAngle = 0,
  fillColor = '#FFFFFF',
} = {}) {
  // Step 1: Perspective Quad Correction (if active)
  let currentSource = img;
  if (perspectiveQuad && perspectiveQuad.length === 4) {
    currentSource = renderPerspectiveWarp(img, perspectiveQuad);
  }

  const srcW = currentSource.naturalWidth || currentSource.width;
  const srcH = currentSource.naturalHeight || currentSource.height;

  // Step 2: Crop (can extend outside image bounds)
  let croppedCanvas = currentSource;
  let curW = srcW;
  let curH = srcH;

  if (crop && (crop.width > 0 && crop.height > 0)) {
    curW = Math.max(1, Math.round(crop.width));
    curH = Math.max(1, Math.round(crop.height));

    const cCanvas = document.createElement('canvas');
    cCanvas.width = curW;
    cCanvas.height = curH;
    const cCtx = cCanvas.getContext('2d');
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';

    // Fill background for areas extending outside the image
    if (fillColor !== 'transparent') {
      cCtx.fillStyle = fillColor;
      cCtx.fillRect(0, 0, curW, curH);
    } else {
      cCtx.clearRect(0, 0, curW, curH);
    }

    // Draw source at negative offset of crop.x, crop.y
    cCtx.drawImage(currentSource, -Math.round(crop.x), -Math.round(crop.y));
    croppedCanvas = cCanvas;
  }

  // Step 3: Rotation (with unclipped bounds)
  const normAngle = ((rotationAngle % 360) + 360) % 360;
  if (normAngle === 0) {
    return {
      canvas: croppedCanvas,
      width: curW,
      height: curH,
    };
  }

  const { width: rotW, height: rotH } = computeRotatedBounds(curW, curH, normAngle);
  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = rotW;
  rotatedCanvas.height = rotH;
  const rotCtx = rotatedCanvas.getContext('2d');

  rotCtx.imageSmoothingEnabled = true;
  rotCtx.imageSmoothingQuality = 'high';

  if (fillColor !== 'transparent') {
    rotCtx.fillStyle = fillColor;
    rotCtx.fillRect(0, 0, rotW, rotH);
  } else {
    rotCtx.clearRect(0, 0, rotW, rotH);
  }

  rotCtx.translate(rotW / 2, rotH / 2);
  rotCtx.rotate((normAngle * Math.PI) / 180);
  rotCtx.drawImage(croppedCanvas, -curW / 2, -curH / 2, curW, curH);

  return {
    canvas: rotatedCanvas,
    width: rotW,
    height: rotH,
  };
}

/**
 * Scales a source image/canvas onto a canvas of target dimensions,
 * supporting differing aspect ratios with configurable background fill.
 */
export function renderToCanvas(sourceDrawable, targetWidth, targetHeight, formatMime, {
  fitMode = 'contain', // 'contain' | 'cover' | 'stretch'
  fillColor = '#FFFFFF',
} = {}) {
  const width = Math.max(1, Math.round(targetWidth));
  const height = Math.max(1, Math.round(targetHeight));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: formatMime !== 'image/jpeg' });

  if (!ctx) {
    throw new Error('Canvas 2D context could not be created.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Background fill: JPEG requires opaque background (defaults to white)
  if (formatMime === 'image/jpeg' || fillColor !== 'transparent') {
    ctx.fillStyle = (formatMime === 'image/jpeg' && fillColor === 'transparent') ? '#FFFFFF' : (fillColor || '#FFFFFF');
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  const srcW = sourceDrawable.naturalWidth || sourceDrawable.width;
  const srcH = sourceDrawable.naturalHeight || sourceDrawable.height;

  if (fitMode === 'stretch') {
    ctx.drawImage(sourceDrawable, 0, 0, srcW, srcH, 0, 0, width, height);
  } else if (fitMode === 'cover') {
    const scale = Math.max(width / srcW, height / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;
    ctx.drawImage(sourceDrawable, dx, dy, drawW, drawH);
  } else {
    // 'contain' (Letterbox / Pillarbox)
    const scale = Math.min(width / srcW, height / srcH);
    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    const dx = Math.round((width - drawW) / 2);
    const dy = Math.round((height - drawH) / 2);
    ctx.drawImage(sourceDrawable, dx, dy, drawW, drawH);
  }

  return canvas;
}

/**
 * Converts a canvas to a Blob.
 */
export function canvasToBlob(canvas, mimeType, quality = 0.85) {
  return new Promise((resolve, reject) => {
    try {
      const clampedQuality = Math.min(1, Math.max(0.01, quality));
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas export failed to produce a valid blob.'));
          }
        },
        mimeType,
        clampedQuality
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Encodes an image with specified dimensions, quality, and background fill options.
 */
export async function processImage(sourceDrawable, {
  width,
  height,
  format,
  quality,
  fitMode = 'contain',
  fillColor = '#FFFFFF',
}) {
  const canvas = renderToCanvas(sourceDrawable, width, height, format, { fitMode, fillColor });
  const blob = await canvasToBlob(canvas, format, quality);
  const objectUrl = URL.createObjectURL(blob);

  return {
    blob,
    objectUrl,
    width: canvas.width,
    height: canvas.height,
    size: blob.size,
    format,
  };
}

/**
 * Triggers a browser file download for a blob.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Generates formatted output filename: `imagename_1200x800.jpg`.
 * Sanitizes invalid filename characters.
 */
export function generateFilename(originalName, width, height, formatMime) {
  const rawBase = originalName ? originalName.replace(/\.[^/.]+$/, '') : 'image';
  // Sanitize invalid filename characters: / \ ? % * : | " < > and spaces
  const cleanBase = rawBase
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim() || 'image';

  const ext = formatMime === 'image/jpeg' ? 'jpg' : formatMime === 'image/png' ? 'png' : 'webp';
  return `${cleanBase}_${Math.round(width)}x${Math.round(height)}.${ext}`;
}
