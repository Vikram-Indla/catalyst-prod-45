import {
  Children,
  forwardRef,
  isValidElement,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ForwardedRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

import * as styles from "./Card.css";

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter((c): c is string => Boolean(c)).join(" ");

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type CardVariant = "outlined" | "elevated" | "filled";

export type CardSize = "sm" | "md" | "lg";

export type CardRadius = "none" | "sm" | "md" | "lg" | "xl" | "full";

export type CardPadding = "none" | "sm" | "md" | "lg";

export type CardElevation = "none" | "xs" | "sm" | "md" | "lg" | "xl";

export type CardTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger";

// ----------------------------------------------------------------------------
// Token maps — every value resolves to a CSS variable already published by
// `@catylast/tokens`, so dark mode and future theme swaps continue to work.
// ----------------------------------------------------------------------------

const RADIUS_MAP: Record<CardRadius, string> = {
  none: "0",
  sm: "var(--catylast-radius-sm)",
  md: "var(--catylast-radius-md)",
  lg: "var(--catylast-radius-lg)",
  xl: "var(--catylast-radius-xl)",
  full: "var(--catylast-radius-full)",
};

const ELEVATION_MAP: Record<CardElevation, string> = {
  none: "none",
  xs: "var(--catylast-elevation-xs)",
  sm: "var(--catylast-elevation-sm)",
  md: "var(--catylast-elevation-md)",
  lg: "var(--catylast-elevation-lg)",
  xl: "var(--catylast-elevation-xl)",
};

const PADDING_MAP: Record<CardPadding, string> = {
  none: "0",
  sm: "var(--catylast-space-8)",
  md: "var(--catylast-space-16)",
  lg: "var(--catylast-space-24)",
};

// `size` controls the slot padding (header / footer) on the X and Y axes
// AND scales the body padding. It does NOT control radius or elevation —
// those are independent knobs.
const SIZE_MAP: Record<CardSize, { x: string; y: string; body: string }> = {
  sm: {
    x: "var(--catylast-space-12)",
    y: "var(--catylast-space-6)",
    body: "var(--catylast-space-12)",
  },
  md: {
    x: "var(--catylast-space-16)",
    y: "var(--catylast-space-12)",
    body: "var(--catylast-space-16)",
  },
  lg: {
    x: "var(--catylast-space-24)",
    y: "var(--catylast-space-16)",
    body: "var(--catylast-space-24)",
  },
};

const TONE_MAP: Record<CardTone, string | null> = {
  neutral: null, // no strip
  accent: "var(--catylast-color-blue-500)",
  success: "var(--catylast-color-green-600)",
  warning: "var(--catylast-color-yellow-500)",
  danger: "var(--catylast-color-red-500)",
};

// ----------------------------------------------------------------------------
// Card root
// ----------------------------------------------------------------------------

type CardOwnProps<E extends ElementType> = {
  /** Surface preset — sets a sensible combo of border / shadow / background. @default "outlined" */
  variant?: CardVariant;
  /** Slot padding scale. @default "md" */
  size?: CardSize;
  /** Corner radius. Defaults to the token system's `radius.md`. */
  radius?: CardRadius;
  /** Body padding override. If omitted, follows `size`. */
  padding?: CardPadding;
  /** Shadow depth. If omitted, follows the variant ("elevated" → sm, others → none). */
  elevation?: CardElevation;
  /** Optional accent strip along the top edge. */
  tone?: CardTone;
  /** Width for the strip when `tone` is set. @default 3px */
  toneHeight?: number | string;
  /** Stretch to fill the parent's width. */
  fullWidth?: boolean;
  /**
   * Convenience: render a `Card.Cover` automatically with this image at the
   * top of the card. Equivalent to nesting `<Card.Cover><img src={…} /></Card.Cover>`.
   */
  coverImage?: string;
  /** Alt text for `coverImage`. */
  coverImageAlt?: string;
  /** Height of the auto-rendered cover (CSS length). @default "160px" when coverImage is set */
  coverHeight?: number | string;
  /**
   * Render a full-bleed background image behind the card content. Pair with
   * `backgroundOverlay` to keep foreground text legible.
   */
  backgroundImage?: string;
  /** Opacity of the background image. @default 1 */
  backgroundImageOpacity?: number;
  /**
   * Overlay layer over the background image. `true` → a sensible dark tint.
   * Pass a CSS color/gradient string for full control. `false` (default) →
   * no overlay.
   */
  backgroundOverlay?: boolean | string;
  /**
   * Force the card body's text color when a dark `backgroundImage` is set so
   * content stays readable. CSS color string.
   */
  textColor?: string;
  /**
   * Renders the card as a focusable, button-shaped affordance with hover,
   * pressed, and focus states. Pair with `onClick`.
   */
  interactive?: boolean;
  /** Accent border + tinted background for selectable card grids. */
  selected?: boolean;
  /** Desaturated, non-focusable, no hover effects. */
  disabled?: boolean;
  /** Override the rendered tag (e.g. `as="a"` for a linkified card). */
  as?: E;
  /** Class names merged with internal styles. */
  className?: string;
};

export type CardProps<E extends ElementType = "div"> = CardOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof CardOwnProps<E>>;

const DEFAULT_TAG = "div" as const;
const DEFAULT_TONE_HEIGHT = "3px";
const DEFAULT_BG_OVERLAY = "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55))";
const DEFAULT_COVER_HEIGHT = "160px";

const lengthOrNumber = (v: number | string): string =>
  typeof v === "number" ? `${v}px` : v;

/**
 * Build the inline CSS-variable map for a single Card instance. Every prop
 * the consumer sets writes one variable; unset props inherit token defaults
 * from the CSS in `Card.css.ts`. This is what makes the component
 * "infinitely customizable" — consumers can either pass props or override
 * the same variables themselves via `style={{ "--card-radius": ... }}`.
 */
function buildCssVars(args: {
  size: CardSize;
  radius?: CardRadius | undefined;
  padding?: CardPadding | undefined;
  elevation?: CardElevation | undefined;
  tone: CardTone;
  toneHeight: number | string;
  fullWidth: boolean | undefined;
  coverHeight: number | string | undefined;
  backgroundImage: string | undefined;
  backgroundImageOpacity: number | undefined;
  backgroundOverlay: boolean | string | undefined;
  textColor: string | undefined;
}): CSSProperties {
  const vars: Record<string, string> = {};
  const sizeMap = SIZE_MAP[args.size];

  vars["--card-padding-x"] = sizeMap.x;
  vars["--card-padding-y"] = sizeMap.y;
  vars["--card-padding"] = sizeMap.body;

  if (args.padding) vars["--card-padding"] = PADDING_MAP[args.padding];
  if (args.radius) vars["--card-radius"] = RADIUS_MAP[args.radius];
  if (args.elevation) vars["--card-shadow"] = ELEVATION_MAP[args.elevation];

  const toneColor = TONE_MAP[args.tone];
  if (toneColor) {
    vars["--card-tone-color"] = toneColor;
    vars["--card-tone-height"] = lengthOrNumber(args.toneHeight);
  }

  if (args.fullWidth) vars["--card-width"] = "100%";

  if (args.coverHeight) {
    vars["--card-cover-height"] = lengthOrNumber(args.coverHeight);
  }

  if (args.backgroundImage) {
    vars["--card-bg-image"] = `url("${args.backgroundImage}")`;
    if (args.backgroundImageOpacity !== undefined) {
      vars["--card-bg-image-opacity"] = String(args.backgroundImageOpacity);
    }
  }

  if (args.backgroundOverlay) {
    vars["--card-bg-overlay"] =
      args.backgroundOverlay === true
        ? DEFAULT_BG_OVERLAY
        : args.backgroundOverlay;
  }

  if (args.textColor) vars["color"] = args.textColor;

  return vars as CSSProperties;
}

/**
 * Detect whether the user already provided a `Card.Cover` slot child so we
 * don't double-render when both `coverImage` and an explicit `<Card.Cover>`
 * are passed.
 */
function hasCoverChild(children: ReactNode): boolean {
  let found = false;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const t = child.type as { displayName?: string } | string;
    if (typeof t !== "string" && t.displayName === "Card.Cover") {
      found = true;
    }
  });
  return found;
}

function CardImpl<E extends ElementType = typeof DEFAULT_TAG>(
  {
    variant = "outlined",
    size = "md",
    radius,
    padding,
    elevation,
    tone = "neutral",
    toneHeight = DEFAULT_TONE_HEIGHT,
    fullWidth,
    coverImage,
    coverImageAlt = "",
    coverHeight,
    backgroundImage,
    backgroundImageOpacity,
    backgroundOverlay,
    textColor,
    interactive = false,
    selected = false,
    disabled = false,
    as,
    className,
    style: userStyle,
    onKeyDown,
    onClick,
    children,
    ...rest
  }: CardProps<E>,
  ref: ForwardedRef<HTMLElement>,
): ReactElement {
  const Tag = (as ?? DEFAULT_TAG) as ElementType;
  const isInteractive = interactive && !disabled;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event as never);
    if (!isInteractive) return;
    if (event.defaultPrevented) return;
    if (Tag === "button") return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      (onClick as ((e: unknown) => void) | undefined)?.(event);
    }
  };

  const defaultRole = isInteractive && Tag === DEFAULT_TAG ? "button" : undefined;
  const defaultTabIndex = isInteractive && Tag === DEFAULT_TAG ? 0 : undefined;

  const cssVars = buildCssVars({
    size,
    radius,
    padding,
    elevation,
    tone,
    toneHeight,
    fullWidth,
    coverHeight: coverHeight ?? (coverImage ? DEFAULT_COVER_HEIGHT : undefined),
    backgroundImage,
    backgroundImageOpacity,
    backgroundOverlay,
    textColor,
  });

  const renderAutoCover =
    coverImage !== undefined && !hasCoverChild(children);

  return (
    <Tag
      ref={ref as Ref<never>}
      className={cx(
        styles.root,
        styles.variant[variant],
        isInteractive && styles.interactive,
        isInteractive && variant === "elevated" && styles.interactiveElevated,
        isInteractive && variant === "filled" && styles.interactiveFilled,
        selected && styles.selected,
        disabled && styles.disabled,
        className,
      )}
      role={defaultRole}
      tabIndex={disabled ? -1 : defaultTabIndex}
      aria-disabled={disabled || undefined}
      aria-pressed={selected && isInteractive ? true : undefined}
      onKeyDown={handleKeyDown}
      onClick={disabled ? undefined : (onClick as never)}
      style={{ ...cssVars, ...(userStyle as CSSProperties | undefined) }}
      {...rest}
    >
      {backgroundImage && <span className={styles.bgImage} aria-hidden />}
      {backgroundOverlay && <span className={styles.bgOverlay} aria-hidden />}
      <div className={styles.contentLayer}>
        {renderAutoCover && (
          <Cover>
            <img src={coverImage} alt={coverImageAlt} />
          </Cover>
        )}
        {children}
      </div>
    </Tag>
  );
}

const CardForwardRef = forwardRef(CardImpl) as <
  E extends ElementType = typeof DEFAULT_TAG,
>(
  props: CardProps<E> & { ref?: Ref<HTMLElement> },
) => ReactElement;

// ----------------------------------------------------------------------------
// Slots
// ----------------------------------------------------------------------------

type SlotProps = ComponentPropsWithoutRef<"div">;

const Cover = forwardRef<HTMLDivElement, SlotProps>(function Cover(
  { className, ...rest },
  ref,
) {
  return <div ref={ref} className={cx(styles.cover, className)} {...rest} />;
});
Cover.displayName = "Card.Cover";

const Header = forwardRef<HTMLDivElement, SlotProps>(function Header(
  { className, ...rest },
  ref,
) {
  return <div ref={ref} className={cx(styles.header, className)} {...rest} />;
});
Header.displayName = "Card.Header";

const Body = forwardRef<HTMLDivElement, SlotProps>(function Body(
  { className, ...rest },
  ref,
) {
  return <div ref={ref} className={cx(styles.body, className)} {...rest} />;
});
Body.displayName = "Card.Body";

const Footer = forwardRef<HTMLDivElement, SlotProps>(function Footer(
  { className, ...rest },
  ref,
) {
  return <div ref={ref} className={cx(styles.footer, className)} {...rest} />;
});
Footer.displayName = "Card.Footer";

// ----------------------------------------------------------------------------
// Compound export
// ----------------------------------------------------------------------------

type CardCompound = typeof CardForwardRef & {
  Cover: typeof Cover;
  Header: typeof Header;
  Body: typeof Body;
  Footer: typeof Footer;
};

export const Card = CardForwardRef as CardCompound;
Card.Cover = Cover;
Card.Header = Header;
Card.Body = Body;
Card.Footer = Footer;

export {
  Cover as CardCover,
  Header as CardHeader,
  Body as CardBody,
  Footer as CardFooter,
};
