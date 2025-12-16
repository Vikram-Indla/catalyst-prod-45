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
           BRAND COLORS (V2)
           ══════════════════════════════════════════════════════════ */
        brand: {
          dark: "#1A1A1A",
          gold: "#C69C6D",
          "gold-hover": "#B8905F",
          "gold-muted": "rgba(198, 156, 109, 0.15)",
        },
        
        /* ══════════════════════════════════════════════════════════
           SECONDARY PALETTE - Golden Hour (V2)
           ══════════════════════════════════════════════════════════ */
        "secondary-green": "#5C7C5C",
        "secondary-bronze": "#8B7355",
        "secondary-champagne": "#D4B896",
        "secondary-grey": "#C8CCD0",
        
        /* ══════════════════════════════════════════════════════════
           TAILWIND/SHADCN SEMANTIC COLORS (V2)
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
           STATUS COLORS (V2)
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
          DEFAULT: "var(--status-danger)",
          bg: "var(--status-danger-bg)",
        },
        info: {
          DEFAULT: "var(--status-info)",
          bg: "var(--status-info-bg)",
        },
        
        /* ══════════════════════════════════════════════════════════
           SURFACE COLORS (V2)
           ══════════════════════════════════════════════════════════ */
        surface: {
          bg: "var(--surface-bg)",
          elevated: "var(--surface-elevated)",
          subtle: "var(--surface-subtle)",
          hover: "var(--surface-hover)",
          tinted: "var(--surface-tinted)",
        },
        
        /* ══════════════════════════════════════════════════════════
           TEXT COLORS (V2)
           ══════════════════════════════════════════════════════════ */
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
          link: "var(--text-link)",
          "link-hover": "var(--text-link-hover)",
        },
        
        /* ══════════════════════════════════════════════════════════
           BORDER COLORS (V2)
           ══════════════════════════════════════════════════════════ */
        "border-default": "var(--border-default)",
        "border-subtle": "var(--border-subtle)",
        "border-muted": "var(--border-muted)",
        "border-accent": "var(--border-accent)",
        
        /* ══════════════════════════════════════════════════════════
           PROGRESS COLORS (V2)
           ══════════════════════════════════════════════════════════ */
        progress: {
          bg: "var(--progress-bg)",
          low: "var(--progress-fill-low)",
          medium: "var(--progress-fill-medium)",
          high: "var(--progress-fill-high)",
        },
      },
      
      /* ══════════════════════════════════════════════════════════
         BORDER RADIUS (V2)
         ══════════════════════════════════════════════════════════ */
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        "2xl": "12px",
        "3xl": "16px",
        full: "9999px",
      },
      
      /* ══════════════════════════════════════════════════════════
         BOX SHADOWS (V2)
         ══════════════════════════════════════════════════════════ */
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        dropdown: "var(--shadow-dropdown)",
      },
      
      /* ══════════════════════════════════════════════════════════
         TYPOGRAPHY (V2)
         ══════════════════════════════════════════════════════════ */
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '1.4', fontWeight: '400' }],
        'sm': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        'base': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'md': ['15px', { lineHeight: '1.5', fontWeight: '500' }],
        'lg': ['16px', { lineHeight: '1.5', fontWeight: '600' }],
        'xl': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        '2xl': ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        '3xl': ['28px', { lineHeight: '1.25', fontWeight: '600' }],
        '4xl': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
      },
      
      /* ══════════════════════════════════════════════════════════
         SPACING (V2 - 8px Base Grid)
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
         TRANSITION DURATION (V2)
         ══════════════════════════════════════════════════════════ */
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
        slow: "300ms",
      },
      
      /* ══════════════════════════════════════════════════════════
         ANIMATIONS (V2)
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
         Z-INDEX (V2)
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
