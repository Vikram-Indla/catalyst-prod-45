/**
 * CAT-DS-TOKEN-POISON-20260710-001 — R8 codemod support (Goal 4 final content slice).
 *
 * Maps legacy shadcn-style "raw HSL triplet" custom properties (--background,
 * --primary, --muted-foreground, ...) consumed as `hsl(var(--x) [/ alpha])` to
 * the real ADS token that already documents the intended mapping in the
 * surrounding file's own inline comments (see src/index.css :root block).
 *
 * Two dispositions:
 *  - RESOLVED_PASSTHROUGH: the legacy var already resolves (through its own
 *    chain) to a real --ds-* token — wrapping it in hsl()/rgb() was a bug
 *    (hsl() expects H/S/L components, not another token's resolved color).
 *    Fix: drop the hsl()/rgb() wrapper, keep the bare var() reference.
 *  - RAW_TRIPLET: the legacy var is genuinely declared as raw H S% L%
 *    components — hsl(var(--x)) is the intended shape. Fix: replace the
 *    WHOLE hsl(var(--x)[/alpha]) expression with the mapped --ds-* token,
 *    selected by the category of the CSS property/style-key consuming it.
 */

export const RESOLVED_PASSTHROUGH = new Set([
  '--chart-1', '--chart-2', '--chart-3', '--chart-4',
  '--chart-5', '--chart-6', '--chart-7', '--chart-8',
  '--status-success', '--status-warning', '--status-info', '--status-danger', '--status-muted',
]);

// category keys: text | bg | bgAlpha | border | icon | shadow
export const RAW_TRIPLET = {
  '--background': { bg: '--ds-surface' },
  '--foreground': { text: '--ds-text' },
  '--card': { bg: '--ds-surface' },
  '--popover': { bg: '--ds-surface-overlay' },
  '--muted': { bg: '--ds-background-neutral', border: '--ds-border', icon: '--ds-border' },
  '--muted-foreground': { text: '--ds-text-subtle', icon: '--ds-text-subtle' },
  '--primary': {
    text: '--ds-text-brand', bg: '--ds-background-information-bold', bgAlpha: '--ds-background-information',
    border: '--ds-border-brand', icon: '--ds-icon-brand',
  },
  '--primary-foreground': { text: '--ds-text-inverse' },
  '--accent': { bg: '--ds-background-selected' },
  '--destructive': {
    text: '--ds-text-danger', bg: '--ds-background-danger-bold', bgAlpha: '--ds-background-danger',
    border: '--ds-border-danger',
  },
  '--border': { border: '--ds-border', bg: '--ds-border' },
  '--border-default': { border: '--ds-border', bg: '--ds-border' },
  '--border-subtle': { border: '--ds-border' },
  '--input': { border: '--ds-border' },
  '--ring': { border: '--ds-border-focused', bg: '--ds-border-focused' },
  '--focus-ring': { border: '--ds-border-focused', bg: '--ds-border-focused' },
  // shadow-color is consumed only inside box-shadow's color slot — the whole
  // hsl(var(--shadow-color) / alpha) is replaced with the baked ADS shadow token.
  '--shadow-color': { shadow: '--ds-shadow-overlay' },
  '--text-primary': { text: '--ds-text' },
  '--text-secondary': { text: '--ds-text' },
  '--text-tertiary': { text: '--ds-text-subtle' },
  '--text-muted': { text: '--ds-text-subtlest', bg: '--ds-background-neutral-subtle' },
  '--text-link': { text: '--ds-link' },
  '--brand-primary': {
    text: '--ds-link', bg: '--ds-background-brand-bold', border: '--ds-border-brand', icon: '--ds-icon-brand',
    shadow: '--ds-border-brand',
  },
  '--brand-primary-hover': { bg: '--ds-background-brand-bold-hovered' },
  // secondary-bronze/olive are a bespoke categorical badge palette (bronze≈orange
  // family, olive≈green family) — chart tokens preserve the hue family; the
  // Alpha/"subtle" role maps to the matching subtle semantic surface.
  '--secondary-bronze': { text: '--ds-chart-orange-bold', bg: '--ds-chart-orange-bold', bgAlpha: '--ds-background-warning', border: '--ds-chart-orange-bold' },
  '--secondary-olive': { text: '--ds-chart-green-bold', bg: '--ds-chart-green-bold', bgAlpha: '--ds-background-success', border: '--ds-chart-green-bold' },
  '--secondary-green': { text: '--ds-chart-green-bold', bg: '--ds-chart-green-bold' },
  '--warning': { text: '--ds-text-warning', bg: '--ds-background-warning-bold' },
  '--success': { text: '--ds-text-success', bg: '--ds-background-success-bold' },
  '--danger': { text: '--ds-text-danger', bg: '--ds-background-danger-bold' },
  '--info': { text: '--ds-text-information', bg: '--ds-background-information-bold' },
};

/** Category implied by a real CSS property (bg/text/border/icon/shadow only — no font/space here). */
export function cssPropCategory(prop) {
  const p = prop.toLowerCase();
  if (p === 'color' || p === '-webkit-text-fill-color' || p === 'caret-color' || p === 'text-decoration-color' || p === 'text-emphasis-color') return 'text';
  if (p.includes('background')) return 'bg';
  if (p.startsWith('border') || p.startsWith('outline') || p === 'column-rule' || p === 'column-rule-color' || p === 'scrollbar-color') return 'border';
  if (p === 'fill' || p === 'stroke') return 'icon';
  if (p.includes('shadow')) return 'shadow';
  return null;
}

/** Category from a JS/TS style-object key (camelCase). */
export function styleKeyCategory(key) {
  const k = key.replace(/^Webkit|^Moz|^ms/, '').replace(/^['"]|['"]$/g, '');
  if (/^(color|caretColor|TextFillColor|textDecorationColor)$/i.test(k)) return 'text';
  if (/^background(Color|Image)?$/i.test(k)) return 'bg';
  if (/^(border|outline|borderColor|borderTopColor|borderRightColor|borderBottomColor|borderLeftColor)/i.test(k)) return 'border';
  if (/shadow/i.test(k)) return 'shadow';
  if (/^(fill|stroke)$/i.test(k)) return 'icon';
  return null;
}

/** Category from a Tailwind arbitrary-value utility prefix, e.g. `bg-[...]`. */
export function tailwindPrefixCategory(prefix) {
  const p = prefix.toLowerCase();
  if (p === 'bg' || p === 'from' || p === 'via' || p === 'to' || p === 'accent') return 'bg';
  if (p === 'text' || p === 'caret' || p === 'placeholder' || p === 'decoration') return 'text';
  if (p === 'border' || p === 'ring' || p === 'divide' || p === 'outline' || /^border-[trblxy]$/.test(p)) return 'border';
  if (p === 'shadow') return 'shadow';
  if (p === 'fill' || p === 'stroke') return 'icon';
  return null;
}

/**
 * Resolve the replacement var() for a single `hsl(var(--x))` or
 * `hsl(var(--x) / alpha)` match, given the consuming category.
 * Returns null if unmapped (caller should leave it for hand review).
 */
export function resolveLegacyHsl(varName, category, hasAlpha) {
  if (RESOLVED_PASSTHROUGH.has(varName)) return { replacement: `var(${varName})`, mode: 'passthrough' };
  const m = RAW_TRIPLET[varName];
  if (!m) return null;
  if (category === 'shadow' && m.shadow) return { replacement: `var(${m.shadow})`, mode: 'shadow-whole' };
  if (category === 'bg') {
    const tok = hasAlpha && m.bgAlpha ? m.bgAlpha : m.bg;
    if (tok) return { replacement: `var(${tok})`, mode: 'token' };
  }
  if (category === 'text' && m.text) return { replacement: `var(${m.text})`, mode: 'token' };
  if (category === 'border' && m.border) return { replacement: `var(${m.border})`, mode: 'token' };
  if (category === 'icon' && m.icon) return { replacement: `var(${m.icon})`, mode: 'token' };
  // fall back to whatever this token's "home" meaning is, if the category-specific one is missing
  const fallback = m.text || m.bg || m.border || m.icon;
  return fallback ? { replacement: `var(${fallback})`, mode: 'fallback' } : null;
}
