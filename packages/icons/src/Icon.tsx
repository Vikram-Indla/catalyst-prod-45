import type { CSSProperties } from "react";

import { iconRegistry } from "./registry";
import type { IconName } from "./registry";

export type IconProps = {
  /** Icon to render. Autocompletes from the registry. */
  name: IconName;
  /**
   * Pixel size of the rendered SVG.
   * @default 16
   */
  size?: number;
  /**
   * Fill / stroke color. Defaults to `currentColor` so the icon inherits the
   * surrounding text color — pass an explicit value only when you need to
   * override that.
   * @default "currentColor"
   */
  color?: string;
  /**
   * SVG stroke width.
   * @default 2
   */
  strokeWidth?: number;
  /**
   * Accessible label. If omitted, the icon is treated as decorative and
   * hidden from assistive tech.
   */
  label?: string;
  /** Class name passed through to the SVG. */
  className?: string;
  /** Inline styles passed through to the SVG. */
  style?: CSSProperties;
};

export function Icon({
  name,
  size = 16,
  color = "currentColor",
  strokeWidth = 2,
  label,
  className,
  style,
}: IconProps) {
  const Component = iconRegistry[name];
  if (!Component) return null;

  const decorative = !label;

  return (
    <Component
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      aria-label={label}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable={false}
    />
  );
}
