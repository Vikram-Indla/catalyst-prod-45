import type { Config } from "tailwindcss";

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
    extend: {
      /* ═══════════════════════════════════════════════════════════════
         OVERRIDE GREY SCALE — Pure Onyx Neutrals
         This replaces Tailwind's default grey with high-contrast colors
         ═══════════════════════════════════════════════════════════════ */
      colors: {
        /* Gray scale override - Pure Onyx */
        gray: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",    /* Was light, now readable */
          700: "#404040",    /* Was medium, now dark */
          800: "#262626",
          900: "#171717",    /* Near black */
          950: "#0a0a0a",    /* True black */
        },
        
        /* Slate override - also Pure Onyx */
        slate: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        
        /* Zinc override - Pure Onyx */
        zinc: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        
        /* Neutral override - Pure Onyx */
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        
        /* Stone override - Pure Onyx */
        stone: {
          50: "#faf7f1",     /* Your cream! */
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        
        /* Brand colors - Catalyst Golden Hour */
        gold: {
          DEFAULT: "#c69c6d",
          50: "#fdf8f3",
          100: "#f9eee0",
          200: "#f2dbc1",
          300: "#e8c298",
          400: "#d4a66f",
          500: "#c69c6d",
          600: "#b8894d",
          700: "#9a7040",
          800: "#7d5a38",
          900: "#664a30",
          950: "#382618",
          link: "hsl(var(--gold-link))",
          "link-hover": "hsl(var(--gold-link-hover))",
        },
        
        /* Olive - Primary brand */
        olive: {
          DEFAULT: "#5c7c5c",
          50: "#f4f7f4",
          100: "#e6ece6",
          200: "#cdd9cd",
          300: "#a8bea8",
          400: "#7d9c7d",
          500: "#5c7c5c",
          600: "#4a6a4a",
          700: "#3d563d",
          800: "#334533",
          900: "#2b392b",
          950: "#151d15",
        },
        
        /* Bronze - Secondary brand */
        bronze: {
          DEFAULT: "#8b7355",
          50: "#f9f7f4",
          100: "#f0ebe3",
          200: "#e0d5c7",
          300: "#ccb9a3",
          400: "#b69a7a",
          500: "#8b7355",
          600: "#7a6349",
          700: "#65503d",
          800: "#534235",
          900: "#46382e",
          950: "#251d17",
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
        
        /* Surface colors for cards/containers */
        surface: {
          card: "var(--surface-card)",
          muted: "var(--surface-muted)",
          subtle: "var(--surface-subtle)",
          hover: "var(--surface-hover)",
        },
        
        /* Brand primary alias */
        brand: {
          primary: {
            DEFAULT: "#5c7c5c",
            hover: "#4a6a4a",
            pale: "rgba(92, 124, 92, 0.08)",
            border: "rgba(92, 124, 92, 0.2)",
          },
          olive: "#5c7c5c",
          bronze: "#8b7355",
          gold: "#c69c6d",
          champagne: "#d4b896",
        },
        
        /* Status colors */
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
        
        /* Secondary palette - Catalyst Golden Hour */
        'secondary-olive': '#5c7c5c',
        'secondary-bronze': '#8b7355',
        'secondary-champagne': '#d4b896',
        
        /* Surface tokens */
        'surface-bg': 'var(--surface-bg)',
        'surface-card': 'var(--surface-card)',
        
        /* Text colors from CSS vars */
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
        },
      },
      
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["SF Mono", "Monaco", "Consolas", "monospace"],
        display: ["Inter", "-apple-system", "sans-serif"],
      },
      
      fontSize: {
        "2xs": "11px",
        xs: "12px",
        sm: "13px",
        base: "14px",
        md: "15px",
        lg: "16px",
        xl: "18px",
        "2xl": "20px",
        "3xl": "28px",
        "4xl": "32px",
      },
      
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
      
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        card: "var(--shadow-card)",
        DEFAULT: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        hover: "var(--shadow-hover)",
        brand: "var(--shadow-brand)",
        md: "0 4px 6px rgba(0,0,0,0.07)",
        lg: "0 10px 15px rgba(0,0,0,0.1)",
        /* Inner shadow for recessed containers */
        "inner-sm": "inset 0 1px 2px rgba(0,0,0,0.03)",
        "inner-md": "inset 0 2px 4px rgba(0,0,0,0.05)",
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
      },
      
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
