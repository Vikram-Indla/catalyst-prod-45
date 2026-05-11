import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ElementType,
  type ReactNode,
} from "react";
import type { IconName } from "@catylast/icons";

import { IconButton } from "../IconButton/IconButton";
import type {
  IconButtonAppearance,
  IconButtonSizeAlias,
  IconButtonVariant,
} from "../IconButton/IconButton";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type LinkIconButtonProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "type" | "aria-label" | "children"
> & {
  /** The icon to render. Either a registered icon name or any React node. */
  icon: IconName | ReactNode;
  /** Required accessible label — describes what the link does. */
  label: string;
  /** Visual color preset. @default "subtle" */
  appearance?: IconButtonAppearance;
  /** Legacy alias for `appearance`. */
  variant?: IconButtonVariant;
  /** Overall scale (square dimensions + icon size). @default "medium" */
  size?: IconButtonSizeAlias;
  /** Toggle-on state. */
  isSelected?: boolean;
  /** Disabled — anchors don't have native `disabled`, so we use `aria-disabled`. */
  isDisabled?: boolean;
  /** Override the rendered tag. Defaults to `"a"`. */
  as?: ElementType;
};

// ----------------------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------------------

/**
 * An icon-only button that renders as an anchor (`<a>` by default). All
 * IconButton appearance / size / state props apply. Pair with `href`
 * or `as={RouterLink}` for routing.
 */
export const LinkIconButton = forwardRef<
  HTMLAnchorElement,
  LinkIconButtonProps
>(function LinkIconButton({ as = "a", ...rest }, ref) {
  const IconButtonAny = IconButton as unknown as React.ComponentType<
    Record<string, unknown> & { ref?: React.Ref<unknown> }
  >;
  return <IconButtonAny {...rest} as={as} ref={ref} />;
});
