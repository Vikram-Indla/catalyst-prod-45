import type { CSSProperties, SVGProps } from "react";

/**
 * Catylast priority icons. Each icon is the user-supplied SVG art
 * inlined as JSX so it ships with the bundle (no extra HTTP fetch) and
 * keeps its brand color built in. Sources live under
 * `packages/icons/svgs/priorities/` for reference / regeneration.
 *
 * Six tiers: highest, high, medium, low, lowest, none.
 */

// ----------------------------------------------------------------------------
// Names + labels
// ----------------------------------------------------------------------------

export const PRIORITY_NAMES = [
  "highest",
  "high",
  "medium",
  "low",
  "lowest",
  "none",
] as const;

export type Priority = (typeof PRIORITY_NAMES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  highest: "Highest",
  high: "High",
  medium: "Medium",
  low: "Low",
  lowest: "Lowest",
  none: "None",
};

/**
 * Numeric ordering — useful for sorting priority columns from worst to
 * best (or the other way round). Lower number = lower priority.
 */
export const PRIORITY_ORDER: Record<Priority, number> = {
  none: 0,
  lowest: 1,
  low: 2,
  medium: 3,
  high: 4,
  highest: 5,
};

// ----------------------------------------------------------------------------
// Glyph components
// ----------------------------------------------------------------------------

type GlyphProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> & {
  size?: number;
};

type SvgProps = GlyphProps & {
  viewBox: string;
  children: React.ReactNode;
};

function Svg({
  size = 16,
  viewBox,
  children,
  ...rest
}: SvgProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

const HighestGlyph = (p: GlyphProps) => (
  <Svg viewBox="0 0 15 12" {...p}>
    <path
      d="M14.7827 4.68598L7.90771 0.154727C7.5947 -0.0515756 7.18801 -0.0515756 6.875 0.154727L0 4.68598L1.03271 6.25092L7.39136 2.06024L13.75 6.25092L14.7827 4.68598ZM14.7827 10.311L7.90771 5.77973C7.5947 5.57342 7.18801 5.57342 6.875 5.77973L0 10.311L1.03271 11.8759L7.39136 7.68524L13.75 11.8759L14.7827 10.311Z"
      fill="#C9372C"
    />
  </Svg>
);

const HighGlyph = (p: GlyphProps) => (
  <Svg viewBox="0 0 15 7" {...p}>
    <path
      d="M14.7827 4.68598L7.90771 0.154727C7.5947 -0.0515756 7.18801 -0.0515756 6.875 0.154727L0 4.68598L1.03271 6.25092L7.39136 2.06024L13.75 6.25092L14.7827 4.68598Z"
      fill="#C9372C"
    />
  </Svg>
);

const MediumGlyph = (p: GlyphProps) => (
  <Svg viewBox="0 0 15 8" {...p}>
    <path
      d="M15 5.625V7.5L0 7.5L1.63918e-07 5.625L15 5.625ZM15 1.31134e-06L15 1.875L4.91753e-07 1.875L6.55671e-07 0L15 1.31134e-06Z"
      fill="#E06C00"
    />
  </Svg>
);

const LowGlyph = (p: GlyphProps) => (
  <Svg viewBox="0 0 15 7" {...p}>
    <path
      d="M14.7827 1.56494L7.90771 6.09619C7.5947 6.30249 7.18801 6.30249 6.875 6.09619L0 1.56494L1.03271 0L7.39136 4.19067L13.75 0L14.7827 1.56494Z"
      fill="#1868DB"
    />
  </Svg>
);

const LowestGlyph = (p: GlyphProps) => (
  <Svg viewBox="0 0 15 12" {...p}>
    <path
      d="M14.7827 7.18994L7.90771 11.7212C7.5947 11.9275 7.18801 11.9275 6.875 11.7212L0 7.18994L1.03271 5.625L7.39136 9.81567L13.75 5.625L14.7827 7.18994ZM14.7827 1.56494L7.90771 6.09619C7.5947 6.30249 7.18801 6.30249 6.875 6.09619L0 1.56494L1.03271 0L7.39136 4.19067L13.75 0L14.7827 1.56494Z"
      fill="#1868DB"
    />
  </Svg>
);

const NoneGlyph = (p: GlyphProps) => (
  <Svg viewBox="0 0 18 18" {...p}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.0625 0.274587C4.42862 -0.0915291 5.02221 -0.0915291 5.38833 0.274587L9.45083 4.33709L8.125 5.66291L5.66291 3.20083L5.66291 16.25H3.78791L3.78791 3.20082L1.32583 5.66291L0 4.33709L4.0625 0.274587ZM11.9129 14.2992V1.25H13.7879V14.2992L16.25 11.8371L17.5758 13.1629L13.5133 17.2254C13.1472 17.5915 12.5536 17.5915 12.1875 17.2254L8.125 13.1629L9.45082 11.8371L11.9129 14.2992Z"
      fill="#080F21"
      fillOpacity={0.29}
    />
  </Svg>
);

// ----------------------------------------------------------------------------
// Registry
// ----------------------------------------------------------------------------

export const priorityRegistry: Record<
  Priority,
  (props: GlyphProps) => JSX.Element
> = {
  highest: HighestGlyph,
  high: HighGlyph,
  medium: MediumGlyph,
  low: LowGlyph,
  lowest: LowestGlyph,
  none: NoneGlyph,
};

// ----------------------------------------------------------------------------
// Public component
// ----------------------------------------------------------------------------

export type PriorityIconProps = {
  /** The priority tier to render. */
  name: Priority;
  /** Pixel size for both width and height. @default 16 */
  size?: number;
  /**
   * Render a trailing label next to the icon ("Highest", "Medium", …).
   * `false` (default) → icon-only. `true` → uses the canonical label
   * from `PRIORITY_LABELS`. Pass a custom string to override.
   */
  previewTitle?: boolean | string;
  /** Accessible label override. Defaults to the canonical priority name. */
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Renders the brand-colored glyph for a priority. By default the icon
 * is decorative (`aria-hidden`) and consumers handle the label
 * separately. Set `previewTitle` to render the label inline.
 */
export function PriorityIcon({
  name,
  size = 16,
  previewTitle = false,
  "aria-label": ariaLabel,
  className,
  style,
}: PriorityIconProps): JSX.Element {
  const Glyph = priorityRegistry[name];
  const label =
    typeof previewTitle === "string" ? previewTitle : PRIORITY_LABELS[name];
  const showLabel = previewTitle !== false && previewTitle !== undefined;

  if (!showLabel) {
    return (
      <span
        role="img"
        aria-label={ariaLabel ?? label}
        className={className}
        style={{ display: "inline-flex", alignItems: "center", ...style }}
      >
        <Glyph size={size} />
      </span>
    );
  }
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        ...style,
      }}
    >
      <Glyph size={size} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
