import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { cx } from "../utils/classNames";
import * as styles from "./ButtonGroup.css";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type ButtonGroupGap = "default" | "compact" | "none";
export type ButtonGroupOrientation = "horizontal" | "vertical";

export type ButtonGroupProps = ComponentPropsWithoutRef<"div"> & {
  /** Accessible label for the grouped buttons. Required for semantics. */
  label: string;
  /** Spacing between buttons. Ignored when `isSegmented` is true. @default "default" */
  gap?: ButtonGroupGap;
  /**
   * Render the buttons as a single segmented control — adjacent buttons
   * collapse their borders into a shared seam and the outside corners
   * round as a unit. Use for filters / view-modes / sort-orders where the
   * group reads as one widget.
   */
  isSegmented?: boolean;
  /** Stack horizontally or vertically. @default "horizontal" */
  orientation?: ButtonGroupOrientation;
  children?: ReactNode;
};

// ----------------------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------------------

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup(
    {
      label,
      gap = "default",
      isSegmented = false,
      orientation = "horizontal",
      className,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        role="group"
        aria-label={label}
        aria-orientation={orientation}
        className={cx(
          styles.root,
          styles.orientation[orientation],
          isSegmented ? styles.segmented : styles.gap[gap],
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
