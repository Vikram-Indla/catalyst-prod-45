export const TOKEN_PREFIX = "--catylast";

export type VarTree<T> = T extends Record<string, unknown>
  ? { readonly [K in keyof T]: VarTree<T[K]> }
  : string;

function isLeaf(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

/**
 * Convert camelCase / PascalCase identifiers to kebab-case so the CSS
 * variable name produced for a token like `font.lineHeight` /
 * `borderWidth` / `zIndex` is consistent and predictable across the JS
 * accessor and the emitted `tokens.css` file.
 *
 * Without this normalization, `flattenLeaves` would emit
 * `--catylast-zIndex-dropdown` (matching the natural object key) while
 * `makeVars` callers reference `--catylast-z-index-dropdown` (the kebab
 * form passed in by `index.ts`). The mismatched references resolve to
 * `auto` at runtime and z-index battles silently fail.
 */
function camelToKebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function makeVars<T extends Record<string, unknown>>(
  shape: T,
  path: string[] = [],
): VarTree<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(shape)) {
    const nextPath = [...path, camelToKebab(String(key))];
    if (isLeaf(value)) {
      result[key] = `var(${TOKEN_PREFIX}-${nextPath.join("-")})`;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = makeVars(value as Record<string, unknown>, nextPath);
    }
  }
  return result as VarTree<T>;
}

export function flattenLeaves(
  shape: Record<string, unknown>,
  path: string[] = [],
): Array<[string, string | number]> {
  const out: Array<[string, string | number]> = [];
  for (const [key, value] of Object.entries(shape)) {
    const nextPath = [...path, camelToKebab(String(key))];
    if (isLeaf(value)) {
      out.push([nextPath.join("-"), value]);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...flattenLeaves(value as Record<string, unknown>, nextPath));
    }
  }
  return out;
}
