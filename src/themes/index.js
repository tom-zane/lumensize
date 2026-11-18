/**
 * LumenSize Plug-and-Play JSON Theme Engine
 *
 * Automatically discovers all preset JSON theme definitions in the ./presets/ directory
 * using Vite's eager glob import. Adding, editing, or deleting any theme .json file
 * automatically updates the theme library with zero manual registrations.
 */

import { DEFAULT_THEME_SCHEMA, validateAndMergeTheme, themeToCssVariables } from './schema.js';

// Auto-discover all theme JSON files in ./presets
const presetModules = import.meta.glob('./presets/*.json', {
  eager: true,
  import: 'default',
});

export const BUILTIN_THEMES = Object.values(presetModules).map((theme) =>
  validateAndMergeTheme(theme)
);

// Safety fallback so themes are never empty
if (BUILTIN_THEMES.length === 0) {
  BUILTIN_THEMES.push(DEFAULT_THEME_SCHEMA);
}

export const DEFAULT_THEME_ID = 'studio-graphite';

export const THEME_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'glass', label: 'Glass' },
  { id: 'borderless', label: 'Borderless' },
  { id: 'hardware', label: 'Hardware' },
];

export function getThemeById(id) {
  const found = BUILTIN_THEMES.find((t) => t.meta?.id === id);
  if (found) return found;
  return (
    BUILTIN_THEMES.find((t) => t.meta?.id === DEFAULT_THEME_ID) ||
    BUILTIN_THEMES[0] ||
    DEFAULT_THEME_SCHEMA
  );
}

export { DEFAULT_THEME_SCHEMA, validateAndMergeTheme, themeToCssVariables };
