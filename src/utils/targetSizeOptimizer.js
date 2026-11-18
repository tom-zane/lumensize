/**
 * Target File Size Optimizer
 *
 * Multi-stage solver combining iterative quality search, adaptive resolution scaling,
 * and spec-compliant byte padding to hit any target size range [minBytes, maxBytes].
 */

import { renderToCanvas, canvasToBlob } from './imageProcessor.js';
import { formatBytes } from './units.js';
import { padBlobToFileSize } from './filePadders.js';

export async function optimizeToTargetSize({
  img,
  baseWidth,
  baseHeight,
  format = 'image/jpeg',
  minBytes,
  maxBytes,
  allowDimensionScaling = true,
  fitMode = 'contain',
  fillColor = '#FFFFFF',
  onProgress = () => {},
  shouldCancel = () => false,
}) {
  const isLossy = format === 'image/jpeg' || format === 'image/webp';
  let step = 0;
  let bestCandidate = null;
  const createdObjectUrls = [];

  const registerUrl = (url) => {
    if (url) createdObjectUrls.push(url);
    return url;
  };

  const cleanupNonBestUrls = (keepUrl) => {
    createdObjectUrls.forEach((url) => {
      if (url && url !== keepUrl) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
    });
  };

  const evaluateCandidate = async (width, height, quality, stepDesc) => {
    step += 1;
    const clampedW = Math.max(1, Math.round(width));
    const clampedH = Math.max(1, Math.round(height));
    const clampedQ = isLossy ? Math.min(1.0, Math.max(0.01, quality)) : 1.0;

    const canvas = renderToCanvas(img, clampedW, clampedH, format, { fitMode, fillColor });
    const blob = await canvasToBlob(canvas, format, clampedQ);
    let objectUrl = '';
    try {
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        objectUrl = registerUrl(URL.createObjectURL(blob));
      }
    } catch {}

    const inRange = blob.size >= minBytes && blob.size <= maxBytes;
    const distanceToRange = inRange
      ? 0
      : blob.size < minBytes
      ? minBytes - blob.size
      : blob.size - maxBytes;

    const candidate = {
      step,
      width: clampedW,
      height: clampedH,
      quality: clampedQ,
      size: blob.size,
      blob,
      objectUrl,
      inRange,
      distanceToRange,
      description: stepDesc,
    };

    if (!bestCandidate) {
      bestCandidate = candidate;
    } else if (candidate.inRange) {
      if (!bestCandidate.inRange) {
        bestCandidate = candidate;
      } else if (candidate.quality > bestCandidate.quality) {
        bestCandidate = candidate;
      } else if (
        candidate.quality === bestCandidate.quality &&
        candidate.width * candidate.height > bestCandidate.width * bestCandidate.height
      ) {
        bestCandidate = candidate;
      }
    } else if (!bestCandidate.inRange) {
      if (candidate.distanceToRange < bestCandidate.distanceToRange) {
        bestCandidate = candidate;
      }
    }

    onProgress({
      step,
      candidate,
      bestCandidate,
      status: `Testing ${clampedW}×${clampedH}px @ ${Math.round(clampedQ * 100)}% (${formatBytes(blob.size)})`,
    });

    await new Promise((r) => setTimeout(r, 20));
    return candidate;
  };

  try {
    // =========================================================
    // STEP 1: Evaluate native dimensions at quality = 1.0
    // =========================================================
    const initial = await evaluateCandidate(baseWidth, baseHeight, 1.0, 'Native dimensions @ 100%');
    if (shouldCancel()) {
      cleanupNonBestUrls(bestCandidate?.objectUrl);
      return { canceled: true, bestCandidate };
    }

    if (initial.inRange) {
      cleanupNonBestUrls(initial.objectUrl);
      return {
        success: true,
        bestCandidate: initial,
        message: `Target reached: ${formatBytes(initial.size)} at native dimensions & 100% quality.`,
      };
    }

    // =========================================================
    // STEP 2: UPSIZING / PADDING SOLVER (when output < minBytes)
    // If even at 100% quality the file is below minBytes, do NOT
    // degrade quality. Immediately pad up to midpoint of [min, max].
    // =========================================================
    if (initial.size < minBytes) {
      onProgress({
        step,
        bestCandidate: initial,
        status: `File is smaller than minimum target (${formatBytes(initial.size)}). Applying safe format padding...`,
      });

      const midpoint = Math.round((minBytes + maxBytes) / 2);
      const targetPadByteGoal =
        midpoint >= minBytes + 1024
          ? midpoint
          : Math.min(maxBytes - 1, minBytes + 1024);
      const neededPadding = Math.max(0, targetPadByteGoal - initial.size);

      if (neededPadding > 0) {
        const padRes = await padBlobToFileSize(initial.blob, neededPadding);
        if (padRes.success && padRes.size >= minBytes && padRes.size <= maxBytes) {
          let paddedUrl = '';
          try {
            if (typeof URL !== 'undefined' && URL.createObjectURL) {
              paddedUrl = registerUrl(URL.createObjectURL(padRes.blob));
            }
          } catch {}
          bestCandidate = {
            ...initial,
            size: padRes.size,
            blob: padRes.blob,
            objectUrl: paddedUrl || initial.objectUrl,
            inRange: true,
            distanceToRange: 0,
          };
          cleanupNonBestUrls(bestCandidate.objectUrl);
          return {
            success: true,
            bestCandidate,
            message: `Target reached: ${formatBytes(bestCandidate.size)} (safely padded up to target range).`,
          };
        }
      }
    }

    // =========================================================
    // STEP 3: DOWNSIZING / COMPRESSION SOLVER (when output > maxBytes)
    // =========================================================
    if (initial.size > maxBytes) {
      // -------------------------------------------------------
      // Stage 1: Quality Binary Search (for lossy formats)
      // -------------------------------------------------------
      if (isLossy) {
        // Test compression floor at minimum quality (0.01)
        const floorCandidate = await evaluateCandidate(
          baseWidth,
          baseHeight,
          0.01,
          'Compression floor (1% quality)'
        );
        if (shouldCancel()) {
          cleanupNonBestUrls(bestCandidate?.objectUrl);
          return { canceled: true, bestCandidate };
        }

        if (floorCandidate.inRange) {
          // 0.01 is in range! Binary-search between 0.01 and 1.0 to maximize quality
          let qLow = 0.01;
          let qHigh = 1.0;
          let bestInRange = floorCandidate;

          for (let iter = 0; iter < 8 && !shouldCancel(); iter++) {
            const testQ = (qLow + qHigh) / 2;
            const c = await evaluateCandidate(
              baseWidth,
              baseHeight,
              testQ,
              `Quality search step ${iter + 1}`
            );
            if (c.inRange) {
              bestInRange = c;
              qLow = testQ; // Search higher quality
            } else if (c.size > maxBytes) {
              qHigh = testQ;
            } else {
              qLow = testQ;
            }
          }

          cleanupNonBestUrls(bestInRange.objectUrl);
          return {
            success: true,
            bestCandidate: bestInRange,
            message: `Target reached: ${formatBytes(bestInRange.size)} @ ${Math.round(bestInRange.quality * 100)}% quality.`,
          };
        } else if (floorCandidate.size < minBytes) {
          // Floor at 0.01 is < minBytes and 1.0 was > maxBytes!
          // Intermediate quality MUST land inside [minBytes, maxBytes]
          let qLow = 0.01;
          let qHigh = 1.0;

          for (let iter = 0; iter < 10 && !shouldCancel(); iter++) {
            const testQ = (qLow + qHigh) / 2;
            const c = await evaluateCandidate(
              baseWidth,
              baseHeight,
              testQ,
              `Quality search step ${iter + 1}`
            );
            if (c.inRange) {
              cleanupNonBestUrls(c.objectUrl);
              return {
                success: true,
                bestCandidate: c,
                message: `Target reached: ${formatBytes(c.size)} @ ${Math.round(testQ * 100)}% quality.`,
              };
            }
            if (c.size > maxBytes) {
              qHigh = testQ;
            } else {
              qLow = testQ;
            }
          }
        }
        // If floorCandidate.size > maxBytes, even 1% quality is too big at native resolution
      }

      // -------------------------------------------------------
      // Stage 2: Adaptive Resolution Scaling
      // (Triggered when 0.01 Q > maxBytes or format is lossless PNG)
      // -------------------------------------------------------
      if (bestCandidate.size > maxBytes) {
        if (!allowDimensionScaling) {
          cleanupNonBestUrls(bestCandidate.objectUrl);
          return {
            success: false,
            bestCandidate,
            suggestScaling: true,
            message: `File exceeds maximum target (${formatBytes(maxBytes)}) at native dimensions. Allow dimension scaling or switch to JPEG/WebP.`,
          };
        }

        // Binary search dimension scale from 0.99 down to 0.05
        let scaleMin = 0.05;
        let scaleMax = 0.99;
        let scaleIter = 0;

        while (scaleIter < 10 && !shouldCancel()) {
          scaleIter++;
          const scale = (scaleMin + scaleMax) / 2;
          const testW = Math.max(16, Math.round(baseWidth * scale));
          const testH = Math.max(16, Math.round(baseHeight * scale));

          if (!isLossy) {
            // PNG (Lossless): test scaled candidate
            const c = await evaluateCandidate(
              testW,
              testH,
              1.0,
              `Scaling to ${Math.round(scale * 100)}% (${testW}×${testH}px)`
            );

            if (c.inRange) {
              cleanupNonBestUrls(c.objectUrl);
              return {
                success: true,
                bestCandidate: c,
                message: `Target reached: scaled to ${testW}×${testH}px (${formatBytes(c.size)}).`,
              };
            }

            if (c.size > maxBytes) {
              scaleMax = scale;
            } else {
              // c.size < minBytes: can try slightly larger scale, or this scale can be padded later
              scaleMin = scale;
            }
          } else {
            // Lossy (JPEG/WebP): test at low quality floor for this scale
            const lowC = await evaluateCandidate(
              testW,
              testH,
              0.01,
              `Scale ${Math.round(scale * 100)}% @ 1% Q`
            );

            if (lowC.inRange) {
              cleanupNonBestUrls(lowC.objectUrl);
              return {
                success: true,
                bestCandidate: lowC,
                message: `Target reached: ${formatBytes(lowC.size)} (${testW}×${testH}px @ 1% Q).`,
              };
            }

            if (lowC.size > maxBytes) {
              // Even at 1% quality, this scale is too big!
              scaleMax = scale;
              continue;
            }

            // At 1% Q it is <= maxBytes. Test at 90% quality
            const highC = await evaluateCandidate(
              testW,
              testH,
              0.90,
              `Scale ${Math.round(scale * 100)}% @ 90% Q`
            );

            if (highC.inRange) {
              cleanupNonBestUrls(highC.objectUrl);
              return {
                success: true,
                bestCandidate: highC,
                message: `Target reached: ${formatBytes(highC.size)} (${testW}×${testH}px @ 90% Q).`,
              };
            }

            if (highC.size < minBytes) {
              // Even at 90% Q, this scale is too small!
              scaleMin = scale;
              continue;
            }

            // Since lowC.size <= maxBytes and highC.size >= minBytes,
            // an intermediate quality exists that lands inside [minBytes, maxBytes]
            let subQLow = 0.01;
            let subQHigh = 0.90;

            for (let subIter = 0; subIter < 6 && !shouldCancel(); subIter++) {
              const testQ = (subQLow + subQHigh) / 2;
              const subC = await evaluateCandidate(
                testW,
                testH,
                testQ,
                `Scale ${Math.round(scale * 100)}% @ ${Math.round(testQ * 100)}% Q`
              );

              if (subC.inRange) {
                cleanupNonBestUrls(subC.objectUrl);
                return {
                  success: true,
                  bestCandidate: subC,
                  message: `Target reached: ${formatBytes(subC.size)} (${testW}×${testH}px @ ${Math.round(testQ * 100)}% Q).`,
                };
              }

              if (subC.size > maxBytes) {
                subQHigh = testQ;
              } else {
                subQLow = testQ;
              }
            }
          }
        }
      }
    }

    // =========================================================
    // STEP 4: Fallback Safe Padding
    // If best candidate is below minBytes after scaling or searching,
    // unconditionally pad it to reach the target range.
    // =========================================================
    if (bestCandidate && bestCandidate.size < minBytes && !shouldCancel()) {
      onProgress({
        step,
        bestCandidate,
        status: `Padding file to meet minimum target (${formatBytes(bestCandidate.size)})...`,
      });

      const midpoint = Math.round((minBytes + maxBytes) / 2);
      const targetPadByteGoal =
        midpoint >= minBytes + 1024
          ? midpoint
          : Math.min(maxBytes - 1, minBytes + 1024);
      const neededPadding = targetPadByteGoal - bestCandidate.size;

      if (neededPadding > 0) {
        const padRes = await padBlobToFileSize(bestCandidate.blob, neededPadding);
        if (padRes.success && padRes.size >= minBytes && padRes.size <= maxBytes) {
          let paddedUrl = '';
          try {
            if (typeof URL !== 'undefined' && URL.createObjectURL) {
              paddedUrl = registerUrl(URL.createObjectURL(padRes.blob));
            }
          } catch {}
          bestCandidate = {
            ...bestCandidate,
            size: padRes.size,
            blob: padRes.blob,
            objectUrl: paddedUrl || bestCandidate.objectUrl,
            inRange: true,
            distanceToRange: 0,
          };
          cleanupNonBestUrls(bestCandidate.objectUrl);
          return {
            success: true,
            bestCandidate,
            message: `Target reached: ${formatBytes(bestCandidate.size)} (safely padded up to target range).`,
          };
        }
      }
    }

    cleanupNonBestUrls(bestCandidate?.objectUrl);
    const reachedTarget = bestCandidate && bestCandidate.inRange;

    let finalMessage = '';
    if (reachedTarget) {
      finalMessage = `Target reached: ${formatBytes(bestCandidate.size)}.`;
    } else if (bestCandidate && bestCandidate.size > maxBytes) {
      finalMessage = `Could not reach target: smallest output is ${formatBytes(bestCandidate.size)} (ceiling: ${formatBytes(maxBytes)}).`;
    } else if (bestCandidate) {
      finalMessage = `Could not reach target: largest output is ${formatBytes(bestCandidate.size)} (minimum: ${formatBytes(minBytes)}).`;
    } else {
      finalMessage = 'Unable to reach target file size.';
    }

    return {
      success: reachedTarget,
      bestCandidate,
      message: finalMessage,
    };
  } catch (err) {
    cleanupNonBestUrls(bestCandidate?.objectUrl);
    return {
      success: false,
      bestCandidate,
      error: err.message,
      message: `Search error: ${err.message}`,
    };
  }
}
