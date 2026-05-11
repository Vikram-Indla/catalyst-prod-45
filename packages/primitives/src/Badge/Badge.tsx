import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

import { cx } from "../utils/classNames";
import * as styles from "./Badge.css";

export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = "default", className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cx(styles.root, styles.variant[variant], className)}
      {...rest}
    />
  );
});
