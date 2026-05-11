import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type Ref,
} from "react";

import { cx } from "../utils/classNames";
import * as styles from "./Typography.css";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type HeadingSize =
  | "xxlarge"
  | "xlarge"
  | "large"
  | "medium"
  | "small"
  | "xsmall"
  | "xxsmall";

/** Semantic HTML level. Independent from visual `size`. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type TextSize = "xlarge" | "large" | "medium" | "small";
export type TextWeight = "regular" | "medium" | "bold";
export type TypographyColor =
  | "primary"
  | "secondary"
  | "subtle"
  | "disabled"
  | "inverse"
  | "accent"
  | "danger"
  | "warning"
  | "success"
  | "inherit";

export type TextAlign = "left" | "center" | "right" | "justify" | "inherit";

export type MetricSize = "large" | "medium" | "small";

// ---------------------------------------------------------------------------
// Internals — every component supports the same alignment + color escape
// hatches so users can override per-instance without changing tokens.
// ---------------------------------------------------------------------------

function alignVar(align: TextAlign | undefined): CSSProperties | undefined {
  if (!align || align === "inherit") return undefined;
  return { ["--catylast-typography-text-align" as never]: align };
}

// Map a visual heading size to a sensible default semantic level.
// Following ADS's pattern, the `size` controls visual styling and the
// `level` controls semantics independently — but most apps just want
// the natural pairing, so we default it.
const DEFAULT_LEVEL_FOR_SIZE: Record<HeadingSize, HeadingLevel> = {
  xxlarge: 1,
  xlarge: 1,
  large: 2,
  medium: 3,
  small: 4,
  xsmall: 5,
  xxsmall: 6,
};

// ---------------------------------------------------------------------------
// Heading
// ---------------------------------------------------------------------------

export type HeadingProps = Omit<
  HTMLAttributes<HTMLHeadingElement>,
  "color"
> & {
  /** Visual size — picks the matching `typography.heading.*` slot. @default "large" */
  size?: HeadingSize;
  /**
   * Semantic HTML level (1–6). Defaults to a natural pairing with
   * `size`: `xxlarge` / `xlarge` → h1, `large` → h2, etc. Pass an
   * explicit `level` whenever the heading's place in the document
   * outline doesn't match its visual size — e.g. a page-section title
   * that looks small but should still be `<h2>` for screen readers.
   */
  level?: HeadingLevel;
  /** Color preset. @default "primary" */
  color?: TypographyColor;
  /** Text alignment. @default "inherit" */
  align?: TextAlign;
};

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  function Heading(
    {
      size = "large",
      level,
      color = "primary",
      align,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const Tag = `h${level ?? DEFAULT_LEVEL_FOR_SIZE[size]}` as ElementType;
    return (
      <Tag
        ref={ref}
        className={cx(
          styles.headingRoot,
          styles.headingSize[size],
          styles.textColor[color],
          className,
        )}
        style={{ ...alignVar(align), ...style } as CSSProperties}
        {...rest}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export type TextElementType =
  | "span"
  | "p"
  | "div"
  | "label"
  | "small"
  | "strong"
  | "em";

export type TextProps = Omit<HTMLAttributes<HTMLElement>, "color"> & {
  /** Element to render. @default "span" */
  as?: TextElementType;
  /** Visual size — picks the matching `typography.body.*` slot. @default "medium" */
  size?: TextSize;
  /** Weight variant. @default "regular" */
  weight?: TextWeight;
  /** Color preset. @default "inherit" */
  color?: TypographyColor;
  /** Text alignment. @default "inherit" */
  align?: TextAlign;
};

export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  {
    as = "span",
    size = "medium",
    weight = "regular",
    color = "inherit",
    align,
    className,
    style,
    ...rest
  },
  ref,
) {
  const Tag = as as ElementType;
  return (
    <Tag
      ref={ref as Ref<HTMLElement>}
      className={cx(
        styles.textRoot,
        styles.textSize[size],
        styles.textWeight[weight],
        styles.textColor[color],
        className,
      )}
      style={{ ...alignVar(align), ...style } as CSSProperties}
      {...rest}
    />
  );
});

// ---------------------------------------------------------------------------
// Metric — display numerals with tabular-nums for column alignment
// ---------------------------------------------------------------------------

export type MetricProps = Omit<HTMLAttributes<HTMLSpanElement>, "color"> & {
  /** Visual size — picks the matching `typography.metric.*` slot. @default "medium" */
  size?: MetricSize;
  /** Color preset. @default "primary" */
  color?: TypographyColor;
  /** Text alignment. @default "inherit" */
  align?: TextAlign;
};

export const Metric = forwardRef<HTMLSpanElement, MetricProps>(function Metric(
  { size = "medium", color = "primary", align, className, style, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cx(
        styles.metricRoot,
        styles.metricSize[size],
        styles.textColor[color],
        className,
      )}
      style={{ ...alignVar(align), ...style } as CSSProperties}
      {...rest}
    />
  );
});

// ---------------------------------------------------------------------------
// Code — inline `<code>` by default; `block` toggles to a styled block
// ---------------------------------------------------------------------------

export type CodeProps = HTMLAttributes<HTMLElement> & {
  /**
   * Render as a block instead of inline. Wraps the `<code>` in a `<pre>`
   * so newlines and indentation are preserved and the contents scroll
   * horizontally rather than wrapping.
   */
  block?: boolean;
};

export const Code = forwardRef<HTMLElement, CodeProps>(function Code(
  { block, className, style, children, ...rest },
  ref,
) {
  if (block) {
    return (
      <pre
        className={cx(styles.codeRoot, styles.codeBlock, className)}
        style={style}
      >
        <code ref={ref as Ref<HTMLElement>} {...rest}>
          {children}
        </code>
      </pre>
    );
  }
  return (
    <code
      ref={ref as Ref<HTMLElement>}
      className={cx(styles.codeRoot, styles.codeInline, className)}
      style={style}
      {...rest}
    >
      {children}
    </code>
  );
});
