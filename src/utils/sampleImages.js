/**
 * Generates an offline sample image directly via Canvas
 * so users can test immediately with a single click.
 */

export function generateSampleImage(theme = 'sunset') {
  const width = 1920;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Deep night-to-warm sunset gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0b111e');
  grad.addColorStop(0.4, '#1e293b');
  grad.addColorStop(0.7, '#7c2d12');
  grad.addColorStop(0.9, '#ea580c');
  grad.addColorStop(1, '#fbbf24');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 150; i++) {
    const x = (Math.sin(i * 997) * 0.5 + 0.5) * width;
    const y = (Math.cos(i * 389) * 0.5 + 0.5) * (height * 0.5);
    const r = ((i % 3) + 1) * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.globalAlpha = 0.3 + (i % 5) * 0.15;
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Glowing Warm Sun
  const sunX = width * 0.65;
  const sunY = height * 0.62;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 320);
  sunGlow.addColorStop(0, '#fffbeb');
  sunGlow.addColorStop(0.2, '#fde68a');
  sunGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
  sunGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 320, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
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

  // Foreground hills & details
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, height * 0.92);
  ctx.lineTo(width * 0.45, height * 0.86);
  ctx.lineTo(width, height * 0.93);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // Decorative text on sample
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 36px "Open Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LumenSize Sample Photograph', 80, 100);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '20px "Open Sans", sans-serif';
  ctx.fillText('1920 × 1080 px • Ultra Sharp Client-Side Render', 80, 136);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], 'sample-sunset-landscape.jpg', { type: 'image/jpeg' });
      resolve(file);
    }, 'image/jpeg', 0.92);
  });
}
