import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { ResolvedTheme, ThemeContextValue, ThemeMode } from "./types";
import { usePrefersColorScheme } from "./usePrefersColorScheme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = {
  children: ReactNode;
  /**
   * Initial mode used when no stored preference exists.
   * @default "system"
   */
  defaultMode?: ThemeMode;
  /**
   * If provided, persist the user's selected mode to `localStorage` under
   * this key. Without it, theme selections are lost on reload.
   */
  storageKey?: string;
  /**
   * Element to set the theme attribute on. Pass `null` to disable DOM
   * mutation entirely (useful when an init script has already applied
   * `data-theme` and you only need React state).
   *
   * If omitted, `document.documentElement` is used.
   */
  target?: HTMLElement | null;
  /**
   * The attribute written to `target`.
   * @default "data-theme"
   */
  attribute?: string;
};

function readStored(storageKey: string | undefined): ThemeMode | null {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage may throw in private mode or sandboxed iframes
  }
  return null;
}

export function ThemeProvider({
  children,
  defaultMode = "system",
  storageKey,
  target,
  attribute = "data-theme",
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(
    () => readStored(storageKey) ?? defaultMode,
  );

  const prefersDark = usePrefersColorScheme();
  const resolvedMode: ResolvedTheme =
    mode === "system" ? (prefersDark ? "dark" : "light") : mode;

  useEffect(() => {
    const el =
      target === undefined
        ? typeof document !== "undefined"
          ? document.documentElement
          : null
        : target;
    if (!el) return;
    el.setAttribute(attribute, resolvedMode);
  }, [resolvedMode, target, attribute]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      if (storageKey && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(storageKey, next);
        } catch {
          // ignore
        }
      }
    },
    [storageKey],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedMode, setMode }),
    [mode, resolvedMode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside a <ThemeProvider>");
  }
  return ctx;
}
