import { forwardRef, type AnchorHTMLAttributes, type ElementType } from "react";

import { Button } from "../Button/Button";
import type {
  ButtonAppearance,
  ButtonIconSlot,
  ButtonSizeAlias,
  ButtonSpacing,
  ButtonVariant,
} from "../Button/Button";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type LinkButtonProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "type"
> & {
  /** Visual color preset. @default "default" */
  appearance?: ButtonAppearance;
  /** Legacy alias for `appearance`. */
  variant?: ButtonVariant;
  /** Overall scale (font + min-height). @default "medium" */
  size?: ButtonSizeAlias;
  /** Horizontal padding density. @default "default" */
  spacing?: ButtonSpacing;
  /** Icon (or any node) before the label. */
  iconBefore?: ButtonIconSlot;
  /** Icon (or any node) after the label. */
  iconAfter?: ButtonIconSlot;
  /** Disabled — anchors don't have native `disabled`, so we use `aria-disabled`. */
  isDisabled?: boolean;
  /** Accent border + tinted background. */
  isSelected?: boolean;
  /** Stretch to fill the parent's width. */
  shouldFitContainer?: boolean;
  /**
   * Override the rendered tag. Defaults to `"a"`. Pass a router Link
   * (`as={Link}`) to integrate with Next.js / React Router / etc.
   */
  as?: ElementType;
};

// ----------------------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------------------

/**
 * A button that renders as an anchor (`<a>` by default). All Button
 * appearance / size / spacing / icon / state props apply. Pair with
 * `href` for plain anchors, or pass `as={RouterLink}` for client-side
 * navigation.
 */
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  function LinkButton({ as = "a", ...rest }, ref) {
    const ButtonAny = Button as unknown as React.ComponentType<
      Record<string, unknown> & { ref?: React.Ref<unknown> }
    >;
    return <ButtonAny {...rest} as={as} ref={ref} />;
  },
);
