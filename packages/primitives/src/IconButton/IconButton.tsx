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
import * as buttonStyles from "../Button/Button.css";
import * as styles from "./IconButton.css";
import type {
  ButtonAppearance,
  ButtonSize,
  ButtonSizeAlias,
  ButtonVariant,
} from "../Button/Button";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type IconButtonAppearance = ButtonAppearance;
export type IconButtonSize = ButtonSize;
export type IconButtonSizeAlias = ButtonSizeAlias;
/** Legacy v0.1 prop values, accepted on `variant` for backwards compat. */
export type IconButtonVariant = ButtonVariant;

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

const APPEARANCE_ALIAS: Record<string, IconButtonAppearance> = {
  secondary: "default",
  ghost: "subtle",
};

const SIZE_ALIAS: Record<string, IconButtonSize> = {
  sm: "small",
  md: "medium",
  lg: "large",
};

const ICON_PIXEL_SIZE: Record<IconButtonSize, number> = {
  small: 14,
  medium: 16,
  large: 20,
};

function resolveAppearance(
  appearance?: IconButtonAppearance,
  variant?: IconButtonVariant,
): IconButtonAppearance {
  // IconButton's historical default was "ghost" — preserve that as "subtle"
  // so old call sites continue to look the same.
  const raw = appearance ?? variant ?? "subtle";
  return (APPEARANCE_ALIAS[raw] ?? raw) as IconButtonAppearance;
}

function resolveSize(size?: IconButtonSizeAlias): IconButtonSize {
  if (!size) return "medium";
  return (SIZE_ALIAS[size] ?? size) as IconButtonSize;
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

type IconButtonOwnProps<E extends ElementType> = {
  /**
   * The icon to render. Either a registered icon name (string) or any
   * React node (e.g. a custom SVG).
   */
  icon: IconName | ReactNode;
  /** Required accessible label — describes what the button does. */
  label: string;
  /** Visual color preset. @default "subtle" */
  appearance?: IconButtonAppearance;
  /** Legacy alias for `appearance`. */
  variant?: IconButtonVariant;
  /** Overall scale (square dimensions + icon size). @default "medium" */
  size?: IconButtonSizeAlias;
  /** Toggle-on state. */
  isSelected?: boolean;
  /** Reduced opacity, no clicks, no focus on Tab. */
  isDisabled?: boolean;
  /** Spinner over the icon. */
  isLoading?: boolean;
  /** Replace the default loading spinner. */
  loadingIndicator?: ReactNode;
  /** Override the rendered tag (e.g. `as="a"` for link icon button). */
  as?: E;
  className?: string;
  style?: CSSProperties;
};

export type IconButtonProps<E extends ElementType = "button"> =
  IconButtonOwnProps<E> &
    Omit<ComponentPropsWithoutRef<E>, keyof IconButtonOwnProps<E> | "children" | "aria-label">;

// ----------------------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------------------

const DEFAULT_TAG = "button" as const;

function IconButtonImpl<E extends ElementType = typeof DEFAULT_TAG>(
  {
    icon,
    label,
    appearance,
    variant,
    size,
    isSelected = false,
    isDisabled,
    isLoading = false,
    loadingIndicator,
    as,
    className,
    onClick,
    type: typeProp,
    ...rest
  }: IconButtonProps<E>,
  ref: ForwardedRef<HTMLElement>,
): ReactElement {
  const Tag = (as ?? DEFAULT_TAG) as ElementType;
  const resolvedAppearance = resolveAppearance(appearance, variant);
  const resolvedSize = resolveSize(size);
  const pixelSize = ICON_PIXEL_SIZE[resolvedSize];

  const restRecord = rest as Record<string, unknown>;
  const legacyDisabled = restRecord.disabled === true;
  const effectiveDisabled = isDisabled ?? legacyDisabled;
  if ("disabled" in restRecord) delete restRecord.disabled;

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

  const iconNode =
    typeof icon === "string" ? (
      <Icon name={icon as IconName} size={pixelSize} />
    ) : (
      icon
    );

  return (
    <Tag
      ref={ref as Ref<never>}
      type={isNativeButton ? (typeProp ?? "button") : typeProp}
      aria-label={label}
      className={cx(
        styles.root,
        styles.size[resolvedSize],
        buttonStyles.appearance[resolvedAppearance],
        className,
      )}
      data-selected={isSelected || undefined}
      aria-pressed={isSelected || undefined}
      onClick={effectiveDisabled || isLoading ? undefined : (onClick as never)}
      {...inertProps}
      {...restRecord}
    >
      <span className={styles.iconLayer}>{iconNode}</span>
      {isLoading && (
        <span className={buttonStyles.spinner} aria-hidden="true">
          {loadingIndicator ?? DEFAULT_SPINNER_SVG}
        </span>
      )}
    </Tag>
  );
}

// forwardRef's bivariant signature can't infer through the generic +
// required-props combination, so we erase the type during the wrap and
// re-apply the polymorphic public signature on the export.
const IconButtonForwardRef = forwardRef(IconButtonImpl as never);

export const IconButton = IconButtonForwardRef as unknown as <
  E extends ElementType = typeof DEFAULT_TAG,
>(
  props: IconButtonProps<E> & { ref?: Ref<HTMLElement> },
) => ReactElement;
