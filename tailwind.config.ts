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
        /* === SEMANTIC TEXT COLORS === */
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          tertiary: "hsl(var(--text-tertiary))",
          muted: "hsl(var(--text-muted))",
          inverse: "hsl(var(--text-inverse))",
        },
        
        /* === SEMANTIC SURFACE COLORS === */
        surface: {
          0: "hsl(var(--surface-0))",
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
          elevated: "hsl(var(--surface-elevated))",
          overlay: "hsl(var(--surface-overlay))",
          // Legacy HEX vars (used directly via var())
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
        
        /* === BRAND/ACTION COLORS === */
        "brand-primary": {
          DEFAULT: "hsl(var(--brand-primary))",
          hover: "hsl(var(--brand-primary-hover))",
          foreground: "hsl(var(--brand-primary-foreground))",
        },
        "brand-teal": {
          DEFAULT: "hsl(var(--brand-teal))",
          hover: "hsl(var(--brand-teal-hover))",
        },
        
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
         CATALYST TYPOGRAPHY SYSTEM — Enterprise-Grade
         ═══════════════════════════════════════════════════════════════ */
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["SF Mono", "Monaco", "Consolas", "monospace"],
        display: ["Inter", "-apple-system", "sans-serif"],
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
        
        /* Semantic font sizes */
        overline: ["0.75rem", { lineHeight: "1.25rem", letterSpacing: "0.08em", fontWeight: "600" }],
        title: ["1.125rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        subtitle: ["0.9375rem", { lineHeight: "1.375rem", letterSpacing: "-0.005em", fontWeight: "500" }],
        kpi: ["2.5rem", { lineHeight: "2.75rem", letterSpacing: "-0.02em", fontWeight: "700" }],
        "kpi-sm": ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.015em", fontWeight: "600" }],
        body: ["0.875rem", { lineHeight: "1.25rem" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.125rem" }],
        caption: ["0.8125rem", { lineHeight: "1.125rem", fontWeight: "500" }],
        label: ["0.8125rem", { lineHeight: "1rem", fontWeight: "500" }],
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
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "orbit": {
          "0%": { transform: "rotate(0deg) translateX(var(--orbit-radius, 24px)) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(var(--orbit-radius, 24px)) rotate(-360deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.3)", opacity: "0" },
        },
      },
      
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "orbit": "orbit 1.5s linear infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
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
