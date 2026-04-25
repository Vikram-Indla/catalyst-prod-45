import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      /* ═══════════════════════════════════════════════════════════════
         CATALYST V5 COLOR SYSTEM — All semantic tokens mapped
         ═══════════════════════════════════════════════════════════════ */
      colors: {
        /* ═══════════════════════════════════════════════════════════════
           CATALYST V5 — AWARD-GRADE TOKEN SYSTEM
           ═══════════════════════════════════════════════════════════════ */
        
        /* === V5 SURFACE TOKENS === */
        "bg-app": "var(--bg-app)",
        "bg-0": "var(--bg-0)",
        "bg-1": "var(--bg-1)",
        "bg-2": "var(--bg-2)",
        "bg-3": "var(--bg-3)",
        
        /* === V5 TEXT LADDER === */
        "text-1": "var(--text-1)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        "text-4": "var(--text-4)",
        
        /* === V5 STROKE TOKENS === */
        "stroke-1": "var(--stroke-1)",
        "stroke-2": "var(--stroke-2)",
        
        /* === SEMANTIC TEXT COLORS (HSL versions) === */
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          tertiary: "hsl(var(--text-tertiary))",
          muted: "hsl(var(--text-muted))",
          inverse: "var(--text-inverse)",
        },
        
        /* === SEMANTIC SURFACE COLORS === */
        surface: {
          0: "hsl(var(--surface-0))",
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
          elevated: "hsl(var(--surface-elevated))",
          overlay: "hsl(var(--surface-overlay))",
          card: "var(--surface-card)",
          muted: "var(--surface-muted)",
          subtle: "var(--surface-subtle)",
          hover: "var(--surface-hover)",
        },
        
        /* === SEMANTIC BORDER COLORS === */
        "border-subtle": "hsl(var(--border-subtle))",
        "border-default": "hsl(var(--border-default))",
        "border-strong": "hsl(var(--border-strong))",
        "border-focus": "hsl(var(--border-focus))",
        
        /* === BRAND/ACTION COLORS (Catalyst V5 Spec) === */
        "brand-primary": {
          DEFAULT: "hsl(var(--brand-primary))",
          hover: "hsl(var(--brand-primary-hover))",
          light: "hsl(var(--brand-primary-light))",
          dark: "hsl(var(--brand-primary-dark))",
          foreground: "hsl(var(--brand-primary-foreground))",
        },
        "brand-teal": {
          DEFAULT: "hsl(var(--brand-teal))",
          hover: "hsl(var(--brand-teal-hover))",
          light: "hsl(var(--brand-teal-light))",
        },
        
        /* === AI PURPLE (A5 Spec) === */
        "ai-purple": {
          DEFAULT: "hsl(var(--ai-purple))",
          light: "hsl(var(--ai-purple-light))",
          dark: "hsl(var(--ai-purple-dark))",
        },
        
        /* === SEMANTIC LIGHT BACKGROUNDS (A2 Spec) === */
        "sem-success-light": "var(--sem-success-light)",
        "sem-warning-light": "var(--sem-warning-light)",
        "sem-danger-light": "var(--sem-danger-light)",
        "sem-info-light": "var(--sem-info-light)",
        
        /* === STATE COLORS === */
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          bg: "hsl(var(--success-bg) / 0.08)",
          border: "hsl(var(--success-border) / 0.20)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          bg: "hsl(var(--warning-bg) / 0.08)",
          border: "hsl(var(--warning-border) / 0.20)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
          bg: "hsl(var(--danger-bg) / 0.08)",
          border: "hsl(var(--danger-border) / 0.20)",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          bg: "hsl(var(--info-bg) / 0.08)",
          border: "hsl(var(--info-border) / 0.20)",
        },
        
        /* === CATALYST V5 SEMANTIC COLORS (Premium, muted in dark mode) === */
        sem: {
          danger: "var(--sem-danger)",
          warning: "var(--sem-warning)",
          success: "var(--sem-success)",
          info: "var(--sem-info)",
          critical: "var(--sem-critical)",
          blocked: "var(--sem-blocked)",
          overdue: "var(--sem-overdue)",
          high: "var(--sem-high)",
          medium: "var(--sem-medium)",
          low: "var(--sem-low)",
          done: "var(--sem-done)",
          "danger-bg": "var(--sem-danger-bg)",
          "warning-bg": "var(--sem-warning-bg)",
          "success-bg": "var(--sem-success-bg)",
          "info-bg": "var(--sem-info-bg)",
          "critical-bg": "var(--sem-critical-bg)",
          "blocked-bg": "var(--sem-blocked-bg)",
          "overdue-bg": "var(--sem-overdue-bg)",
          "high-bg": "var(--sem-high-bg)",
          "medium-bg": "var(--sem-medium-bg)",
          "low-bg": "var(--sem-low-bg)",
          "done-bg": "var(--sem-done-bg)",
        },
        
        /* === V5 ROW STATES === */
        "row-hover": "var(--row-hover)",
        "row-selected": "var(--row-selected)",
        "row-active": "var(--row-active)",
        
        /* === V5 INPUT TOKENS === */
        "input-bg": "var(--input-bg)",
        "input-bd": "var(--input-bd)",
        "input-focus": "var(--input-focus)",
        
        /* === V5 CHART PALETTE === */
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
          6: "var(--chart-6)",
          7: "var(--chart-7)",
          8: "var(--chart-8)",
        },
        
        /* === V5 DIVIDER === */
        divider: "var(--divider)",
        
        /* === V5 FOREGROUND LADDER (aliases) === */
        fg: {
          1: "var(--text-1)",
          2: "var(--text-2)",
          3: "var(--text-3)",
          4: "var(--text-4)",
        },
        
        /* === FOCUS & OVERLAY === */
        "focus-ring": "hsl(var(--focus-ring))",
        overlay: "hsl(var(--overlay))",

        /* === GRAY SCALE — Pure Onyx === */
        gray: {
          50: "hsl(0 0% 98%)",
          100: "hsl(0 0% 96%)",
          200: "hsl(0 0% 90%)",
          300: "hsl(0 0% 83%)",
          400: "hsl(0 0% 64%)",
          500: "hsl(0 0% 45%)",
          600: "hsl(0 0% 32%)",
          700: "hsl(0 0% 25%)",
          800: "hsl(0 0% 15%)",
          900: "hsl(0 0% 9%)",
          950: "hsl(0 0% 4%)",
        },
        
        /* Slate override - Pure Onyx */
        slate: {
          50: "hsl(0 0% 98%)",
          100: "hsl(0 0% 96%)",
          200: "hsl(0 0% 90%)",
          300: "hsl(0 0% 83%)",
          400: "hsl(0 0% 64%)",
          500: "hsl(0 0% 45%)",
          600: "hsl(0 0% 32%)",
          700: "hsl(0 0% 25%)",
          800: "hsl(0 0% 15%)",
          900: "hsl(0 0% 9%)",
          950: "hsl(0 0% 4%)",
        },
        
        /* Zinc override - Pure Onyx */
        zinc: {
          50: "hsl(0 0% 98%)",
          100: "hsl(0 0% 96%)",
          200: "hsl(0 0% 90%)",
          300: "hsl(0 0% 83%)",
          400: "hsl(0 0% 64%)",
          500: "hsl(0 0% 45%)",
          600: "hsl(0 0% 32%)",
          700: "hsl(0 0% 25%)",
          800: "hsl(0 0% 15%)",
          900: "hsl(0 0% 9%)",
          950: "hsl(0 0% 4%)",
        },
        
        /* Neutral override - Pure Onyx */
        neutral: {
          50: "hsl(0 0% 98%)",
          100: "hsl(0 0% 96%)",
          200: "hsl(0 0% 90%)",
          300: "hsl(0 0% 83%)",
          400: "hsl(0 0% 64%)",
          500: "hsl(0 0% 45%)",
          600: "hsl(0 0% 32%)",
          700: "hsl(0 0% 25%)",
          800: "hsl(0 0% 15%)",
          900: "hsl(0 0% 9%)",
          950: "hsl(0 0% 4%)",
        },
        
        /* Stone override - Pure Onyx */
        stone: {
          50: "hsl(0 0% 98%)",
          100: "hsl(0 0% 96%)",
          200: "hsl(0 0% 90%)",
          300: "hsl(0 0% 83%)",
          400: "hsl(0 0% 64%)",
          500: "hsl(0 0% 45%)",
          600: "hsl(0 0% 32%)",
          700: "hsl(0 0% 25%)",
          800: "hsl(0 0% 15%)",
          900: "hsl(0 0% 9%)",
          950: "hsl(0 0% 4%)",
        },
        
        /* Brand colors - Blue + Teal Professional */
        blue: {
          DEFAULT: "hsl(217 91% 53%)",
          50: "hsl(214 100% 97%)",
          100: "hsl(214 95% 93%)",
          200: "hsl(213 97% 87%)",
          300: "hsl(212 96% 78%)",
          400: "hsl(213 94% 68%)",
          500: "hsl(217 91% 60%)",
          600: "hsl(217 91% 53%)",
          700: "hsl(217 91% 45%)",
          800: "hsl(217 88% 35%)",
          900: "hsl(221 83% 28%)",
          950: "hsl(224 71% 18%)",
          link: "hsl(var(--link-color))",
          "link-hover": "hsl(var(--link-color-hover))",
        },
        
        /* Teal - Success brand */
        teal: {
          DEFAULT: "hsl(173 58% 39%)",
          50: "hsl(166 76% 97%)",
          100: "hsl(167 85% 89%)",
          200: "hsl(168 84% 78%)",
          300: "hsl(171 77% 64%)",
          400: "hsl(172 66% 50%)",
          500: "hsl(173 58% 50%)",
          600: "hsl(173 58% 39%)",
          700: "hsl(173 58% 33%)",
          800: "hsl(173 55% 27%)",
          900: "hsl(174 52% 23%)",
          950: "hsl(176 57% 13%)",
        },
        
        /* Legacy brand colors */
        gold: {
          DEFAULT: "hsl(34 40% 60%)",
          link: "hsl(217 91% 53%)",
          "link-hover": "hsl(217 91% 45%)",
        },
        olive: {
          DEFAULT: "hsl(120 26% 42%)",
        },
        bronze: {
          DEFAULT: "hsl(30 24% 44%)",
        },

        /* Shadcn semantic colors */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        
        /* Legacy status colors - using HEX vars directly (not HSL triplets) */
        status: {
          success: {
            DEFAULT: "var(--status-success)",
            bg: "var(--status-success-bg)",
            border: "var(--status-success-border)",
          },
          warning: {
            DEFAULT: "var(--status-warning)",
            bg: "var(--status-warning-bg)",
            border: "var(--status-warning-border)",
          },
          danger: {
            DEFAULT: "var(--status-danger)",
            bg: "var(--status-danger-bg)",
            border: "var(--status-danger-border)",
          },
          info: {
            DEFAULT: "var(--status-info)",
            bg: "var(--status-info-bg)",
            border: "var(--status-info-border)",
          },
        },
        
        /* Legacy brand object */
        brand: {
          primary: {
            DEFAULT: "hsl(var(--brand-primary))",
            hover: "hsl(var(--brand-primary-hover))",
            pale: "hsl(var(--brand-primary) / 0.08)",
            border: "hsl(var(--brand-primary) / 0.20)",
          },
          blue: "hsl(217 91% 53%)",
          teal: "hsl(173 58% 39%)",
          olive: "hsl(120 26% 42%)",
          bronze: "hsl(30 24% 44%)",
          gold: "hsl(34 40% 60%)",
          champagne: "hsl(34 40% 71%)",
        },
        
        /* Secondary palette */
        'secondary-blue': 'hsl(217 91% 53%)',
        'secondary-teal': 'hsl(173 58% 39%)',
        'secondary-olive': 'hsl(120 26% 42%)',
        'secondary-bronze': 'hsl(30 24% 44%)',
        'secondary-champagne': 'hsl(34 40% 71%)',
        'secondary-green': 'hsl(var(--secondary-green))',
        
        /* Legacy surface tokens */
        'surface-bg': 'var(--surface-bg)',
        'surface-card': 'var(--surface-card)',
      },
      
      /* ═══════════════════════════════════════════════════════════════
         CATALYST V12 TYPOGRAPHY SYSTEM — Sora / Inter / JetBrains Mono
         Sora:           Headings, display text, page titles
         Inter:          Body, UI labels, field values, navigation
         JetBrains Mono: Data, code, IDs, monospace content
         ═══════════════════════════════════════════════════════════════ */
      fontFamily: {
        sans:    ["var(--ds-font-family-body)",       "system-ui", "-apple-system", "sans-serif"],
        body:    ["var(--ds-font-family-body)",       "system-ui", "-apple-system", "sans-serif"],
        heading: ["var(--ds-font-family-heading)",    "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--ds-font-family-heading)",    "system-ui", "-apple-system", "sans-serif"],
        serif:   ["Georgia", "'Times New Roman'", "serif"],
        mono:    ["var(--ds-font-family-monospaced)", "ui-monospace", "SF Mono", "monospace"],
      },
      
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],              // 11px
        xs: ["0.75rem", { lineHeight: "1rem" }],                   // 12px
        sm: ["0.8125rem", { lineHeight: "1.125rem" }],             // 13px
        base: ["0.875rem", { lineHeight: "1.25rem" }],             // 14px
        md: ["0.9375rem", { lineHeight: "1.375rem" }],             // 15px
        lg: ["1rem", { lineHeight: "1.5rem" }],                    // 16px
        xl: ["1.125rem", { lineHeight: "1.5rem" }],                // 18px
        "2xl": ["1.25rem", { lineHeight: "1.75rem" }],             // 20px
        "3xl": ["1.75rem", { lineHeight: "2rem" }],                // 28px
        "4xl": ["2rem", { lineHeight: "2.25rem" }],                // 32px
        "5xl": ["2.5rem", { lineHeight: "2.75rem" }],              // 40px

        /* ── Semantic font sizes (Sora headings / Inter body) ── */
        overline: ["0.75rem", { lineHeight: "1.25rem", letterSpacing: "0.08em", fontWeight: "600" }],
        title: ["1.125rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        subtitle: ["0.9375rem", { lineHeight: "1.375rem", letterSpacing: "-0.005em", fontWeight: "500" }],
        kpi: ["2.5rem", { lineHeight: "2.75rem", letterSpacing: "-0.02em", fontWeight: "700" }],
        "kpi-sm": ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.015em", fontWeight: "600" }],
        body: ["0.875rem", { lineHeight: "1.25rem" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.125rem" }],
        caption: ["0.8125rem", { lineHeight: "1.125rem", fontWeight: "500" }],
        label: ["0.8125rem", { lineHeight: "1rem", fontWeight: "500" }],

        /* ── Issue view semantic sizes (V12 design spec) ── */
        "issue-title": ["1.5rem", { lineHeight: "1.75rem", fontWeight: "650" }],       // 24px — Sora
        "section-heading": ["1rem", { lineHeight: "1.25rem", fontWeight: "500" }],      // 16px — Sora
        "field-label": ["0.875rem", { lineHeight: "1.167rem", fontWeight: "500" }],     // 14px — Inter
        "field-value": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "400" }],      // 14px — Inter
        "breadcrumb": ["0.75rem", { lineHeight: "1rem", fontWeight: "400" }],           // 12px — Inter
        "cta": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "500" }],              // 14px — Inter
        "col-header": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.03em", fontWeight: "650" }],  // 12px — Inter
        "status-lozenge": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.03em", fontWeight: "700" }], // 11px

        /* ProdHub table font sizes */
        "table-xs": ["11px", { lineHeight: "1.2" }],
        "table-sm": ["12px", { lineHeight: "1.4" }],
        "table-base": ["13px", { lineHeight: "1.4" }],
      },
      
      spacing: {
        "row-compact": "32px",
        "row-standard": "40px",
        "row-comfortable": "48px",
      },
      
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
      
      boxShadow: {
        xs: "var(--shadow-elev-1)",
        sm: "var(--shadow-elev-1)",
        card: "var(--shadow-elev-1)",
        DEFAULT: "var(--shadow-elev-1)",
        md: "var(--shadow-elev-2)",
        elevated: "var(--shadow-elev-2)",
        lg: "var(--shadow-elev-3)",
        hover: "var(--shadow-elev-3)",
        brand: "var(--shadow-brand)",
        "inner-sm": "inset 0 1px 2px hsl(var(--shadow-color) / 0.03)",
        "inner-md": "inset 0 2px 4px hsl(var(--shadow-color) / 0.05)",
        // Requirement Assist enhanced shadows
        "ra-card": "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
        "ra-card-hover": "0 4px 6px rgba(0,0,0,0.05), 0 10px 20px rgba(0,0,0,0.08)",
        "ra-panel": "-4px 0 24px rgba(0,0,0,0.08)",
        "ra-button": "0 4px 14px rgba(37, 99, 235, 0.25)",
        "ra-badge-epic": "0 2px 4px rgba(139, 92, 246, 0.3)",
        "ra-badge-feature": "0 2px 4px rgba(20, 184, 166, 0.3)",
        "ra-badge-story": "0 2px 4px rgba(16, 185, 129, 0.3)",
      },
      
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(4px)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-out-right": {
          "0%": { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(100%)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "gauge-draw": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "var(--gauge-value, 0)" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-value, 100%)" },
        },
        "orbit": {
          "0%": { transform: "rotate(0deg) translateX(var(--orbit-radius, 24px)) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(var(--orbit-radius, 24px)) rotate(-360deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.3)", opacity: "0" },
        },
        "toast-slide-in": {
          "0%": { opacity: "0", transform: "translateX(100%) translateY(0)" },
          "100%": { opacity: "1", transform: "translateX(0) translateY(0)" },
        },
        "toast-slide-out": {
          "0%": { opacity: "1", transform: "translateX(0) translateY(0)" },
          "100%": { opacity: "0", transform: "translateX(100%) translateY(0)" },
        },
        "modal-backdrop-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "modal-content-in": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "checkmark": {
          "0%": { strokeDashoffset: "16", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { strokeDashoffset: "0", opacity: "1" },
        },
        "toggle-on": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        "toggle-off": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.4s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "shimmer": "shimmer 1.5s infinite",
        "count-up": "count-up 0.5s ease-out",
        "gauge-draw": "gauge-draw 1s ease-out forwards",
        "progress-fill": "progress-fill 0.6s ease-out forwards",
        "orbit": "orbit 1.5s linear infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "toast-in": "toast-slide-in 0.3s ease-out",
        "toast-out": "toast-slide-out 0.3s ease-out",
        "modal-backdrop": "modal-backdrop-in 0.2s ease-out",
        "modal-content": "modal-content-in 0.2s ease-out",
        "checkmark": "checkmark 0.3s ease-out forwards",
        "toggle-on": "toggle-on 0.2s ease-out",
        "toggle-off": "toggle-off 0.2s ease-out",
      },
      
      /* Transition timing functions */
      transitionTimingFunction: {
        "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "spring": "cubic-bezier(0.5, 1.6, 0.4, 0.7)",
        "bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      
      /* Spacing - 4px base grid */
      spacing: {
        "0.5": "2px",
        "1": "4px",
        "1.5": "6px",
        "2": "8px",
        "2.5": "10px",
        "3": "12px",
        "3.5": "14px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "7": "28px",
        "8": "32px",
        "9": "36px",
        "10": "40px",
        "11": "44px",
        "12": "48px",
        "14": "56px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    /* Catalyst Typography Plugin */
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".c-tabular-nums": {
          "font-variant-numeric": "tabular-nums",
        },
      });
    }),
  ],
} satisfies Config;
