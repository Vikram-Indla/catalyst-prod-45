import type { CSSProperties, ElementType, ReactNode } from "react";

import type { ResolvedTheme, ThemeMode } from "./types";
import { usePrefersColorScheme } from "./usePrefersColorScheme";

export type ThemeScopeProps = {
  children: ReactNode;
  /** The theme to apply within this scope. */
  mode: ThemeMode;
  /**
   * The HTML element to render as the wrapper.
   * @default "div"
   */
  as?: ElementType;
  /** Class name applied to the wrapper. */
  className?: string;
  /** Inline styles for the wrapper. */
  style?: CSSProperties;
};

/**
 * Render children inside a wrapper element with the given theme. Use this
 * when a subtree needs to render in a different theme than the rest of the
 * app (for example, a dark-themed media card on a light page).
 */
export function ThemeScope({
  children,
  mode,
  as,
  className,
  style,
}: ThemeScopeProps) {
  const prefersDark = usePrefersColorScheme();
  const resolved: ResolvedTheme =
    mode === "system" ? (prefersDark ? "dark" : "light") : mode;

  const Component = (as ?? "div") as ElementType;

  return (
    <Component data-theme={resolved} className={className} style={style}>
      {children}
    </Component>
  );
}
