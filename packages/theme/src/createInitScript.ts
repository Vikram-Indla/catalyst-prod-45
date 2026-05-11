import type { ThemeMode } from "./types";

export type CreateInitScriptOptions = {
  /** localStorage key to read the persisted mode from. */
  storageKey?: string;
  /** Mode to fall back to when no stored value exists. */
  defaultMode?: ThemeMode;
  /** Attribute to set on `<html>`. */
  attribute?: string;
};

/**
 * Returns a tiny JS string to inline in the document head before any React
 * bundles execute. It reads the persisted theme preference (or falls back to
 * `defaultMode`), resolves `"system"` via the `prefers-color-scheme` media
 * query, and sets `data-theme` on the root element. Prevents a flash of
 * incorrect theme on first paint.
 */
export function createInitScript(options: CreateInitScriptOptions = {}): string {
  const { storageKey, defaultMode = "system", attribute = "data-theme" } = options;
  const storedExpr = storageKey
    ? `(localStorage.getItem(${JSON.stringify(storageKey)}) || ${JSON.stringify(defaultMode)})`
    : JSON.stringify(defaultMode);
  return [
    "(function(){try{",
    `var m=${storedExpr};`,
    `var r=m==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):m;`,
    `document.documentElement.setAttribute(${JSON.stringify(attribute)},r);`,
    "}catch(e){}})();",
  ].join("");
}
