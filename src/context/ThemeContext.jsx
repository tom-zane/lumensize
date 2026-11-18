import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  getThemeById,
  themeToCssVariables,
} from '../themes/index.js';

const ACTIVE_THEME_KEY = 'lumensize_theme_id_v2';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Active theme ID
  const [themeId, setThemeIdState] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_THEME_KEY);
      if (saved && BUILTIN_THEMES.some((t) => t.meta.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return DEFAULT_THEME_ID;
  });

  // Active resolved theme
  const activeTheme = useMemo(() => {
    return getThemeById(themeId);
  }, [themeId]);

  // Persist active theme ID
  const setThemeId = useCallback((id) => {
    setThemeIdState(id);
    try {
      localStorage.setItem(ACTIVE_THEME_KEY, id);
    } catch (e) {
      console.warn('Failed to save active theme ID:', e);
    }
  }, []);

  // Apply CSS Variables and root classes whenever activeTheme changes
  useEffect(() => {
    if (!activeTheme) return;

    const root = document.documentElement;
    const cssVars = themeToCssVariables(activeTheme);

    // Apply all CSS variables
    Object.entries(cssVars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });

    // Root metadata attributes
    root.setAttribute('data-theme-id', activeTheme.meta.id);
    root.setAttribute('data-theme-category', activeTheme.meta.category);

    // Dark/Light root class determination
    root.classList.remove('dark', 'light');
    const isLight =
      activeTheme.meta.category === 'light' ||
      activeTheme.meta.category === 'editorial' ||
      activeTheme.colors.bgBase.toLowerCase() === '#ffffff' ||
      activeTheme.colors.bgBase.toLowerCase() === '#faf8f5' ||
      activeTheme.colors.bgBase.toLowerCase() === '#f8f7f4' ||
      activeTheme.colors.bgBase.toLowerCase() === '#f2f5f0' ||
      activeTheme.colors.bgBase.toLowerCase() === '#f3f5f0' ||
      activeTheme.colors.bgBase.toLowerCase() === '#f4f4f6' ||
      activeTheme.colors.bgBase.toLowerCase() === '#eff4f9' ||
      activeTheme.colors.bgBase.toLowerCase() === '#fbf9f5' ||
      activeTheme.colors.bgBase.toLowerCase() === '#e5e7eb';

    root.classList.add(isLight ? 'light' : 'dark');

    // Dynamic Google Fonts injection
    const googleFontsUrl = activeTheme.typography?.googleFontsUrl;
    let linkEl = document.getElementById('lumensize-dynamic-theme-font');

    if (googleFontsUrl) {
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.id = 'lumensize-dynamic-theme-font';
        linkEl.rel = 'stylesheet';
        document.head.appendChild(linkEl);
      }
      if (linkEl.href !== googleFontsUrl) {
        linkEl.href = googleFontsUrl;
      }
    } else if (linkEl) {
      linkEl.remove();
    }
  }, [activeTheme]);

  const value = {
    theme: activeTheme,
    themeId,
    setThemeId,
    allThemes: BUILTIN_THEMES,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
