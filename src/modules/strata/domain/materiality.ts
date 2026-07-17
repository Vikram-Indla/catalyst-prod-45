/**
 * F-9 revision materiality — the ONE rule for reading a trend that spans KPI versions.
 *
 * Exported and shared for the same reason the effective-version resolver is a single DB function:
 * the ruling forbids surfaces inventing their own version handling. KPI detail is the first caller;
 * scorecard detail and board packs are next (F-3 requires the qualification wherever the numbers
 * appear). If each re-derived "is this comparable?", they would disagree, and a chart that draws one
 * continuous line across two different definitions is a lie no one can see.
 *
 * The rule, from the ruling:
 *   material     — formula / unit / direction / scope / source-semantic change, or a comparability
 *                  break. Consumers MUST show a methodology break, MUST NOT carry an old actual
 *                  forward, and MUST NOT imply direct comparability without an approved bridge.
 *   non_material — wording / owner / metadata only. Continuous trend display is PERMITTED, with
 *                  exact provenance.
 *
 * `revision_class` is NULL exactly when a version is not a revision (DB CHECK: supersedes_id IS NULL
 * OR revision_class IS NOT NULL). NULL therefore means "not a revision", never "unclassified", so it
 * is never treated as a break.
 */

/** The minimum a caller must supply per plotted point. Deliberately structural, not tied to a page. */
export interface MaterialityPoint {
  /** The version that produced this point, read from the row's own kpi_id — provenance, not a guess. */
  kpiVersion: number | null;
  /** The owning version's revision_class. */
  revisionClass: string | null;
  /** Human label for where the break falls (a period name). */
  label: string | null;
}

export interface MethodologyBreak {
  /** The version that introduced the break. */
  version: number;
  /** Where it takes effect, in the caller's terms. */
  label: string;
}

/**
 * Breaks in a trend, in plot order. A break is where consecutive points come from DIFFERENT versions
 * and the later version is `material`.
 *
 * Derived from the points actually plotted, so it can never claim a break the chart does not show —
 * and never misses one it does. Points whose version is unknown (null) are skipped rather than
 * guessed: an unknown version is not evidence of a break, and asserting one would be as wrong as
 * hiding it.
 *
 * @param points ordered oldest → newest, as plotted.
 */
export function methodologyBreaks(points: MaterialityPoint[]): MethodologyBreak[] {
  const out: MethodologyBreak[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    if (prev.kpiVersion === null || cur.kpiVersion === null) continue;
    if (cur.kpiVersion !== prev.kpiVersion && cur.revisionClass === 'material') {
      out.push({ version: cur.kpiVersion, label: cur.label ?? '—' });
    }
  }
  return out;
}
