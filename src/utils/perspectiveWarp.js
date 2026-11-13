/**
 * Perspective Quad Warp / Homography for 4-corner perspective correction.
 * Maps an arbitrary quadrilateral in source coordinates to a rectangular destination canvas.
 */

function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Computes projective matrix from unit square [0,1]^2 to quad [p0, p1, p2, p3]
 * Order: p0=TL, p1=TR, p2=BR, p3=BL
 */
function getUnitSquareToQuadTransform(p0, p1, p2, p3) {
  const x0 = p0.x, y0 = p0.y;
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;

  if (Math.abs(dx3) < 1e-6 && Math.abs(dy3) < 1e-6) {
    // Parallelogram (affine)
    return {
      a: x1 - x0,
      b: x3 - x0,
      c: x0,
      d: y1 - y0,
      e: y3 - y0,
      f: y0,
      g: 0,
      h: 0,
    };
  }

  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-9) {
    // Fallback affine
    return {
      a: x1 - x0,
      b: x3 - x0,
      c: x0,
      d: y1 - y0,
      e: y3 - y0,
      f: y0,
      g: 0,
      h: 0,
    };
  }

  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;

  return {
    a: x1 - x0 + g * x1,
    b: x3 - x0 + h * x3,
    c: x0,
    d: y1 - y0 + g * y1,
    e: y3 - y0 + h * y3,
    f: y0,
    g,
    h,
  };
}

/**
 * Maps normalized [u, v] in [0, 1]^2 to source image pixel coordinates (X, Y)
 */
function mapUnitToQuad(u, v, H) {
  const denom = H.g * u + H.h * v + 1;
  if (Math.abs(denom) < 1e-9) return { x: 0, y: 0 };
  return {
    x: (H.a * u + H.b * v + H.c) / denom,
    y: (H.d * u + H.e * v + H.f) / denom,
  };
}

/**
 * Computes 2D affine transform matrix that maps source triangle (s0, s1, s2)
 * to destination triangle (d0, d1, d2).
 */
function getTriangleAffine(s0, s1, s2, d0, d1, d2) {
  const delta =
    s0.x * (s1.y - s2.y) +
    s1.x * (s2.y - s0.y) +
    s2.x * (s0.y - s1.y);

  if (Math.abs(delta) < 1e-9) {
    return null;
  }

  const a =
    (d0.x * (s1.y - s2.y) +
      d1.x * (s2.y - s0.y) +
      d2.x * (s0.y - s1.y)) /
    delta;

  const b =
    (d0.y * (s1.y - s2.y) +
      d1.y * (s2.y - s0.y) +
      d2.y * (s0.y - s1.y)) /
    delta;

  const c =
    (s0.x * (d2.x - d1.x) +
      s1.x * (d0.x - d2.x) +
      s2.x * (d1.x - d0.x)) /
    delta;

  const d =
    (s0.x * (d2.y - d1.y) +
      s1.x * (d0.y - d2.y) +
      s2.x * (d1.y - d0.y)) /
    delta;

  const e =
    (s0.x * (s2.y * d1.x - s1.y * d2.x) +
      s1.x * (s0.y * d2.x - s2.y * d0.x) +
      s2.x * (s1.y * d0.x - s0.y * d1.x)) /
    delta;

  const f =
    (s0.x * (s2.y * d1.y - s1.y * d2.y) +
      s1.x * (s0.y * d2.y - s2.y * d0.y) +
      s2.x * (s1.y * d0.y - s0.y * d1.y)) /
    delta;

  return { a, b, c, d, e, f };
}

/**
 * Draws a single textured triangle from source image to destination canvas.
 */
function drawTexturedTriangle(ctx, img, s0, s1, s2, d0, d1, d2) {
  const M = getTriangleAffine(s0, s1, s2, d0, d1, d2);
  if (!M) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  ctx.transform(M.a, M.b, M.c, M.d, M.e, M.f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/**
 * Renders a perspective-rectified canvas from 4 source corner points.
 * @param {HTMLImageElement|HTMLCanvasElement} sourceImage
 * @param {Array<{x: number, y: number}>} corners [TL, TR, BR, BL]
 * @param {number} [destWidth] optional target output width
 * @param {number} [destHeight] optional target output height
 * @returns {HTMLCanvasElement}
 */
export function renderPerspectiveWarp(sourceImage, corners, destWidth, destHeight) {
  const p0 = corners[0]; // TL
  const p1 = corners[1]; // TR
  const p2 = corners[2]; // BR
  const p3 = corners[3]; // BL

  const topW = distance(p0, p1);
  const botW = distance(p3, p2);
  const leftH = distance(p0, p3);
  const rightH = distance(p1, p2);

  const outW = destWidth || Math.max(16, Math.round(Math.max(topW, botW)));
  const outH = destHeight || Math.max(16, Math.round(Math.max(leftH, rightH)));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const H = getUnitSquareToQuadTransform(p0, p1, p2, p3);

  // Mesh resolution
  const steps = 20;

  // Precompute grid vertices
  const grid = [];
  for (let y = 0; y <= steps; y++) {
    const row = [];
    const v = y / steps;
    const dy = v * outH;
    for (let x = 0; x <= steps; x++) {
      const u = x / steps;
      const dx = u * outW;
      const srcPt = mapUnitToQuad(u, v, H);
      row.push({
        dst: { x: dx, y: dy },
        src: srcPt,
      });
    }
    grid.push(row);
  }

  // Draw two triangles for each mesh quad
  for (let y = 0; y < steps; y++) {
    for (let x = 0; x < steps; x++) {
      const pTL = grid[y][x];
      const pTR = grid[y][x + 1];
      const pBL = grid[y + 1][x];
      const pBR = grid[y + 1][x + 1];

      // Triangle 1: TL, TR, BL
      drawTexturedTriangle(
        ctx,
        sourceImage,
        pTL.src,
        pTR.src,
        pBL.src,
        pTL.dst,
        pTR.dst,
        pBL.dst
      );

      // Triangle 2: TR, BR, BL
      drawTexturedTriangle(
        ctx,
        sourceImage,
        pTR.src,
        pBR.src,
        pBL.src,
        pTR.dst,
        pBR.dst,
        pBL.dst
      );
    }
  }

  return canvas;
}
