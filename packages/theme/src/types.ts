export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export type ThemeContextValue = {
  /** The mode the user (or app) selected — may be `"system"`. */
  mode: ThemeMode;
  /** The actual theme being rendered — never `"system"`. */
  resolvedMode: ResolvedTheme;
  /** Update the mode. Persists if a `storageKey` was provided to ThemeProvider. */
  setMode: (mode: ThemeMode) => void;
};
