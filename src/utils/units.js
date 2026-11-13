/**
 * Utility functions for unit conversion (px, in, cm) and DPI/PPI handling.
 */

export const UNITS = {
  PX: 'px',
  IN: 'in',
  CM: 'cm',
};

export const COMMON_DPI_LIST = [
  { value: 72, label: '72 DPI (Standard Web / Screen)' },
  { value: 96, label: '96 DPI (Windows Standard Display)' },
  { value: 150, label: '150 DPI (Medium Quality Print)' },
  { value: 300, label: '300 DPI (High Quality Print / Press)' },
];

/**
 * Converts a pixel count to the specified unit given the current DPI.
 */
export function pxToUnit(px, unit, dpi = 72) {
  if (px == null || isNaN(px) || px <= 0) return 0;
  const safeDpi = Math.max(1, dpi);
  switch (unit) {
    case UNITS.IN:
      return Number((px / safeDpi).toFixed(3));
    case UNITS.CM:
      return Number(((px / safeDpi) * 2.54).toFixed(3));
    case UNITS.PX:
    default:
      return Math.round(px);
  }
}

/**
 * Converts a value in the specified unit to pixels given the current DPI.
 */
export function unitToPx(value, unit, dpi = 72) {
  if (value == null || isNaN(value) || value <= 0) return 1;
  const safeDpi = Math.max(1, dpi);
  switch (unit) {
    case UNITS.IN:
      return Math.max(1, Math.round(value * safeDpi));
    case UNITS.CM:
      return Math.max(1, Math.round((value / 2.54) * safeDpi));
    case UNITS.PX:
    default:
      return Math.max(1, Math.round(value));
  }
}

/**
 * Format bytes into human-readable string (B, KB, MB).
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || bytes == null || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return `${bytes} B`;
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Convert KB/MB to bytes.
 */
export function toBytes(val, unit = 'KB') {
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) return 0;
  return unit === 'MB' ? Math.round(num * 1024 * 1024) : Math.round(num * 1024);
}
