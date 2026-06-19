/**
 * jqlClause — the one shared piece of the three forward filter→JQL serializers
 * (Phase C3/C4, G2). Builds a single field clause:
 *   1 value  → `field = "x"`
 *   N values → `field in ("x", "y")`
 *
 * Returns null when there are no values (caller skips it). The `quote` fn lets
 * each serializer keep its own escaping: the lib FilterState serializer escapes
 * embedded quotes; the toolbar + basic serializers do not. Output is identical
 * to the inlined logic each serializer used before — pinned by
 * src/lib/filters/__tests__/serializers.golden.test.ts.
 */
export function jqlClause(
  field: string,
  values: string[] | undefined,
  quote: (v: string) => string = v => `"${v}"`,
): string | null {
  if (!values || values.length === 0) return null;
  if (values.length === 1) return `${field} = ${quote(values[0])}`;
  return `${field} in (${values.map(quote).join(', ')})`;
}
