import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", "[data-theme='dark']"],
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
        /* ══════════════════════════════════════════════════════════
           PURE ONYX BRAND COLORS (V3)
           ══════════════════════════════════════════════════════════ */
        gold: {
          DEFAULT: "#c69c6d",
          hover: "#b8894d",
          subtle: "rgba(198, 156, 109, 0.12)",
        },
        // Chart colors (preserved)
        olive: "#5c7c5c",
        bronze: "#8b7355",
        champagne: "#d4b896",
        
        /* ══════════════════════════════════════════════════════════
           TAILWIND/SHADCN SEMANTIC COLORS (V3)
           ══════════════════════════════════════════════════════════ */
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
        
        /* ══════════════════════════════════════════════════════════
           STATUS COLORS (V3)
           ══════════════════════════════════════════════════════════ */
        success: {
          DEFAULT: "var(--status-success)",
          bg: "var(--status-success-bg)",
        },
        warning: {
          DEFAULT: "var(--status-warning)",
          bg: "var(--status-warning-bg)",
        },
        danger: {
          DEFAULT: "var(--status-error)",
          bg: "var(--status-error-bg)",
        },
        info: {
          DEFAULT: "var(--status-info)",
          bg: "var(--status-info-bg)",
        },
        
        /* ══════════════════════════════════════════════════════════
           TEXT COLORS (V3)
           ══════════════════════════════════════════════════════════ */
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        
        /* ══════════════════════════════════════════════════════════
           BACKGROUND COLORS (V3)
           ══════════════════════════════════════════════════════════ */
        surface: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          card: "var(--bg-card)",
          sidebar: "var(--bg-sidebar)",
          hover: "var(--bg-hover)",
          active: "var(--bg-active)",
          elevated: "var(--bg-elevated)",
        },
      },
      
      /* ══════════════════════════════════════════════════════════
         BORDER RADIUS (V3)
         ══════════════════════════════════════════════════════════ */
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "12px",
        "3xl": "16px",
        full: "9999px",
      },
      
      /* ══════════════════════════════════════════════════════════
         BOX SHADOWS (V3)
         ══════════════════════════════════════════════════════════ */
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      
      /* ══════════════════════════════════════════════════════════
         TYPOGRAPHY (V3)
         ══════════════════════════════════════════════════════════ */
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"SF Mono"', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '1.4', fontWeight: '400' }],
        'sm': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        'base': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'md': ['15px', { lineHeight: '1.5', fontWeight: '500' }],
        'lg': ['16px', { lineHeight: '1.5', fontWeight: '600' }],
        'xl': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        '2xl': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        '3xl': ['28px', { lineHeight: '1.25', fontWeight: '700' }],
        '4xl': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
      },
      
      /* ══════════════════════════════════════════════════════════
         SPACING (V3 - 4px Base Grid)
         ══════════════════════════════════════════════════════════ */
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      
      /* ══════════════════════════════════════════════════════════
         TRANSITIONS (V3)
         ══════════════════════════════════════════════════════════ */
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
        slow: "300ms",
      },
      
      /* ══════════════════════════════════════════════════════════
         ANIMATIONS (V3)
         ══════════════════════════════════════════════════════════ */
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
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(198, 156, 109, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(198, 156, 109, 0.6)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-in-out",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      
      /* ══════════════════════════════════════════════════════════
         Z-INDEX (V3)
         ══════════════════════════════════════════════════════════ */
      zIndex: {
        'dropdown': '10',
        'sticky': '20',
        'fixed': '30',
        'modal-backdrop': '40',
        'modal': '50',
        'popover': '60',
        'tooltip': '70',
        'toast': '80',
        'maximum': '100',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
