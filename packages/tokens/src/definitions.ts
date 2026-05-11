/**
 * Single source of truth for all design tokens.
 *
 * `primitives` — raw, theme-agnostic values (color ramps, scales).
 * `semantic.light` / `semantic.dark` — purpose-named values per theme. Same
 * shape on both sides. Leaves typically reference primitive variables via
 * `var()` so the indirection is preserved.
 */

// The component library targets Inter Variable (sans) and JetBrains Mono
// Variable (mono) — variable fonts so the custom 653 weight axis used by
// Catylast headings renders accurately. Both families list both the
// "-Variable" name (registered by `@fontsource-variable/...`) and the
// short name (registered by `@fontsource/...`) so either delivery path
// works. Past the brand fonts, the stacks fall back to system fonts so
// consumers that haven't loaded the woff2 files still get a sensible
// render (with weight 653 rounded to the nearest available — typically
// 700 — by the browser).
const FONT_SANS =
  '"Inter Variable", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_MONO =
  '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export const primitives = {
  color: {
    neutral: {
      0: "#FFFFFF",
      50: "#F8F9FA",
      100: "#EEF0F2",
      200: "#DDE0E4",
      300: "#C2C7CC",
      400: "#9DA3AA",
      500: "#767D85",
      600: "#565D65",
      700: "#3C434B",
      800: "#262C32",
      900: "#16191C",
      1000: "#0B0E10",
    },
    blue: {
      50: "#EDF3FF",
      100: "#D7E3FF",
      200: "#ADC4FE",
      300: "#83A5FD",
      400: "#5587FB",
      500: "#2E6BF7",
      600: "#1955DB",
      700: "#1342AB",
      800: "#0F327F",
      900: "#0A2155",
    },
    red: {
      50: "#FFEDED",
      100: "#FFD3D3",
      200: "#FFA8A8",
      300: "#FF7A7A",
      400: "#F84F4F",
      500: "#DF2D2D",
      600: "#B71F1F",
      700: "#8E1818",
      800: "#661111",
      900: "#3F0A0A",
    },
    yellow: {
      50: "#FFF7E0",
      100: "#FEEABF",
      200: "#FCD581",
      300: "#F9BD3C",
      400: "#DFA10E",
      500: "#B07E0A",
      600: "#876008",
      700: "#5F4406",
      800: "#3D2C04",
      900: "#211802",
    },
    green: {
      50: "#E6F8EE",
      100: "#C0EDD0",
      200: "#82DBA1",
      300: "#43C871",
      400: "#25AC54",
      500: "#1B8842",
      600: "#156932",
      700: "#104D26",
      800: "#0A331A",
      900: "#061D0F",
    },
    purple: {
      50: "#F1ECFC",
      100: "#DCD0F8",
      200: "#BCA4F1",
      300: "#9B77E9",
      400: "#7C4ED7",
      500: "#5C30B3",
      600: "#46258A",
      700: "#341B66",
      800: "#221141",
      900: "#120822",
    },
  },
  space: {
    0: "0",
    1: "1px",
    2: "2px",
    4: "4px",
    6: "6px",
    8: "8px",
    10: "10px",
    12: "12px",
    16: "16px",
    20: "20px",
    24: "24px",
    32: "32px",
    40: "40px",
    48: "48px",
    64: "64px",
    80: "80px",
    96: "96px",
    128: "128px",
  },
  radius: {
    none: "0",
    xs: "2px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    full: "9999px",
  },
  font: {
    family: {
      sans: FONT_SANS,
      mono: FONT_MONO,
    },
    size: {
      xs: "11px",
      sm: "12px",
      md: "14px",
      lg: "16px",
      xl: "18px",
      "2xl": "20px",
      "3xl": "24px",
      "4xl": "32px",
      "5xl": "40px",
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      // Catylast "bold" maps to the custom Inter Variable axis value
      // 653 — not the canonical 700. This is what the designer
      // specified for headings and the bold body / metric styles.
      // Requires Inter Variable to render exactly; static Inter falls
      // back to ~700.
      bold: 653,
    },
    lineHeight: {
      tight: 1.15,
      snug: 1.3,
      normal: 1.5,
      loose: 1.75,
    },
  },
  /**
   * Semantic typography slots — every text style the design system
   * uses, mapped 1:1 to the spec the Catylast designer provided.
   * Components reference these instead of composing `fontSize` /
   * `fontWeight` / `lineHeight` themselves.
   *
   * Each slot is a flat object of `{ fontSize, fontWeight,
   * lineHeight, fontFamily }`. The `_buildVars` machinery emits one
   * CSS variable per property (e.g.
   * `--catylast-typography-heading-large-font-size`) and one JS
   * accessor per property (`typography.heading.large.fontSize`).
   * Components can spread the slot directly into a `style` prop:
   *
   * ```tsx
   * <h2 style={typography.heading.large}>Section title</h2>
   * ```
   *
   * Body slots default to weight 400 (regular). The `<Text>`
   * primitive overrides the weight per its `weight` prop without
   * touching the size / line-height / family. Heading and Metric
   * slots ship with the custom 653 weight baked in.
   */
  typography: {
    heading: {
      xxlarge: {
        fontSize: "32px",
        fontWeight: 653,
        lineHeight: "36px",
        fontFamily: FONT_SANS,
      },
      xlarge: {
        fontSize: "28px",
        fontWeight: 653,
        lineHeight: "32px",
        fontFamily: FONT_SANS,
      },
      large: {
        fontSize: "24px",
        fontWeight: 653,
        lineHeight: "28px",
        fontFamily: FONT_SANS,
      },
      medium: {
        fontSize: "20px",
        fontWeight: 653,
        lineHeight: "24px",
        fontFamily: FONT_SANS,
      },
      small: {
        fontSize: "16px",
        fontWeight: 653,
        lineHeight: "20px",
        fontFamily: FONT_SANS,
      },
      xsmall: {
        fontSize: "14px",
        fontWeight: 653,
        lineHeight: "20px",
        fontFamily: FONT_SANS,
      },
      xxsmall: {
        fontSize: "12px",
        fontWeight: 653,
        lineHeight: "16px",
        fontFamily: FONT_SANS,
      },
    },
    body: {
      xlarge: {
        fontSize: "20px",
        fontWeight: 400,
        lineHeight: "24px",
        fontFamily: FONT_SANS,
      },
      large: {
        fontSize: "16px",
        fontWeight: 400,
        lineHeight: "24px",
        fontFamily: FONT_SANS,
      },
      // The default body style for the entire design system. Any
      // unstyled paragraph or label inherits these values.
      medium: {
        fontSize: "14px",
        fontWeight: 400,
        lineHeight: "20px",
        fontFamily: FONT_SANS,
      },
      small: {
        fontSize: "12px",
        fontWeight: 400,
        lineHeight: "16px",
        fontFamily: FONT_SANS,
      },
    },
    metric: {
      large: {
        fontSize: "28px",
        fontWeight: 653,
        lineHeight: "32px",
        fontFamily: FONT_SANS,
      },
      medium: {
        fontSize: "24px",
        fontWeight: 653,
        lineHeight: "28px",
        fontFamily: FONT_SANS,
      },
      small: {
        fontSize: "16px",
        fontWeight: 653,
        lineHeight: "20px",
        fontFamily: FONT_SANS,
      },
    },
    code: {
      fontSize: "12px",
      fontWeight: 400,
      lineHeight: "20px",
      fontFamily: FONT_MONO,
    },
  },
  borderWidth: {
    0: "0",
    1: "1px",
    2: "2px",
    4: "4px",
  },
  motion: {
    duration: {
      fast: "100ms",
      normal: "200ms",
      slow: "300ms",
    },
    easing: {
      standard: "cubic-bezier(0.2, 0, 0, 1)",
      entrance: "cubic-bezier(0, 0, 0.2, 1)",
      exit: "cubic-bezier(0.4, 0, 1, 1)",
    },
  },
  zIndex: {
    hide: -1,
    base: 0,
    docked: 100,
    sticky: 800,
    banner: 900,
    dropdown: 1300,
    popover: 1400,
    overlay: 1500,
    modal: 1600,
    toast: 1700,
    tooltip: 1800,
  },
} as const;

export type SemanticShape = {
  color: {
    surface: {
      background: string;
      raised: string;
      overlay: string;
      sunken: string;
      hover: string;
      pressed: string;
      selected: string;
    };
    text: {
      primary: string;
      secondary: string;
      subtle: string;
      disabled: string;
      inverse: string;
      accent: string;
      danger: string;
      warning: string;
      success: string;
    };
    border: {
      default: string;
      subtle: string;
      strong: string;
      focus: string;
      danger: string;
      warning: string;
      success: string;
    };
    accent: {
      background: string;
      backgroundHover: string;
      backgroundPressed: string;
      text: string;
    };
    danger: {
      background: string;
      backgroundHover: string;
      backgroundPressed: string;
      text: string;
    };
    success: {
      background: string;
      text: string;
    };
    warning: {
      background: string;
      text: string;
    };
  };
  elevation: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
};

const ref = (path: string): string => `var(--catylast-${path})`;

export const semantic: { light: SemanticShape; dark: SemanticShape } = {
  light: {
    color: {
      surface: {
        background: ref("color-neutral-0"),
        raised: ref("color-neutral-50"),
        overlay: ref("color-neutral-0"),
        sunken: ref("color-neutral-100"),
        hover: "rgba(0, 0, 0, 0.04)",
        pressed: "rgba(0, 0, 0, 0.08)",
        selected: ref("color-blue-50"),
      },
      text: {
        primary: ref("color-neutral-900"),
        secondary: ref("color-neutral-700"),
        subtle: ref("color-neutral-500"),
        disabled: ref("color-neutral-400"),
        inverse: ref("color-neutral-0"),
        accent: ref("color-blue-600"),
        danger: ref("color-red-600"),
        warning: ref("color-yellow-700"),
        success: ref("color-green-600"),
      },
      border: {
        default: ref("color-neutral-200"),
        subtle: ref("color-neutral-100"),
        strong: ref("color-neutral-400"),
        focus: ref("color-blue-500"),
        danger: ref("color-red-500"),
        warning: ref("color-yellow-500"),
        success: ref("color-green-500"),
      },
      accent: {
        background: ref("color-blue-500"),
        backgroundHover: ref("color-blue-600"),
        backgroundPressed: ref("color-blue-700"),
        text: ref("color-neutral-0"),
      },
      danger: {
        background: ref("color-red-500"),
        backgroundHover: ref("color-red-600"),
        backgroundPressed: ref("color-red-700"),
        text: ref("color-neutral-0"),
      },
      success: {
        background: ref("color-green-500"),
        text: ref("color-neutral-0"),
      },
      warning: {
        background: ref("color-yellow-300"),
        text: ref("color-neutral-900"),
      },
    },
    elevation: {
      xs: "0 1px 2px rgba(22, 25, 28, 0.08)",
      sm: "0 2px 4px rgba(22, 25, 28, 0.10)",
      md: "0 4px 8px rgba(22, 25, 28, 0.12)",
      lg: "0 8px 16px rgba(22, 25, 28, 0.14)",
      xl: "0 16px 32px rgba(22, 25, 28, 0.16)",
    },
  },
  dark: {
    color: {
      surface: {
        background: ref("color-neutral-1000"),
        raised: ref("color-neutral-900"),
        overlay: ref("color-neutral-800"),
        sunken: ref("color-neutral-900"),
        hover: "rgba(255, 255, 255, 0.06)",
        pressed: "rgba(255, 255, 255, 0.10)",
        selected: "rgba(46, 107, 247, 0.16)",
      },
      text: {
        primary: ref("color-neutral-100"),
        secondary: ref("color-neutral-300"),
        subtle: ref("color-neutral-400"),
        disabled: ref("color-neutral-600"),
        inverse: ref("color-neutral-900"),
        accent: ref("color-blue-300"),
        danger: ref("color-red-300"),
        warning: ref("color-yellow-300"),
        success: ref("color-green-300"),
      },
      border: {
        default: ref("color-neutral-700"),
        subtle: ref("color-neutral-800"),
        strong: ref("color-neutral-500"),
        focus: ref("color-blue-400"),
        danger: ref("color-red-400"),
        warning: ref("color-yellow-400"),
        success: ref("color-green-400"),
      },
      accent: {
        background: ref("color-blue-500"),
        backgroundHover: ref("color-blue-400"),
        backgroundPressed: ref("color-blue-300"),
        text: ref("color-neutral-0"),
      },
      danger: {
        background: ref("color-red-500"),
        backgroundHover: ref("color-red-400"),
        backgroundPressed: ref("color-red-300"),
        text: ref("color-neutral-0"),
      },
      success: {
        background: ref("color-green-500"),
        text: ref("color-neutral-0"),
      },
      warning: {
        background: ref("color-yellow-300"),
        text: ref("color-neutral-900"),
      },
    },
    elevation: {
      xs: "0 1px 1px rgba(0, 0, 0, 0.40)",
      sm: "0 2px 4px rgba(0, 0, 0, 0.45)",
      md: "0 4px 8px rgba(0, 0, 0, 0.50)",
      lg: "0 8px 16px rgba(0, 0, 0, 0.55)",
      xl: "0 16px 32px rgba(0, 0, 0, 0.60)",
    },
  },
};
