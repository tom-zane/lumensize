export const DEFAULT_PRESET_FORMAT = 'image/jpeg';
export const DEFAULT_PRESET_QUALITY = 0.90;

export const ASPECT_RATIO_PRESETS = [
  { id: 'free', label: 'Free', ratio: null },
  { id: 'original', label: 'Original', ratio: 'original' },
  { id: '1:1', label: '1:1', ratio: 1, w: 1, h: 1, type: 'square' },
  { id: '3:4', label: '3:4', ratio: 3 / 4, w: 3, h: 4, type: 'portrait' },
  { id: '5:7', label: '5:7', ratio: 5 / 7, w: 5, h: 7, type: 'portrait' },
  { id: '2:3', label: '2:3', ratio: 2 / 3, w: 2, h: 3, type: 'portrait' },
  { id: '4:5', label: '4:5', ratio: 4 / 5, w: 4, h: 5, type: 'portrait' },
  { id: '9:16', label: '9:16', ratio: 9 / 16, w: 9, h: 16, type: 'portrait' },
  { id: '16:9', label: '16:9', ratio: 16 / 9, w: 16, h: 9, type: 'landscape' },
];

export function getAspectRatioValue(aspectId, originalRatio = 1) {
  if (!aspectId || aspectId === 'free') return null;
  if (aspectId === 'original') return originalRatio > 0 ? originalRatio : 1;
  const found = ASPECT_RATIO_PRESETS.find((a) => a.id === aspectId);
  if (found && typeof found.ratio === 'number') return found.ratio;
  if (typeof aspectId === 'string' && aspectId.includes(':')) {
    const parts = aspectId.split(':').map(Number);
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      return parts[0] / parts[1];
    }
  }
  const parsed = Number(aspectId);
  return !isNaN(parsed) && parsed > 0 ? parsed : null;
}

export function getInvertedAspectRatioId(aspectId) {
  if (typeof aspectId === 'string' && aspectId.includes(':')) {
    const [w, h] = aspectId.split(':');
    return `${h}:${w}`;
  }
  return aspectId;
}

export const PRESETS = [
  { id: 'custom', name: 'Custom dimensions', width: null, height: null, unit: 'px', dpi: 72, format: 'image/jpeg', quality: 0.90 },
  { id: 'signature', name: 'Signature (400 × 150 px)', width: 400, height: 150, unit: 'px', dpi: 200, format: 'image/jpeg', quality: 0.90, desc: 'Digital portal signature' },
  { id: 'passport-us', name: 'Passport Photo US (2 × 2 in @ 300 DPI)', width: 2.0, height: 2.0, unit: 'in', dpi: 300, pixelWidth: 600, pixelHeight: 600, format: 'image/jpeg', quality: 0.90, desc: 'US 2×2 in print standard' },
  { id: 'passport-uk', name: 'Passport Photo UK/EU (3.5 × 4.5 cm @ 300 DPI)', width: 3.5, height: 4.5, unit: 'cm', dpi: 300, pixelWidth: 413, pixelHeight: 531, format: 'image/jpeg', quality: 0.90, desc: 'UK / EU 35×45 mm print' },
  { id: 'photo-3x4', name: '3 × 4 in Print (3:4 @ 300 DPI)', width: 3.0, height: 4.0, unit: 'in', dpi: 300, pixelWidth: 900, pixelHeight: 1200, format: 'image/jpeg', quality: 0.90, desc: 'Standard 3×4 in print' },
  { id: 'photo-5x7', name: '5 × 7 in Print (5:7 @ 300 DPI)', width: 5.0, height: 7.0, unit: 'in', dpi: 300, pixelWidth: 1500, pixelHeight: 2100, format: 'image/jpeg', quality: 0.90, desc: 'Standard 5×7 in photo print' },
  { id: 'a4-doc', name: 'A4 Document (8.27 × 11.69 in @ 300 DPI)', width: 8.27, height: 11.69, unit: 'in', dpi: 300, pixelWidth: 2480, pixelHeight: 3508, format: 'image/jpeg', quality: 0.90, desc: '210 × 297 mm print' },
  { id: '1200x630', name: 'Web / OpenGraph Banner (1200 × 630)', width: 1200, height: 630, unit: 'px', dpi: 72, format: 'image/jpeg', quality: 0.90, desc: 'Social share banner' },
  { id: '1920x1080', name: 'Full HD Hero (1920 × 1080)', width: 1920, height: 1080, unit: 'px', dpi: 72, format: 'image/jpeg', quality: 0.90, desc: '16:9 Full HD' },
  { id: '1080x1080', name: 'Square Post (1080 × 1080)', width: 1080, height: 1080, unit: 'px', dpi: 72, format: 'image/jpeg', quality: 0.90, desc: '1:1 Square' },
  { id: '600x300', name: 'Email Header (600 × 300)', width: 600, height: 300, unit: 'px', dpi: 72, format: 'image/jpeg', quality: 0.90, desc: '2:1 Email hero' },
];
