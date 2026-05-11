import {
  forwardRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from "react";

import { cx } from "../utils/classNames";
import * as styles from "./Avatar.css";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Visual color preset.
 *
 * - **`auto`** (default) — when initials are shown, derive a deterministic
 *   color from `name` so the same person always gets the same color.
 * - **`neutral`** — the muted grey surface; no color signal.
 * - **`blue` / `green` / `red` / `yellow` / `purple`** — named presets.
 */
export type AvatarAppearance =
  | "auto"
  | "neutral"
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "purple";

/** A single entry in an Avatar palette. */
export type AvatarPaletteEntry = {
  /** Background color (any CSS color or `var(...)`). */
  bg: string;
  /** Foreground / text color (any CSS color or `var(...)`). */
  color: string;
  /** Optional border color override. Defaults to `transparent`. */
  borderColor?: string;
};

export type AvatarProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  /** Image URL. If absent or it fails to load, initials are shown. */
  src?: string;
  /** Display name. Used to compute initials and the deterministic color. */
  name?: string;
  /** Visual scale. @default "md" */
  size?: AvatarSize;
  /** Color preset. @default "auto" */
  appearance?: AvatarAppearance;
  /**
   * Override the palette used by `appearance="auto"`. Useful for matching
   * a specific brand. Each entry is `{ bg, color, borderColor? }` — any
   * CSS color string. The hash-by-name math runs over this array, so the
   * length determines how many distinct colors are possible.
   */
  palette?: AvatarPaletteEntry[];
};

// ----------------------------------------------------------------------------
// Defaults
// ----------------------------------------------------------------------------

/**
 * The default 8-tone palette used by `appearance="auto"`. Five tinted
 * tones (light bg + dark same-hue text) and three filled tones (saturated
 * bg + white text) provide enough variety to keep neighbouring avatars
 * visually distinct in a typical team list. Consumers who want a
 * different mix can pass their own palette via the `palette` prop.
 */
const DEFAULT_PALETTE: AvatarPaletteEntry[] = [
  {
    bg: "var(--catylast-color-blue-100)",
    color: "var(--catylast-color-blue-700)",
  },
  {
    bg: "var(--catylast-color-green-100)",
    color: "var(--catylast-color-green-700)",
  },
  {
    bg: "var(--catylast-color-red-100)",
    color: "var(--catylast-color-red-700)",
  },
  {
    bg: "var(--catylast-color-yellow-100)",
    color: "var(--catylast-color-yellow-700)",
  },
  {
    bg: "var(--catylast-color-purple-100)",
    color: "var(--catylast-color-purple-700)",
  },
  {
    bg: "var(--catylast-color-blue-500)",
    color: "var(--catylast-color-neutral-0)",
  },
  {
    bg: "var(--catylast-color-purple-500)",
    color: "var(--catylast-color-neutral-0)",
  },
  {
    bg: "var(--catylast-color-green-600)",
    color: "var(--catylast-color-neutral-0)",
  },
];

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return initials || "?";
}

/**
 * Stable deterministic string hash. Same name always produces the same
 * non-negative integer, so the chosen palette index survives re-renders
 * and matches across surfaces (a user's avatar in a comment matches
 * their avatar in a mention popover, in a row-selection cell, etc).
 *
 * djb2 with sign-bit masking — fast, well-distributed, no allocations.
 */
function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickPaletteEntry(
  name: string | undefined,
  palette: AvatarPaletteEntry[],
): AvatarPaletteEntry | null {
  if (!name || palette.length === 0) return null;
  const idx = hashString(name) % palette.length;
  return palette[idx] ?? null;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  {
    src,
    name,
    size = "md",
    appearance = "auto",
    palette = DEFAULT_PALETTE,
    className,
    style,
    ...rest
  },
  ref,
) {
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(src) && !errored;

  // For `auto` appearance: hash the name to pick a palette entry and
  // write the colors as inline CSS variables. Inline styles win over
  // class-based vars from named-appearance presets, so consumers using
  // `style={{ "--avatar-bg": ... }}` always get final say.
  let inlineVars: Record<string, string> = {};
  if (!showImage && appearance === "auto") {
    const entry = pickPaletteEntry(name, palette);
    if (entry) {
      inlineVars = {
        "--avatar-bg": entry.bg,
        "--avatar-color": entry.color,
        "--avatar-border-color": entry.borderColor ?? "transparent",
      };
    }
  }

  const appearanceClass =
    appearance !== "auto" ? styles.appearance[appearance] : undefined;

  const mergedStyle = {
    ...inlineVars,
    ...(style as CSSProperties | undefined),
  } as CSSProperties;

  return (
    <span
      ref={ref}
      role="img"
      aria-label={name ?? "User"}
      className={cx(styles.root, styles.size[size], appearanceClass, className)}
      style={mergedStyle}
      {...rest}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className={styles.image}
          onError={() => setErrored(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
});

// Re-export the default palette so consumers can extend rather than
// replace (e.g. `palette={[...DEFAULT_AVATAR_PALETTE, customEntry]}`).
export { DEFAULT_PALETTE as DEFAULT_AVATAR_PALETTE };
