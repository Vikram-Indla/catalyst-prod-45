/**
 * CAT-DS-TOKEN-POISON-20260710-001 — Goal 3 sweep mappings.
 * Source of truth: catalyst/features/CAT-DS-TOKEN-POISON-20260710-001/02_CANONICAL_DISCOVERY.md
 * (B.3 phantom table + B.6 legacy-disposition table).
 *
 * Every entry:
 *   byCat  — replacement --ds-* token keyed by consuming-property category
 *            (text | bg | border | icon | shadow | font | chart)
 *   def    — replacement when category is unknown/unmapped (falls back to first
 *            live token in chain first, see engine)
 *   home   — the token's name-implied category; replacements in another
 *            category are logged as strays in the report
 *   leaveCats — categories whose refs must be LEFT untouched (reported)
 *   leaveUnknown — leave + report when category cannot be determined
 *   literal — replace chain with its existing terminal fallback literal
 *   deleteDef — delete the token's own declarations once consumer refs hit 0
 */

const T = {
  text: '--ds-text',
  subtle: '--ds-text-subtle',
  subtlest: '--ds-text-subtlest',
  disabled: '--ds-text-disabled',
  border: '--ds-border',
};

// ---------- Phantoms (never defined anywhere) — B.3 ----------
export const PHANTOMS = {
  // Big three
  '--cp-bg-neutral': {
    byCat: { text: T.text, border: T.border, bg: '--ds-background-neutral', icon: T.text },
    def: T.text, home: 'bg',
  },
  '--cp-border-neutral': {
    byCat: { border: T.border, bg: '--ds-background-neutral', text: T.text, icon: T.text },
    def: T.border, home: 'border',
  },
  '--cp-border-neutral-light': {
    byCat: { text: T.subtlest, border: T.border, bg: '--ds-background-neutral', icon: T.subtlest },
    def: T.subtlest, home: 'border',
  },
  // Minor phantoms
  '--cp-ink-muted': { byCat: { text: T.subtlest, icon: T.subtlest }, def: T.subtlest, home: 'text' },
  '--cp-ink': { byCat: { text: T.text, border: T.border, icon: T.text }, def: T.text, home: 'text' },
  '--cp-bg-secondary': { byCat: { bg: '--ds-surface-sunken' }, def: '--ds-surface-sunken', home: 'bg' },
  '--cp-shadow-popover': { byCat: { shadow: '--ds-shadow-overlay' }, def: '--ds-shadow-overlay', home: 'shadow' },
  '--cp-font-ui': { byCat: { font: '--ds-font-family-body' }, def: '--ds-font-family-body', home: 'font' },
  // roadmap-ringfenced.css phantoms — targets confirmed by the file's own inline comments
  '--cp-teal-5': { def: '--ds-background-success', home: 'bg' },
  '--cp-teal-40': { def: '--ds-chart-teal-bold', home: 'chart' },
  '--cp-teal-70': { def: '--ds-chart-teal-bolder', home: 'chart' },
  '--cp-warning-40': { def: '--ds-text-warning', home: 'text' },
  '--cp-warning-50': { def: '--ds-text-warning', home: 'text' },
  '--cp-warning-70': { def: '--ds-background-warning-bold', home: 'bg' },
  '--cp-bg-tertiary': { def: '--ds-surface-sunken', home: 'bg' },
  // disabled-state brand button fills (JiraSyncDrawer / GeneralTab, both disabled controls)
  '--cp-primary-30': { def: '--ds-background-disabled', home: 'bg' },
  '--cp-blue-muted': { def: '--ds-background-disabled', home: 'bg' },
  '--cp-overlay-scrim': { def: '--ds-blanket', home: 'bg' },
  // spacing — spec rule 2 mapping
  '--cp-space-3': { def: '--ds-space-075', home: 'space' },
  '--cp-space-4': { def: '--ds-space-100', home: 'space' },
  '--cp-space-6': { def: '--ds-space-150', home: 'space' },
  // drawer geometry — keep the old resolved value (the literal fallback)
  '--cp-drawer-z': { literal: true, home: 'other' },
  '--cp-drawer-width': { literal: true, home: 'other' },
};

// ---------- Legacy names (swept, definitions deleted) — B.6 ----------
function textLadder(level) {
  const map = { 1: T.text, 2: T.subtle, 3: T.subtlest, 4: T.disabled }[level];
  return {
    // bg strays: text-ladder grays used as fills (dots, level bars, backdrops) are
    // dark/bold fills — --ds-background-neutral would flip them light. Every one is
    // logged as a stray in the report for eyeball review.
    byCat: { text: map, border: T.border, bg: '--ds-background-neutral-bold', icon: map },
    def: map, home: 'text', deleteDef: true,
  };
}

export const LEGACY = {
  '--fg-1': textLadder(1), '--fg-2': textLadder(2), '--fg-3': textLadder(3), '--fg-4': textLadder(4),
  '--text-1': textLadder(1), '--text-2': textLadder(2), '--text-3': textLadder(3), '--text-4': textLadder(4),
  '--cp-t1': textLadder(1), '--cp-t2': textLadder(2), '--cp-t3': textLadder(3), '--cp-t4': textLadder(4),
  // fill/stroke of bg-named tokens = shapes painted with the surface gray (donut tracks,
  // knockouts) — the bg mapping carries the intent. Text strays are left + reported.
  '--bg-0': { byCat: { bg: '--ds-surface', border: T.border, icon: '--ds-surface' }, def: '--ds-surface', home: 'bg', deleteDef: true, leaveCats: ['text'] },
  '--bg-1': { byCat: { bg: '--ds-surface-sunken', border: T.border, icon: '--ds-surface-sunken' }, def: '--ds-surface-sunken', home: 'bg', deleteDef: true, leaveCats: ['text'] },
  '--bg-2': { byCat: { bg: '--ds-surface-sunken', border: T.border, icon: '--ds-surface-sunken' }, def: '--ds-surface-sunken', home: 'bg', deleteDef: true, leaveCats: ['text'] },
  '--bg-3': { byCat: { bg: '--ds-background-neutral', border: T.border, icon: '--ds-background-neutral' }, def: '--ds-background-neutral', home: 'bg', deleteDef: true, leaveCats: ['text'] },
  '--bg-4': { byCat: { bg: '--ds-surface-overlay', border: T.border, icon: '--ds-surface-overlay' }, def: '--ds-surface-overlay', home: 'bg', deleteDef: true, leaveCats: ['text'] },
  '--bg-5': { byCat: { bg: '--ds-background-neutral', border: T.border, icon: '--ds-background-neutral' }, def: '--ds-background-neutral', home: 'bg', deleteDef: true, leaveCats: ['text'] },
  // ink scale — undefined everywhere (phantom-like) but disposition per B.6
  // --cp-ink-1: ONLY text + border refs swept; bg refs deferred (ambiguous slice)
  '--cp-ink-1': { byCat: { text: T.text, border: T.border }, home: 'text', leaveCats: ['bg', 'icon', 'shadow', 'font', 'chart'], leaveUnknown: true },
  // ink-2 as background = dark slate bold fill (capacity gantt bars); light value of
  // --ds-background-neutral-bold is byte-identical to the --ds-text-subtle the chain resolved to.
  '--cp-ink-2': { byCat: { text: T.subtle, border: T.border, bg: '--ds-background-neutral-bold', icon: T.subtle }, def: T.subtle, home: 'text' },
  '--cp-ink-3': { byCat: { text: T.subtlest, border: T.border, bg: '--ds-background-neutral-bold', icon: T.subtlest }, def: T.subtlest, home: 'text' },
  '--cp-ink-4': { byCat: { text: T.disabled, border: T.border, bg: '--ds-background-neutral-bold', icon: T.disabled }, def: T.disabled, home: 'text' },
};

export const TARGETS = { ...PHANTOMS, ...LEGACY };

/** Tokens whose remaining declarations are deleted once their consumer count is 0. */
export const DELETE_DEFS = Object.entries(LEGACY)
  .filter(([, m]) => m.deleteDef)
  .map(([t]) => t);

/** Category implied by a real CSS property (mirrors token-graph builder). */
export function cssPropCategory(prop) {
  const p = prop.toLowerCase();
  if (p === 'color' || p === '-webkit-text-fill-color' || p === 'caret-color' || p === 'text-decoration-color' || p === 'text-emphasis-color') return 'text';
  if (p.includes('background')) return 'bg';
  if (p.startsWith('border') || p.startsWith('outline') || p === 'column-rule' || p === 'column-rule-color') return 'border';
  if (p === 'fill' || p === 'stroke') return 'icon';
  if (p.includes('shadow')) return 'shadow';
  if (p.startsWith('font')) return 'font';
  if (/^(padding|margin|gap|row-gap|column-gap|inset)/.test(p)) return 'space';
  return null;
}

/** Category implied by a custom token's *name* (for `--x: var(chain)` decls). */
const NAME_CATEGORY_RULES = [
  { cat: 'shadow', re: /(shadow|elevation)/ },
  { cat: 'chart', re: /chart/ },
  { cat: 'icon', re: /icon/ },
  { cat: 'font', re: /(font|typograph|leading|tracking|line-height|letter)/ },
  { cat: 'space', re: /(space|spacing|-gap(-|$)|inset-x|padding|margin)/ },
  { cat: 'border', re: /(border|divider|ring|outline|-bd(-|$)|stroke)/ },
  { cat: 'bg', re: /(background|surface|-bg(-|$)|canvas|overlay|backdrop|scrim|fill|-page(-|$)|elevated|sunken|raised|inset(-|$)|track)/ },
  { cat: 'text', re: /(text|-fg(-|$)|foreground|ink|link|-t[0-9](-|$)|label|placeholder|caption|heading)/ },
];
export function nameCategory(token) {
  const t = token.toLowerCase();
  for (const rule of NAME_CATEGORY_RULES) if (rule.re.test(t)) return rule.cat;
  return null;
}

/** Category from a JS style-object key (camelCase). */
export function styleKeyCategory(key) {
  const k = key.replace(/^Webkit|^Moz|^ms/, '').replace(/^['"]|['"]$/g, '');
  if (/^(color|caretColor|TextFillColor|textDecorationColor)$/i.test(k)) return 'text';
  if (/^background(Color|Image)?$/i.test(k)) return 'bg';
  if (/^(border|outline)/i.test(k)) return 'border';
  if (/shadow/i.test(k)) return 'shadow';
  if (/^(fill|stroke)$/i.test(k)) return 'icon';
  if (/^font(Family)?$/i.test(k)) return 'font';
  if (/^(padding|margin|gap|inset)/i.test(k)) return 'space';
  // design-token map keys (textPrimary, textSecondary, …) — CSS props like
  // textAlign/textTransform never carry color var() chains, so this is safe
  if (/^text/i.test(k)) return 'text';
  return null;
}

/** Category from a Tailwind arbitrary-value utility prefix, e.g. `bg-[var(...)]`. */
export function tailwindPrefixCategory(prefix) {
  const p = prefix.toLowerCase();
  if (p === 'bg' || p === 'from' || p === 'via' || p === 'to' || p === 'accent') return 'bg';
  if (p === 'text' || p === 'caret' || p === 'placeholder' || p === 'decoration') return 'text';
  if (p === 'border' || p === 'ring' || p === 'divide' || p === 'outline' || /^border-[trblxy]$/.test(p)) return 'border';
  if (p === 'shadow') return 'shadow';
  if (p === 'fill' || p === 'stroke') return 'icon';
  if (p === 'font') return 'font';
  return null;
}

/** Category from an @atlaskit token() id, for `token('x.y', 'var(...)')` fallbacks. */
export function adsIdCategory(id) {
  if (id.startsWith('color.text') || id.startsWith('color.link')) return 'text';
  if (id.startsWith('color.background') || id.startsWith('elevation.surface') || id.startsWith('color.blanket') || id.startsWith('color.skeleton')) return 'bg';
  if (id.startsWith('color.border')) return 'border';
  if (id.startsWith('color.icon')) return 'icon';
  if (id.startsWith('color.chart')) return 'chart';
  if (id.startsWith('elevation.shadow')) return 'shadow';
  if (id.startsWith('font')) return 'font';
  if (id.startsWith('space')) return 'space';
  return null;
}
