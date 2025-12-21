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
        
        /* Brand colors */
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
        
        /* Brand primary alias (for bg-brand-primary usage) */
        brand: {
          primary: {
            DEFAULT: "#c69c6d",
            hover: "#b8894d",
            pale: "rgba(198, 156, 109, 0.08)",
            border: "rgba(198, 156, 109, 0.3)",
          },
          dark: "#1a1a1a",
        },
        
        /* Status colors - for bg-status-danger, text-status-success, etc. */
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
        },
      },
      
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["SF Mono", "Monaco", "Consolas", "monospace"],
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
        lg: "8px",
        md: "6px",
        sm: "4px",
        xl: "12px",
      },
      
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        DEFAULT: "0 1px 3px rgba(0,0,0,0.08)",
        md: "0 4px 6px rgba(0,0,0,0.07)",
        lg: "0 10px 15px rgba(0,0,0,0.1)",
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
      },
      
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
