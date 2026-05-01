/**
 * PriorityIcon — LEGACY DELEGATION SHIM
 *
 * 2026-05-01: This file is now a delegation layer to the canonical
 * `PriorityIcon` from `@/components/icons` (which renders the new
 * Catalyst priority SVG assets at src/assets/icons/priority/).
 *
 * Why delegate instead of remove?
 *   - 4 dashboard widgets import this default export with a `level: string`
 *     prop signature. Migrating each consumer is wider blast radius than
 *     swapping the renderer.
 *
 * NEW WORK MUST USE: `import { PriorityIcon } from '@/components/icons'`
 *
 * The canonical component supports:
 *   - 6 levels (Highest/High/Medium/Low/Lowest/None) vs this file's 5
 *   - Light/dark mode automatic swap
 *   - Type-safe `PriorityLevel` union from icons.registry
 *
 * This file's `PriorityLevel` is preserved as an alias for back-compat;
 * the runtime value normalization goes through `normalizePriority` from
 * the new registry.
 */
import { PriorityIcon as CanonicalPriorityIcon, normalizePriority } from '@/components/icons';

/** @deprecated Use `PriorityLevel` from `@/components/icons`. */
export type PriorityLevel = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

interface PriorityIconProps {
  level: string | null | undefined;
  size?: number;
  className?: string;
}

/**
 * @deprecated Use `PriorityIcon` from `@/components/icons`.
 *
 * Forwards to the canonical component. The legacy contract returned an
 * empty span for null/empty input (rather than the 'none' glyph) — we
 * preserve that here so consumers depending on "render nothing for
 * missing priority" don't suddenly start showing a None glyph.
 */
function PriorityIcon({ level, size = 16, className }: PriorityIconProps) {
  if (!level || (typeof level === 'string' && level.trim() === '')) {
    return <span aria-hidden style={{ display: 'inline-block', width: size, height: size }} />;
  }
  return <CanonicalPriorityIcon level={level} size={size} className={className} />;
}

/**
 * @deprecated Use `normalizePriority` from `@/components/icons`. The legacy
 * shape returns capitalized labels ('Highest'); the new helper returns
 * kebab-case canonical levels ('highest').
 */
function normalizeLegacy(raw: string | null | undefined): PriorityLevel | null {
  if (!raw) return null;
  const norm = normalizePriority(raw);
  if (norm === 'none') return null;
  // capitalize first letter to match legacy shape
  return (norm.charAt(0).toUpperCase() + norm.slice(1)) as PriorityLevel;
}

PriorityIcon.normalize = normalizeLegacy;

export default PriorityIcon;
