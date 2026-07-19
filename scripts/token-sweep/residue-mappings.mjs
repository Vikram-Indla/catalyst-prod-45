/**
 * CAT-DS-TOKEN-POISON-20260710-001 — R3/R10 residue sweep mappings.
 *
 * Consumed by scripts/token-sweep/residue-sweep.mjs.
 *
 * Four disposition classes, applied in this order:
 *
 *   HSL_WRAP  — undefined tokens only ever consumed as shadcn-style HSL
 *               triplets: `hsl(var(--x))` / `hsl(var(--x) / a)`. The whole
 *               hsl(...) expression collapses to ONE full-color ADS token
 *               (the triplet token was deleted long ago; the hsl() is
 *               invalid-at-computed-value today, so any same-role token is
 *               a strict improvement, chosen to match the original palette
 *               recovered from git history 99db75b19:src/index.css).
 *
 *   RENAME    — undefined token -> defined replacement (real ADS var or a
 *               token still declared in src/). Reference-site rewrite only;
 *               no declarations are created.
 *
 *   COLLAPSE  — undefined tokens whose refs all carry fallbacks that ARE
 *               what the browser resolves today: `var(--x, FB)` -> `FB`
 *               (behavior-identical by CSS var() semantics).
 *
 *   DEAD_*    — declarations/properties that reference undefined tokens and
 *               have zero consumers, or real-property decls whose whole value
 *               is a single dead var() (invalid today -> deleting is
 *               behavior-identical).
 *
 * Every --ds-* replacement is validated against @atlaskit/tokens/token-names
 * at engine start; app-token replacements are validated against declarations
 * actually present in src/*.css.
 */

// ---------------------------------------------------------------------------
// hsl(var(--x))-wrapped undefined triplet tokens -> full-color ADS token.
// Original triplet values (git 99db75b19) noted for traceability.
export const HSL_WRAP = {
  // Executive-roadmap palette (deleted "EXECUTIVE ROADMAP CSS VARIABLES" block)
  '--roadmap-ivory': '--ds-surface',                      // 45 30% 98%
  '--roadmap-parchment': '--ds-surface-sunken',           // 40 28% 95%
  '--roadmap-sandstone': '--ds-border',                   // 35 25% 85%
  '--roadmap-driftwood': '--ds-border-bold',              // 30 20% 75%
  '--roadmap-fossil': '--ds-text-subtlest',               // 25 15% 55%
  '--roadmap-graphite': '--ds-text-subtle',               // 20 10% 40%
  '--roadmap-charcoal': '--ds-text',                      // 0 0% 0%
  '--roadmap-status-new': '--ds-background-accent-yellow-bolder',    // gold
  '--roadmap-status-analyse': '--ds-background-accent-blue-bolder',  // blue
  '--roadmap-status-approved': '--ds-background-accent-orange-bolder', // bronze
  '--roadmap-status-implement': '--ds-background-accent-green-bolder', // green
  '--roadmap-status-closed': '--ds-background-accent-gray-bolder',   // dark grey
  '--roadmap-today': '--ds-background-accent-red-bolder',            // 15 70% 50%
  '--roadmap-milestone-complete': '--ds-background-accent-green-bolder',
  '--roadmap-milestone-current': '--ds-background-accent-yellow-bolder',
  '--roadmap-milestone-pending': '--ds-background-accent-gray-subtler', // 0 0% 70%

  // Old Atlaskit palette steps (B400 #0052CC, G300 #36B37E, Y300 #FFAB00, P300 #6554C0)
  '--b400': '--ds-background-accent-blue-bolder',
  '--g300': '--ds-background-accent-green-bolder',
  '--y300': '--ds-background-accent-yellow-bolder',
  '--p300': '--ds-background-accent-purple-bolder',

  // Champagne/gold family (V5 palette residue)
  '--palette-beginner': '--ds-background-accent-yellow-subtler',
  '--palette-champagne': '--ds-background-accent-yellow-subtler',
  '--catalyst-champagne': '--ds-background-warning', // warning-row tint @14%

  // src/theme/tokens.ts registry (comments in-file name the intended ADS token)
  '--surface-sunken': '--ds-surface-sunken',
  '--surface-raised': '--ds-surface-raised',
  '--surface-backdrop': '--ds-background-neutral-subtle',
  '--brand-primary-pale': '--ds-background-selected',
  '--brand-primary-border': '--ds-border-brand',
  '--neutral-100': '--ds-background-neutral',
  '--neutral-200': '--ds-border',
  '--neutral-400': '--ds-border-bold',
  '--neutral-500': '--ds-border-bold', // default; icon ref overridden below
  '--neutral-600': '--ds-text-subtle',
};

// Per-ref override: (file suffix, 1-based original line, token) -> replacement.
export const HSL_OVERRIDES = [
  // src/theme/tokens.ts lozenge neutral.icon — icon-category consumer
  { file: 'src/theme/tokens.ts', line: 350, token: '--neutral-500', repl: '--ds-icon-subtle' },
];

// ---------------------------------------------------------------------------
// Plain reference renames: var(--old ...) -> var(--new ...).
// Fallbacks (if any) survive this pass; the Goal-A strip pass then removes
// them whenever the new lead is a genuine ADS token.
export const RENAME = {
  // Misspelled / near-miss ADS names -> the real ADS token
  '--ds-background-information-subtle': '--ds-background-information',
  '--ds-background-information-subtlest': '--ds-background-information',
  '--ds-background-danger-subtle': '--ds-background-danger',
  '--ds-background-success-subtle': '--ds-background-success',
  '--ds-background-warning-subtle': '--ds-background-warning',
  '--ds-background-brand-subtle': '--ds-background-selected',
  '--ds-background-selected-subtle': '--ds-background-selected',
  '--ds-background-brand': '--ds-background-brand-bold-hovered', // sole ref: :hover of a brand-bold button
  '--ds-background-danger-bolder': '--ds-background-danger-bold',
  '--ds-background-discovery-bolder': '--ds-background-discovery-bold',
  '--ds-background-brand-bolder': '--ds-background-brand-bold',
  '--ds-background-warning-bolder': '--ds-background-warning-bold',
  '--ds-background-success-bolder': '--ds-background-success-bold',
  '--ds-background-neutral-bolder': '--ds-background-neutral-bold',
  '--ds-background-accent-blue-bold': '--ds-background-accent-blue-bolder',
  '--ds-background-accent-orange-bold': '--ds-background-accent-orange-bolder',
  '--ds-background-accent-green-bold': '--ds-background-accent-green-bolder',
  '--ds-background-accent-magenta-bold': '--ds-background-accent-magenta-bolder',
  '--ds-background-accent-purple-bold': '--ds-background-accent-purple-bolder',
  '--ds-border-neutral': '--ds-border',
  '--ds-border-layout': '--ds-border',
  '--ds-overlay': '--ds-blanket', // scrim/overlay gradients (kanban overflow shadows)

  // Typography family names -> ADS typography-theme tokens
  '--ds-font-family': '--ds-font-family-body',
  '--ds-font-family-sans': '--ds-font-family-body',
  '--ds-font-family-monospace': '--ds-font-family-code',
  '--ds-font-family-monospaced': '--ds-font-family-code',
  '--font-mono': '--ds-font-family-code',
  '--font-sans': '--ds-font-family-body',
  '--font-body': '--ds-font-family-body',
  '--ph-font-mono': '--ds-font-family-code',

  // 3-digit variants of the TEMPORARY Catalyst scale (both resolve 11px intent)
  '--ds-font-size-050': '--ds-font-size-50',
  '--ds-font-size-075': '--ds-font-size-50',

  // Tailwind-era --sN spacing scale (sN = N*4px) -> ADS spacing-theme tokens
  '--s2': '--ds-space-100',  // 8px
  '--s3': '--ds-space-150',  // 12px
  '--s4': '--ds-space-200',  // 16px
  '--s6': '--ds-space-300',  // 24px
  '--s8': '--ds-space-400',  // 32px

  // Radius: ADS shape theme (loaded via setGlobalTheme shape:'shape')
  '--ds-border-radius-050': '--ds-radius-xsmall',  // 2px
  '--ds-border-radius-100': '--ds-radius-small',   // 4px
  '--ds-border-radius-200': '--ds-radius-large',   // 8px
  '--ds-border-radius-circle': '--ds-radius-full',
  '--radius-full': '--ds-radius-full',
  // '--ds-border-radius' handled by RADIUS_BY_FALLBACK below (fallback-aware)

  // Status/quality colors
  '--quality-high': '--ds-background-success-bold', // matches every existing chain fallback
  '--health-green': '--sem-success',                // sibling entries use the --sem-* family
  '--color-status-todo': '--ds-background-accent-gray-bolder',
  '--color-status-in-progress': '--ds-background-accent-blue-bolder',
  '--color-status-done': '--ds-background-accent-green-bolder',
  '--secondary-grey': '--ds-background-accent-gray-bolder',

  // Semantic fg/accent family (base --sem-warning/--sem-danger exist; fg/accent never did)
  '--sem-warning-fg': '--ds-text-warning',
  '--sem-warning-accent': '--ds-border-warning',
  '--sem-danger-fg': '--ds-text-danger',
  '--sem-danger-accent': '--ds-border-danger',
  '--sem-star': '--ds-icon-accent-yellow',

  // Catalyst gold (V5 rebrand: gold -> teal; --brand-gold is the live teal alias)
  '--gold-fg': '--brand-gold',
  '--gold-bg': '--ds-background-accent-teal-subtlest',
  '--gold-bd': '--ds-border-accent-teal',
  '--border-gold': '--ds-border',            // dropdown/popover borders -> neutral menu border
  '--chart-gold': '--ds-chart-orange-bold',
  '--chart-gold-muted': '--ds-chart-neutral',
  '--accent-teal-soft': '--ds-background-accent-teal-subtlest',
  '--accent-teal-border': '--ds-border-accent-teal',

  // Inputs / selection / misc surfaces
  '--input-border': '--ds-border-input',
  '--input-text': '--ds-text',
  '--shadow-xs': '--ds-shadow-raised',
  '--card-shadow': '--ds-shadow-raised',
  '--accent-color': '--ds-text-brand',
  '--accent-muted': '--ds-background-selected',
  '--brand-primary-subtle': '--ds-background-selected',
  '--text-disabled': '--ds-text-disabled',
  '--selection-bar-bg': '--ds-surface-overlay',
  '--selection-bar-border': '--ds-border',
  '--selection-bar-shadow': '--ds-shadow-overlay',
  '--selection-badge-bg': '--ds-background-brand-bold',
  '--selection-badge-text': '--ds-text-inverse',
  '--pln-tl-text-muted': '--ds-text-subtlest',
  '--pln-tl-text-tertiary': '--ds-text-subtlest',
  '--caty-border-subtle': '--ds-border',
  '--caty-accent': '--ds-border-discovery', // Caty AI answer-card accent rail
  '--cv2-bg-row-selected': '--cv2-bg-row-active', // declared in chat-v2/tokens.css
  '--cv2-accent-strong': '--cv2-accent',          // declared in chat-v2/tokens.css
  '--cv2-accent-soft': '--ds-background-selected',

  // Bare (non-hsl) refs of the theme/tokens registry family
  '--surface-raised-bare-alias': '--ds-surface-raised', // placeholder, see note
};
// bare refs of tokens that are ALSO hsl-wrapped elsewhere:
for (const [tok, repl] of Object.entries(HSL_WRAP)) {
  if (!(tok in RENAME)) RENAME[tok] = repl;
}
delete RENAME['--surface-raised-bare-alias'];

// --ds-border-radius refs choose the ADS radius step nearest today's fallback
// (refs without fallback render 0 today; 4px = ADS small is the intended default).
export const RADIUS_BY_FALLBACK = {
  token: '--ds-border-radius',
  pick(fallback) {
    if (!fallback) return '--ds-radius-small';
    const px = parseFloat(fallback);
    if (!Number.isFinite(px)) return '--ds-radius-small';
    if (px >= 10) return '--ds-radius-xlarge';
    if (px >= 6) return '--ds-radius-large';
    if (px >= 3) return '--ds-radius-small';
    return '--ds-radius-xsmall';
  },
};

// ---------------------------------------------------------------------------
// var(--x, FB) -> FB (FB is what resolves today; behavior-identical).
export const COLLAPSE = new Set([
  // login page brand-fixed kiosk-theme keys (never defined; fallbacks author the look)
  '--clmp-k-white', '--clmp-k-navy', '--clmp-k-navys', '--clmp-k-navbg',
  '--clmp-k-navy-d', '--clmp-k-navy2-d', '--clmp-k-navbg-d',
  // caty-button.css chain leads (fallbacks are the live values)
  '--border-bold', '--interact-hover', '--text-subtle',
  // dead layout/util vars with dimension fallbacks
  '--progress-width', '--aw-left', '--util',
  // chat-v2 link accent (fallback is the declared --cv2-accent)
  '--cv2-link',
]);

// ---------------------------------------------------------------------------
// Custom-property declarations that are BOTH undefined-referencing and
// consumer-less (verified by grep) — deleting them is behavior-identical.
export const DEAD_DECLS = new Set([
  '--clmp-cream', '--clmp-mint', '--clmp-chip', '--clmp-navy-2',
  '--clmp-navy-text', '--clmp-navy-line', '--clmp-cyan',
  '--clmp-glass-1', '--clmp-glass-2', '--clmp-glass-3', '--clmp-glass-cyan',
  '--clmp-chat-shadow',
]);

// Real-property CSS decls whose entire value is a single var() of one of
// these dead typography tokens (invalid at computed-value today -> the
// property already renders as `normal`; removing the decl is identical).
export const DEAD_VALUE_TOKENS = new Set([
  '--ds-font-lineHeight-200',
  '--ds-font-lineHeight-300',
  '--ds-font-line-height-100',
  '--ds-font-line-height-200',
  '--ds-line-height-500',
]);

// Replacement tokens that are app tokens (must be declared in src/*.css).
export const APP_TOKEN_REPLACEMENTS = new Set([
  '--sem-success', '--brand-gold', '--cv2-bg-row-active', '--cv2-accent',
  '--ds-font-size-50',
]);
