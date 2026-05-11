import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { Icon } from "@catylast/icons";
import type { IconName } from "@catylast/icons";

import { cx } from "../utils/classNames";
import * as styles from "./Button.css";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type ButtonAppearance =
  | "default"
  | "primary"
  | "subtle"
  | "subtle-link"
  | "link"
  | "warning"
  | "danger"
  | "discovery";

export type ButtonSize = "small" | "medium" | "large";

export type ButtonSpacing = "default" | "compact" | "none";

/** Legacy prop values from v0.1, mapped automatically. */
export type ButtonVariant =
  | ButtonAppearance
  | "secondary"
  | "ghost";

export type ButtonSizeAlias = ButtonSize | "sm" | "md" | "lg";

/** Anything renderable in an icon slot — a registered icon name or a React node. */
export type ButtonIconSlot = IconName | ReactNode;

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

const APPEARANCE_ALIAS: Record<string, ButtonAppearance> = {
  secondary: "default",
  ghost: "subtle",
};

const SIZE_ALIAS: Record<string, ButtonSize> = {
  sm: "small",
  md: "medium",
  lg: "large",
};

const ICON_PIXEL_SIZE: Record<ButtonSize, number> = {
  small: 14,
  medium: 16,
  large: 20,
};

function resolveAppearance(
  appearance?: ButtonAppearance,
  variant?: ButtonVariant,
): ButtonAppearance {
  const raw = appearance ?? variant ?? "default";
  return (APPEARANCE_ALIAS[raw] ?? raw) as ButtonAppearance;
}

function resolveSize(size?: ButtonSizeAlias): ButtonSize {
  if (!size) return "medium";
  return (SIZE_ALIAS[size] ?? size) as ButtonSize;
}

/**
 * Render an icon slot. Accepts either a registered icon name (renders
 * `<Icon>`) or any React node (rendered as-is). The runtime type-check
 * is what makes the shorthand `iconBefore="check"` ergonomic without
 * sacrificing the escape hatch of passing a custom node.
 */
function renderIconSlot(
  slot: ButtonIconSlot | undefined,
  pixelSize: number,
): ReactNode {
  if (slot === undefined || slot === null || slot === false) return null;
  if (typeof slot === "string") {
    return <Icon name={slot as IconName} size={pixelSize} />;
  }
  return slot;
}

const DEFAULT_SPINNER_SVG = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeDasharray="42 18"
      opacity="0.9"
    />
  </svg>
);

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------

type ButtonOwnProps<E extends ElementType> = {
  /** Visual color preset. @default "default" */
  appearance?: ButtonAppearance;
  /** Legacy prop. Use `appearance`. Kept so v0.1 callers don't break. */
  variant?: ButtonVariant;
  /** Overall scale (font + min-height). @default "medium" */
  size?: ButtonSizeAlias;
  /** Horizontal padding density. @default "default" */
  spacing?: ButtonSpacing;
  /** Icon (or any node) before the label. */
  iconBefore?: ButtonIconSlot;
  /** Icon (or any node) after the label. */
  iconAfter?: ButtonIconSlot;
  /** Disable the button — no clicks, no focus on Tab, reduced opacity. */
  isDisabled?: boolean;
  /** Show a spinner over the label. Width is preserved (no layout shift). */
  isLoading?: boolean;
  /** Toggle-on state — accent border + tinted background. Pair with `aria-pressed` semantics if appropriate. */
  isSelected?: boolean;
  /** Stretch to fill the parent's width. */
  shouldFitContainer?: boolean;
  /** Override the rendered tag (e.g. `as="a"` or a router Link). Polymorphic. */
  as?: E;
  /** Replace the default loading spinner. */
  loadingIndicator?: ReactNode;
  /** Class names merged with internal styles. */
  className?: string;
  /** Inline styles — use to override CSS variables (`--btn-radius`, etc.). */
  style?: CSSProperties;
  children?: ReactNode;
};

export type ButtonProps<E extends ElementType = "button"> = ButtonOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof ButtonOwnProps<E>>;

// ----------------------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------------------

const DEFAULT_TAG = "button" as const;

function ButtonImpl<E extends ElementType = typeof DEFAULT_TAG>(
  {
    appearance,
    variant,
    size,
    spacing = "default",
    iconBefore,
    iconAfter,
    isDisabled,
    isLoading = false,
    isSelected = false,
    shouldFitContainer = false,
    as,
    loadingIndicator,
    className,
    children,
    onClick,
    type: typeProp,
    ...rest
  }: ButtonProps<E>,
  ref: ForwardedRef<HTMLElement>,
): ReactElement {
  const Tag = (as ?? DEFAULT_TAG) as ElementType;
  const resolvedAppearance = resolveAppearance(appearance, variant);
  const resolvedSize = resolveSize(size);
  const iconPixelSize = ICON_PIXEL_SIZE[resolvedSize];
  // Legacy: callers using the native `disabled` attr on <button> get the
  // same data-attribute styling treatment as `isDisabled`.
  const restRecord = rest as Record<string, unknown>;
  const legacyDisabled = restRecord.disabled === true;
  const effectiveDisabled = isDisabled ?? legacyDisabled;
  if ("disabled" in restRecord) delete restRecord.disabled;

  const iconBeforeNode = renderIconSlot(iconBefore, iconPixelSize);
  const iconAfterNode = renderIconSlot(iconAfter, iconPixelSize);

  const isNativeButton = Tag === "button";
  const inertProps =
    effectiveDisabled || isLoading
      ? {
          "data-disabled": effectiveDisabled || undefined,
          "data-loading": isLoading || undefined,
          ...(isNativeButton ? { disabled: true } : { "aria-disabled": true }),
        }
      : {
          "data-disabled": undefined,
          "data-loading": undefined,
        };

  return (
    <Tag
      ref={ref as Ref<never>}
      type={isNativeButton ? (typeProp ?? "button") : typeProp}
      className={cx(
        styles.root,
        styles.size[resolvedSize],
        styles.spacing[spacing],
        styles.appearance[resolvedAppearance],
        shouldFitContainer && styles.fullWidth,
        className,
      )}
      data-selected={isSelected || undefined}
      aria-pressed={isSelected || undefined}
      onClick={effectiveDisabled || isLoading ? undefined : (onClick as never)}
      {...inertProps}
      {...restRecord}
    >
      {iconBeforeNode && (
        <span
          className={styles.iconSlot}
          data-icon-slot="before"
          aria-hidden={children ? "true" : undefined}
        >
          {iconBeforeNode}
        </span>
      )}
      {children !== undefined && children !== null && (
        <span className={styles.labelWrap}>{children}</span>
      )}
      {iconAfterNode && (
        <span
          className={styles.iconSlot}
          data-icon-slot="after"
          aria-hidden={children ? "true" : undefined}
        >
          {iconAfterNode}
        </span>
      )}
      {isLoading && (
        <span className={styles.spinner} aria-hidden="true">
          {loadingIndicator ?? DEFAULT_SPINNER_SVG}
        </span>
      )}
    </Tag>
  );
}

export const Button = forwardRef(ButtonImpl) as <
  E extends ElementType = typeof DEFAULT_TAG,
>(
  props: ButtonProps<E> & { ref?: Ref<HTMLElement> },
) => ReactElement;
