/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic Theme Surfaces
        base: 'var(--theme-bg-base)',
        surface: 'var(--theme-bg-surface)',
        elevated: 'var(--theme-bg-elevated)',
        overlay: 'var(--theme-bg-overlay)',
        canvas: 'var(--theme-bg-canvas)',
        secondary: 'var(--theme-bg-surface)', // backward compatibility

        // Semantic Theme Borders & Dividers
        subtle: 'var(--theme-border-subtle)',
        border: {
          DEFAULT: 'var(--theme-border-subtle)',
          subtle: 'var(--theme-border-subtle)',
          strong: 'var(--theme-border-strong)',
          focus: 'var(--theme-border-focus)',
          hover: 'var(--theme-border-strong)',
        },

        // Semantic Theme Typography Ink
        txt: {
          DEFAULT: 'var(--theme-text-primary)',
          primary: 'var(--theme-text-primary)',
          secondary: 'var(--theme-text-secondary)',
          muted: 'var(--theme-text-muted)',
          inverse: 'var(--theme-text-inverse)',
        },

        // Brand & Interactive Accents
        accent: {
          DEFAULT: 'var(--theme-accent-primary)',
          hover: 'var(--theme-accent-hover)',
          muted: 'var(--theme-accent-muted)',
          subtle: 'var(--theme-accent-muted)',
          foreground: 'var(--theme-accent-foreground)',
        },

        // Telemetry & Status
        success: 'var(--theme-success)',
        warning: 'var(--theme-warning)',
        danger: 'var(--theme-danger)',
        info: 'var(--theme-info)',
      },
      textColor: {
        primary: 'var(--theme-text-primary)',
        secondary: 'var(--theme-text-secondary)',
        muted: 'var(--theme-text-muted)',
        inverse: 'var(--theme-text-inverse)',
      },
      borderColor: {
        subtle: 'var(--theme-border-subtle)',
        strong: 'var(--theme-border-strong)',
        focus: 'var(--theme-border-focus)',
      },
      fontFamily: {
        title: 'var(--theme-font-title)',
        heading: 'var(--theme-font-heading)',
        ui: 'var(--theme-font-ui)',
        sans: 'var(--theme-font-ui)',
        mono: 'var(--theme-font-mono)',
      },
      borderRadius: {
        app: 'var(--theme-radius-app)',
        panel: 'var(--theme-radius-panel)',
        control: 'var(--theme-radius-control)',
        input: 'var(--theme-radius-input)',
        pill: 'var(--theme-radius-pill)',
        xs: 'var(--theme-radius-input)',
        sm: 'var(--theme-radius-control)',
        md: 'var(--theme-radius-panel)',
      },
      boxShadow: {
        panel: 'var(--theme-shadow-panel)',
        floating: 'var(--theme-shadow-floating)',
      },
      borderWidth: {
        DEFAULT: 'var(--theme-border-width)',
        1: '1px',
        2: '2px',
      },
      backdropBlur: {
        glass: 'var(--theme-glass-blur)',
      },
      transitionDuration: {
        theme: 'var(--theme-transition-duration)',
      },
    },
  },
  plugins: [],
};
