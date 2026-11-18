/**
 * LumenSize JSON Theme Schema & Validation System
 *
 * Ensures all themes—whether built-in presets or external JSON files—adhere
 * to the exact token specification, with safe deep-merge fallbacks to guarantee
 * that partial or malformed themes never crash the application.
 */

export const DEFAULT_THEME_SCHEMA = {
  meta: {
    id: 'studio-graphite',
    name: 'Studio Graphite',
    category: 'dark',
    styleTag: 'Classic Precision',
    description: 'Precision dark workstation with graphite surfaces and electric blue telemetry.',
    previewSwatches: ['#0D0E11', '#15171C', '#38BDF8', '#F4F5F7'],
  },
  colors: {
    bgBase: '#0D0E11',
    bgSurface: '#15171C',
    bgElevated: '#1D2027',
    bgOverlay: 'rgba(13, 14, 17, 0.85)',
    bgCanvas: '#090A0D',

    checkerLight: '#15171C',
    checkerDark: '#0D0E11',

    textPrimary: '#F4F5F7',
    textSecondary: '#CBD2DF',
    textMuted: '#98A2B3',
    textInverse: '#09090B',

    borderSubtle: '#262B35',
    borderStrong: '#3B4252',
    borderFocus: '#38BDF8',

    accentPrimary: '#38BDF8',
    accentHover: '#0EA5E9',
    accentMuted: 'rgba(56, 189, 248, 0.16)',
    accentForeground: '#09090B',

    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
  },
  typography: {
    fontTitle: '"Space Grotesk", "Open Sans", sans-serif',
    fontHeading: '"Plus Jakarta Sans", "Open Sans", sans-serif',
    fontUi: '"Open Sans", system-ui, -apple-system, sans-serif',
    fontMono: '"JetBrains Mono", Menlo, Monaco, Courier New, monospace',
    googleFontsUrl: '',
    titleTracking: '-0.025em',
    headingTracking: '-0.015em',
    headingTransform: 'none',
    uiWeightNormal: '400',
    uiWeightMedium: '500',
    uiWeightBold: '700',
  },
  geometry: {
    radiusApp: '12px',
    radiusPanel: '10px',
    radiusControl: '8px',
    radiusInput: '6px',
    radiusPill: '9999px',
    borderWidth: '1px',
    focusRingWidth: '2px',
  },
  effects: {
    shadowPanel: '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.4)',
    shadowFloating: '0 12px 32px -4px rgba(0, 0, 0, 0.65), 0 4px 12px -2px rgba(0, 0, 0, 0.5)',
    glassBlur: '12px',
    surfaceOpacity: 0.88,
    transitionDuration: '150ms',
    surfaceStyle: 'bordered',
  },
};

/**
 * Deep merges any theme object with DEFAULT_THEME_SCHEMA
 * ensuring every expected token exists and is valid.
 */
export function validateAndMergeTheme(partialTheme) {
  if (!partialTheme || typeof partialTheme !== 'object') {
    return structuredClone(DEFAULT_THEME_SCHEMA);
  }

  const merged = {
    meta: {
      ...DEFAULT_THEME_SCHEMA.meta,
      ...(partialTheme.meta || {}),
    },
    colors: {
      ...DEFAULT_THEME_SCHEMA.colors,
      ...(partialTheme.colors || {}),
    },
    typography: {
      ...DEFAULT_THEME_SCHEMA.typography,
      ...(partialTheme.typography || {}),
    },
    geometry: {
      ...DEFAULT_THEME_SCHEMA.geometry,
      ...(partialTheme.geometry || {}),
    },
    effects: {
      ...DEFAULT_THEME_SCHEMA.effects,
      ...(partialTheme.effects || {}),
    },
  };

  // Ensure swatches array has 4 items
  if (!Array.isArray(merged.meta.previewSwatches) || merged.meta.previewSwatches.length < 4) {
    merged.meta.previewSwatches = [
      merged.colors.bgBase,
      merged.colors.bgSurface,
      merged.colors.accentPrimary,
      merged.colors.textPrimary,
    ];
  }

  return merged;
}

/**
 * Converts a theme object into a flat map of CSS custom properties.
 */
export function themeToCssVariables(theme) {
  const t = validateAndMergeTheme(theme);
  const vars = {
    // Surface & Canvas Colors
    '--theme-bg-base': t.colors.bgBase,
    '--theme-bg-surface': t.colors.bgSurface,
    '--theme-bg-elevated': t.colors.bgElevated,
    '--theme-bg-overlay': t.colors.bgOverlay,
    '--theme-bg-canvas': t.colors.bgCanvas,

    // Checkerboard
    '--theme-checker-light': t.colors.checkerLight,
    '--theme-checker-dark': t.colors.checkerDark,

    // Typography Ink
    '--theme-text-primary': t.colors.textPrimary,
    '--theme-text-secondary': t.colors.textSecondary,
    '--theme-text-muted': t.colors.textMuted,
    '--theme-text-inverse': t.colors.textInverse || t.colors.accentForeground || '#FFFFFF',

    // Borders
    '--theme-border-subtle': t.colors.borderSubtle,
    '--theme-border-strong': t.colors.borderStrong,
    '--theme-border-focus': t.colors.borderFocus,

    // Brand & Interactive Accents
    '--theme-accent-primary': t.colors.accentPrimary,
    '--theme-accent-hover': t.colors.accentHover,
    '--theme-accent-muted': t.colors.accentMuted,
    '--theme-accent-foreground': t.colors.accentForeground || t.colors.textInverse || '#FFFFFF',

    // Semantic Telemetry
    '--theme-success': t.colors.success,
    '--theme-warning': t.colors.warning,
    '--theme-danger': t.colors.danger,
    '--theme-info': t.colors.info,

    // Typography
    '--theme-font-title': t.typography.fontTitle,
    '--theme-font-heading': t.typography.fontHeading,
    '--theme-font-ui': t.typography.fontUi,
    '--theme-font-mono': t.typography.fontMono,
    '--theme-title-tracking': t.typography.titleTracking || '-0.025em',
    '--theme-heading-tracking': t.typography.headingTracking || '-0.015em',
    '--theme-heading-transform': t.typography.headingTransform || 'none',
    '--theme-ui-weight-normal': t.typography.uiWeightNormal || '400',
    '--theme-ui-weight-medium': t.typography.uiWeightMedium || '500',
    '--theme-ui-weight-bold': t.typography.uiWeightBold || '700',

    // Geometry
    '--theme-radius-app': t.geometry.radiusApp,
    '--theme-radius-panel': t.geometry.radiusPanel,
    '--theme-radius-control': t.geometry.radiusControl,
    '--theme-radius-input': t.geometry.radiusInput,
    '--theme-radius-pill': t.geometry.radiusPill,
    '--theme-border-width': t.geometry.borderWidth,
    '--theme-focus-ring-width': t.geometry.focusRingWidth,

    // Effects
    '--theme-shadow-panel': t.effects.shadowPanel,
    '--theme-shadow-floating': t.effects.shadowFloating,
    '--theme-glass-blur': t.effects.glassBlur,
    '--theme-surface-opacity': String(t.effects.surfaceOpacity || 1),
    '--theme-transition-duration': t.effects.transitionDuration,

    // Legacy backward-compatibility variables
    '--color-base': t.colors.bgBase,
    '--color-secondary': t.colors.bgSurface,
    '--color-surface': t.colors.bgElevated,
    '--color-border': t.colors.borderSubtle,
    '--color-border-hover': t.colors.borderStrong,
    '--color-txt': t.colors.textPrimary,
    '--color-txt-muted': t.colors.textMuted,
    '--color-accent': t.colors.accentPrimary,
    '--color-accent-hover': t.colors.accentHover,
    '--color-accent-subtle': t.colors.accentMuted,
    '--checker-1': t.colors.checkerLight,
    '--checker-2': t.colors.checkerDark,
  };

  return vars;
}
