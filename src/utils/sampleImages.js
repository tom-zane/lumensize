/**
 * Procedural Offline Sample Images
 *
 * Generates instant offline sample images directly via HTML5 Canvas
 * so users can test LumenSize presets, target size optimizer, alpha matting,
 * and theme styling with a single click.
 */

export const SAMPLE_PRESETS = [
  {
    id: 'photo',
    title: 'Landscape Photo',
    subtitle: '1920 × 1080 px • High-entropy JPEG test',
    description: 'Scenic sunset mountain landscape with rich gradients, fine stars, and sharp ridge contours.',
    aspect: '16:9',
  },
  {
    id: 'document',
    title: 'Typeset Document',
    subtitle: '1200 × 1600 px • High-frequency text & print',
    description: 'Precision typography document with borders, certificate seals, and fine hairline data tables.',
    aspect: '3:4',
  },
  {
    id: 'graphic',
    title: 'Transparent Graphic',
    subtitle: '800 × 800 px • Alpha-channel PNG test',
    description: 'Modern geometric app badge with transparency to evaluate alpha matting and checkerboard.',
    aspect: '1:1',
  },
];

export function generateSampleImage(sampleType = 'photo') {
  if (sampleType === 'document') {
    return generateDocumentSample();
  }
  if (sampleType === 'graphic') {
    return generateGraphicSample();
  }
  return generatePhotoSample();
}

function generatePhotoSample() {
  const width = 1920;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Deep night-to-warm sunset gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0b111e');
  grad.addColorStop(0.38, '#1e293b');
  grad.addColorStop(0.68, '#7c2d12');
  grad.addColorStop(0.88, '#ea580c');
  grad.addColorStop(1, '#fbbf24');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Stars in upper sky
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 180; i++) {
    const x = (Math.sin(i * 997) * 0.5 + 0.5) * width;
    const y = (Math.cos(i * 389) * 0.5 + 0.5) * (height * 0.48);
    const r = ((i % 3) + 1) * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.globalAlpha = 0.3 + (i % 5) * 0.15;
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Glowing Sun
  const sunX = width * 0.65;
  const sunY = height * 0.60;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 340);
  sunGlow.addColorStop(0, '#fffbeb');
  sunGlow.addColorStop(0.2, '#fde68a');
  sunGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
  sunGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 340, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 75, 0, Math.PI * 2);
  ctx.fill();

  // Mountain silhouettes
  // Far mountains
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, height * 0.72);
  ctx.lineTo(width * 0.25, height * 0.58);
  ctx.lineTo(width * 0.5, height * 0.68);
  ctx.lineTo(width * 0.78, height * 0.54);
  ctx.lineTo(width, height * 0.7);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // Near mountain ridges
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, height * 0.82);
  ctx.lineTo(width * 0.35, height * 0.69);
  ctx.lineTo(width * 0.6, height * 0.84);
  ctx.lineTo(width * 0.88, height * 0.72);
  ctx.lineTo(width, height * 0.86);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // Foreground hills
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, height * 0.92);
  ctx.lineTo(width * 0.45, height * 0.86);
  ctx.lineTo(width * 0.72, height * 0.94);
  ctx.lineTo(width, height * 0.90);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // Decorative metadata on sample
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('LumenSize • Sample Photograph', 80, 100);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '20px monospace';
  ctx.fillText('1920 × 1080 px • 16:9 Landscape • Precision Studio Asset', 80, 140);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], 'sample-landscape-photo.jpg', { type: 'image/jpeg' });
      resolve(file);
    }, 'image/jpeg', 0.92);
  });
}

function generateDocumentSample() {
  const width = 1200;
  const height = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Ivory parchment background
  ctx.fillStyle = '#fbf9f4';
  ctx.fillRect(0, 0, width, height);

  // Elegant double border frame
  ctx.strokeStyle = '#2b261f';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  ctx.strokeStyle = '#bfa15f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(52, 52, width - 104, height - 104);

  // Document Header
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 44px serif';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE OF ARCHIVAL CALIBRATION', width / 2, 160);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#78716c';
  ctx.fillText('REF NO: LMS-2026-PRECISION-772 • ISSUED: GLOBAL ARCHIVE', width / 2, 200);

  // Dividing rule with decorative center diamond
  ctx.strokeStyle = '#bfa15f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, 240);
  ctx.lineTo(width - 120, 240);
  ctx.stroke();

  // Body paragraphs
  ctx.textAlign = 'left';
  ctx.fillStyle = '#292524';
  ctx.font = '22px serif';

  const bodyLines = [
    'This instrument certifies that the digital asset registered herein conforms',
    'to standard typographic geometry, colorimetry bounds, and archival resolution.',
    'Rendered client-side at exactly 300 DPI target density for museum-grade print.',
    'High-frequency glyph vectors and micro-rules are preserved without compression artifacts.'
  ];
  let curY = 320;
  bodyLines.forEach((line) => {
    ctx.fillText(line, 120, curY);
    curY += 38;
  });

  // Data Table
  const tableY = 520;
  ctx.fillStyle = '#f3eee3';
  ctx.fillRect(120, tableY, width - 240, 320);
  ctx.strokeStyle = '#d6cec0';
  ctx.strokeRect(120, tableY, width - 240, 320);

  // Table rows
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#1c1917';
  ctx.fillText('SPECIFICATION', 150, tableY + 45);
  ctx.fillText('VALUE', 520, tableY + 45);
  ctx.fillText('STATUS', 820, tableY + 45);

  ctx.beginPath();
  ctx.moveTo(120, tableY + 65);
  ctx.lineTo(width - 120, tableY + 65);
  ctx.stroke();

  const specs = [
    ['Raster Dimensions', '1200 × 1600 px', 'VERIFIED'],
    ['Aspect Ratio', '3:4 Portrait', 'NOMINAL'],
    ['Native DPI Target', '300 DPI / PPI', 'CALIBRATED'],
    ['Color Matrix', 'sRGB 100% Rec.709', 'LOCKED'],
    ['Entropy Index', 'High-frequency text', 'OPTIMAL'],
  ];

  ctx.font = '16px monospace';
  specs.forEach((row, i) => {
    const rowY = tableY + 110 + i * 42;
    ctx.fillStyle = '#44403c';
    ctx.fillText(row[0], 150, rowY);
    ctx.fillStyle = '#1c1917';
    ctx.fillText(row[1], 520, rowY);
    ctx.fillStyle = '#059669';
    ctx.fillText(`[ ${row[2]} ]`, 820, rowY);
  });

  // Gold seal at bottom right
  const sealX = width - 220;
  const sealY = height - 220;
  ctx.fillStyle = '#bfa15f';
  ctx.beginPath();
  ctx.arc(sealX, sealY, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8f7335';
  ctx.beginPath();
  ctx.arc(sealX, sealY, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL', sealX, sealY - 8);
  ctx.fillText('SEAL', sealX, sealY + 14);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], 'sample-typeset-document.png', { type: 'image/png' });
      resolve(file);
    }, 'image/png');
  });
}

function generateGraphicSample() {
  const size = 800;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Completely transparent background (no fillRect)
  ctx.clearRect(0, 0, size, size);

  // Modern gradient rounded badge
  const cx = size / 2;
  const cy = size / 2;
  const r = 260;

  // Outer glowing ring
  const glow = ctx.createRadialGradient(cx, cy, 200, cx, cy, 380);
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
  glow.addColorStop(0.7, 'rgba(147, 51, 234, 0.15)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 380, 0, Math.PI * 2);
  ctx.fill();

  // Glass card polygon
  ctx.save();
  ctx.beginPath();
  const radius = 240;
  const cornerRadius = 40;
  ctx.roundRect(cx - radius, cy - radius, radius * 2, radius * 2, cornerRadius);
  const cardGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  cardGrad.addColorStop(0, 'rgba(30, 41, 59, 0.92)');
  cardGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
  ctx.fillStyle = cardGrad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Bold lightning bolt / precision glyph
  ctx.save();
  const boltGrad = ctx.createLinearGradient(cx - 80, cy - 140, cx + 80, cy + 140);
  boltGrad.addColorStop(0, '#38bdf8');
  boltGrad.addColorStop(0.5, '#818cf8');
  boltGrad.addColorStop(1, '#c084fc');

  ctx.fillStyle = boltGrad;
  ctx.beginPath();
  ctx.moveTo(cx + 10, cy - 140);
  ctx.lineTo(cx - 90, cy + 10);
  ctx.lineTo(cx - 10, cy + 10);
  ctx.lineTo(cx - 30, cy + 140);
  ctx.lineTo(cx + 90, cy - 20);
  ctx.lineTo(cx + 10, cy - 20);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Subtitle
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ALPHA CHANNEL • PNG', cx, cy + 200);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], 'sample-transparent-badge.png', { type: 'image/png' });
      resolve(file);
    }, 'image/png');
  });
}
