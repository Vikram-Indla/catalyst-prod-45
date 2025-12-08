import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
      colors: {
        // Enterprise Gold Brand Colors
        brand: {
          dark: "hsl(var(--brand-dark))",
          gold: "hsl(var(--brand-gold))",
          "gold-hover": "hsl(var(--brand-gold-hover))",
          "gold-pale": "hsl(var(--brand-gold-pale))",
          "gold-border": "hsl(var(--brand-gold-border))",
        },
        // Text Colors
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          tertiary: "hsl(var(--text-tertiary))",
          muted: "hsl(var(--text-muted))",
          inverse: "hsl(var(--text-inverse))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "hsl(var(--primary-50))",
          100: "hsl(var(--primary-100))",
          200: "hsl(var(--primary-200))",
          600: "hsl(var(--primary-600))",
          700: "hsl(var(--primary-700))",
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
        success: {
          DEFAULT: "hsl(var(--success))",
          600: "hsl(var(--success-600))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          600: "hsl(var(--warning-600))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          600: "hsl(var(--info-600))",
        },
        health: {
          green: "hsl(var(--health-green))",
          yellow: "hsl(var(--health-yellow))",
          red: "hsl(var(--health-red))",
          gray: "hsl(var(--health-gray))",
          "on-track": "hsl(var(--health-on-track))",
          "at-risk": "hsl(var(--health-at-risk))",
          "off-track": "hsl(var(--health-off-track))",
          unknown: "hsl(var(--health-unknown))",
        },
        workitem: {
          theme: "hsl(var(--workitem-theme))",
          epic: "hsl(var(--workitem-epic))",
          feature: "hsl(var(--workitem-feature))",
          story: "hsl(var(--workitem-story))",
          subtask: "hsl(var(--workitem-subtask))",
          defect: "hsl(var(--workitem-defect))",
        },
        neutral: {
          0: "hsl(var(--neutral-0))",
          50: "hsl(var(--neutral-50))",
          100: "hsl(var(--neutral-100))",
          200: "hsl(var(--neutral-200))",
          300: "hsl(var(--neutral-300))",
          400: "hsl(var(--neutral-400))",
          500: "hsl(var(--neutral-500))",
          600: "hsl(var(--neutral-600))",
          700: "hsl(var(--neutral-700))",
          800: "hsl(var(--neutral-800))",
          900: "hsl(var(--neutral-900))",
        },
        // Golden Hour Secondary Palette - for charts, graphs, reports
        palette: {
          expert: "hsl(var(--palette-expert))",         // #5c7c5c - Olive green
          advanced: "hsl(var(--palette-advanced))",     // #8b7355 - Bronze/brown
          intermediate: "hsl(var(--palette-intermediate))", // #c69c6d - Catalyst gold
          beginner: "hsl(var(--palette-beginner))",     // #d4b896 - Light champagne
          none: "hsl(var(--palette-none))",             // #c8ccd0 - Cool grey
        },
        // Chart colors using Golden Hour palette
        chartGolden: {
          1: "hsl(var(--chart-golden-1))",  // Expert - Olive
          2: "hsl(var(--chart-golden-2))",  // Advanced - Bronze
          3: "hsl(var(--chart-golden-3))",  // Intermediate - Gold
          4: "hsl(var(--chart-golden-4))",  // Beginner - Champagne
          5: "hsl(var(--chart-golden-5))",  // None - Grey
        },
        // Catalyst Toast Colors
        catalyst: {
          black: "#1a1a1a",
        },
        toast: {
          message: "#525252",
          close: "#9ca3af",
          success: {
            bg: "#f0fdf4",
            border: "#22c55e",
            "border-dark": "#16a34a",
            icon: "#15803d",
          },
          error: {
            bg: "#fef2f2",
            border: "#ef4444",
            "border-dark": "#dc2626",
            icon: "#dc2626",
          },
          warning: {
            bg: "#fffbeb",
            border: "#f59e0b",
            "border-dark": "#d97706",
            icon: "#d97706",
          },
        },
        "brand-gold-dark": "#a67c4e",
      },
      borderRadius: {
        none: "0",
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        panel: "var(--shadow-panel)",
        elegant: "var(--shadow-elegant)",
        glow: "var(--shadow-glow)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
        slow: "300ms",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Roboto"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        body: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Roboto"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        heading: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Roboto"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      fontSize: {
        xs: '0.6875rem',    // 11px - Jira Align XS for helpers
        sm: '0.75rem',      // 12px - Jira Align SM for grid cells
        base: '0.8125rem',
        md: '0.875rem',     // 14px - Jira Align MD for row titles
        lg: '1rem',         // 16px - Jira Align LG for page titles
        xl: '1.125rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '1.875rem',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "toast-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-12px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "toast-in": "toast-in 0.3s ease",
        "toast-out": "toast-out 0.2s ease forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
