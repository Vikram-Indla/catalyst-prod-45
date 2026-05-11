import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { cx } from "../utils/classNames";
import * as styles from "./SplitButton.css";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type SplitButtonProps = ComponentPropsWithoutRef<"div"> & {
  /** Accessible label for the group — announces what the two halves do together. */
  label: string;
  /** The two halves. Typically `<Button>` (primary action) + `<Menu>`-wired `<IconButton>`. */
  children: ReactNode;
};

// ----------------------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------------------

/**
 * Wraps two adjacent buttons so they share a vertical seam — primary action
 * on the left, dropdown trigger on the right.
 *
 * Usage:
 *
 * ```tsx
 * <SplitButton label="Save options">
 *   <Button appearance="primary" onClick={save}>Save</Button>
 *   <Menu>
 *     <MenuTrigger asChild>
 *       <IconButton icon="chevron-down" label="Save options" appearance="primary" />
 *     </MenuTrigger>
 *     <MenuContent>
 *       <MenuItem onSelect={saveAndContinue}>Save and continue</MenuItem>
 *       <MenuItem onSelect={saveAsDraft}>Save as draft</MenuItem>
 *     </MenuContent>
 *   </Menu>
 * </SplitButton>
 * ```
 *
 * Both halves should share the same `appearance` and `size`. The component
 * does not enforce this — consumers retain full control over each half so
 * exotic combinations (e.g. primary action + subtle chevron) remain possible.
 */
export const SplitButton = forwardRef<HTMLDivElement, SplitButtonProps>(
  function SplitButton({ label, className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        role="group"
        aria-label={label}
        className={cx(styles.root, className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
