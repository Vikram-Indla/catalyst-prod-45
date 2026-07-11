// @ts-nocheck
/**
 * ADS Token Bridge — alignment between three token worlds.
 *
 *   @atlaskit/tokens  ──┐
 *                       ├──▶  Catalyst semantic tokens (--cp-*)  ──▶  DARK MODE hex
 *   shadcn/Tailwind   ──┘
 *
 * This file is the SINGLE SOURCE OF TRUTH for that alignment.
 *
 * Why a bridge layer exists
 * ─────────────────────────
 * Atlaskit components consume `@atlaskit/tokens`. Catalyst product code uses
 * `--cp-*` variables (see index.css) and Tailwind utilities. DARK MODE dark
 * mode uses literal hex (see CLAUDE.md §3, §18). If Atlaskit rendered under
 * its own tokens and our product under `--cp-*`, the two would drift the
 * moment Atlaskit bumps a token value — a full dark-mode regression across
 * every migrated surface.
 *
 * The bridge fixes the drift at one layer: we alias Atlaskit's named tokens
 * to our canonical `--cp-*` variables via setGlobalTheme's customColors API
 * (see AdsThemeProvider), and we expose a named-token map below that all
 * ADS wrappers use to read Catalyst colour values. When Atlaskit bumps
 * tokens we update this file — product code stays unchanged.
 *
 * Editing rules
 * ─────────────
 * 1. NEVER add a hardcoded hex in a wrapper. Add a named token here, use it
 *    from the wrapper via `adsTokens.text.primary` etc. (Enforced by the
 *    ADS ESLint profile — `no-restricted-syntax` blocks hex literals inside
 *    `src/components/ads/**`.)
 * 2. When Atlaskit bumps a token name (e.g. `color.text.subtle` renames),
 *    update the `atlaskit` key in the relevant entry. Product code still
 *    reads `adsTokens.text.secondary` — one-line patch.
 * 3. Dark-mode value MUST match `CLAUDE.md §18 — ADS DARK TOKENS
 *    PALETTE`. Verified by visual-regression CI.
 * 4. Light-mode value MUST match `CLAUDE.md §4 — V12 Hybrid Precision`
 *    semantic tokens.
 *
 * Do not add tokens here that aren't used by an ADS wrapper — this file
 * is the wrapper-layer's vocabulary, not Catalyst's full palette.
 */

/**
 * AdsToken — one entry in the bridge.
 *
 * - `cp`        the --cp-* variable name (without `var(...)`). The product
 *               owns this value; ADS wrappers resolve through it at runtime.
 * - `light`     DARK MODE / V12 light-mode hex.
 * - `dark`      DARK MODE dark-mode hex.
 * - `atlaskit`  the @atlaskit/tokens identifier this entry aliases. Used by
 *               AdsThemeProvider.customColors so Atlaskit components pick up
 *               our values. Leave empty string for entries with no Atlaskit
 *               equivalent (Catalyst-only semantics).
 */
export interface AdsToken {
  cp: string;
  light: string;
  dark: string;
  atlaskit: string;
}

/**
 * adsTokens — canonical named-token map for ADS wrappers.
 *
 * Grouped by semantic role, not by colour family. A wrapper author asks
 * "what role does this colour play?" (border, text-secondary, danger)
 * rather than "which shade of grey?".
 */
export const adsTokens = {
  bg: {
    page:     { cp: '--cp-bg-page',     light: 'var(--ds-surface)', dark: 'var(--ds-surface-sunken)', atlaskit: 'color.background.neutral' } satisfies AdsToken,
    /**
     * hubPage — outer page background for <AtlaskitPageShell>.
     *
     * Apr 19, 2026 (V3 — White Canvas):
     *   Light mode moved from Jira-blue var(--ds-background-selected) to var(--cp-bg-elevated, var(--cp-bg-elevated)) on Vikram's
     *   decision (dashboard read as a "grey/blue tint" next to backlog;
     *   backlog's mostly-white content had been masking the same frame).
     *   Decision: flatten project-hub surfaces to a single white canvas.
     *   The shell keeps its 8px outer padding + inner rounded card so
     *   scroll clipping and layout continue working — they just become
     *   white-on-white and visually invisible.
     *
     *   Pre-V3 (historical): var(--ds-background-selected) — Jira BAU list DOM rgb(233,242,254)
     *   measured 2026-04-18.
     *
     * Dark mode continues to mirror DARK MODE page bg var(--ds-text) (CLAUDE.md §18).
     */
    hubPage:  { cp: '--cp-bg-hub-page', light: 'var(--ds-surface)', dark: 'var(--ds-surface-sunken)', atlaskit: '' } satisfies AdsToken,
    surface:  { cp: '--cp-bg-surface',  light: 'var(--ds-surface)', dark: 'var(--ds-surface)', atlaskit: 'elevation.surface' } satisfies AdsToken,
    overlay:  { cp: '--cp-bg-overlay',  light: 'var(--ds-surface-sunken)', dark: 'var(--ds-surface-overlay)', atlaskit: 'elevation.surface.overlay' } satisfies AdsToken,
    inset:    { cp: '--cp-bg-inset',    light: 'var(--cp-bg-sunken, var(--cp-bg-sunken))', dark: 'var(--ds-surface)', atlaskit: 'color.background.neutral.subtle' } satisfies AdsToken,
    hover:    { cp: '--cp-interact-hover',    light: 'var(--ds-shadow-raised)', dark: 'var(--ds-background-neutral, var(--ds-background-neutral))', atlaskit: 'color.background.neutral.hovered' } satisfies AdsToken,
    // 2026-05-01 — RCA fix for blue tint on Atlaskit Editor canvas in dark mode.
    // Previously dark = rgba(37,99,235,0.14) which painted Editor's "selected"
    // canvas state as a visible blue rectangle. ADS canonical dark value for
    // color.background.selected is #1C2B41 (atlassian.design — Jira parity).
    // Light kept at the original Catalyst tint per existing UI specs.
    selected: { cp: '--cp-interact-selected', light: 'var(--ds-background-information)', dark: 'var(--ds-text, var(--ds-text))', atlaskit: 'color.background.selected' } satisfies AdsToken,
    pressed:  { cp: '--cp-interact-press',    light: 'var(--ds-shadow-raised)', dark: '#38414A', atlaskit: 'color.background.neutral.pressed' } satisfies AdsToken,
    // 2026-07-02 — RCA fix for muddy warning/danger/success card backgrounds
    // in dark mode (flagged BAU-6083 card, board view). These three keys were
    // absent from the bridge, so atlaskitCustomColors('dark') never overrode
    // Atlaskit's own setGlobalTheme defaults (Orange1000/Red1000/Lime1000) —
    // Atlaskit's muddy defaults won the cascade over the correct values already
    // sitting unused in catalyst-ads-parity.css's html.dark block.
    warning:  { cp: '--cp-bg-warning', light: 'var(--ds-background-warning)', dark: 'var(--ds-background-warning)', atlaskit: 'color.background.warning' } satisfies AdsToken,
    danger:   { cp: '--cp-bg-danger',  light: 'var(--ds-background-danger)',  dark: 'var(--ds-background-danger)',  atlaskit: 'color.background.danger' } satisfies AdsToken,
    success:  { cp: '--cp-bg-success', light: 'var(--ds-background-success)', dark: 'var(--ds-background-success)', atlaskit: 'color.background.success' } satisfies AdsToken,
  },
  text: {
    primary:   { cp: '--cp-text-primary',   light: 'var(--cp-ink-1, var(--cp-ink-1))', dark: 'var(--ds-background-neutral)', atlaskit: 'color.text' } satisfies AdsToken,
    secondary: { cp: '--cp-text-secondary', light: 'var(--ds-text-subtle)', dark: 'var(--ds-text-subtlest)', atlaskit: 'color.text.subtle' } satisfies AdsToken,
    muted:     { cp: '--cp-text-muted',     light: 'var(--cp-ink-4, var(--cp-border-neutral-light))', dark: 'var(--ds-text-subtlest)', atlaskit: 'color.text.subtlest' } satisfies AdsToken,
    disabled:  { cp: '--cp-text-disabled',  light: 'var(--ds-border)', dark: 'var(--ds-text-subtlest)', atlaskit: 'color.text.disabled' } satisfies AdsToken,
    inverse:   { cp: '--cp-text-inverse',   light: 'var(--ds-surface)', dark: 'var(--ds-text)', atlaskit: 'color.text.inverse' } satisfies AdsToken,
  },
  border: {
    default: { cp: '--cp-border-default', light: 'var(--cp-border, var(--cp-bg-sunken))', dark: 'var(--ds-background-neutral)', atlaskit: 'color.border' } satisfies AdsToken,
    subtle:  { cp: '--cp-border-subtle',  light: 'var(--cp-bg-sunken, var(--cp-bg-sunken))', dark: 'var(--ds-surface)', atlaskit: 'color.border.accent.gray' } satisfies AdsToken,
    strong:  { cp: '--cp-border-strong',  light: 'var(--ds-border)', dark: '#454F59', atlaskit: 'color.border.bold' } satisfies AdsToken,
    focus:   { cp: '--cp-border-focus',   light: 'var(--ds-link)', dark: 'var(--ds-link)', atlaskit: 'color.border.focused' } satisfies AdsToken,
  },
  brand: {
    primary:       { cp: '--cp-primary-60',       light: 'var(--ds-link)', dark: 'var(--ds-link)', atlaskit: 'color.background.brand.bold' } satisfies AdsToken,
    primaryHover:  { cp: '--cp-primary-70',       light: 'var(--ds-link-pressed)', dark: 'var(--ds-link-pressed)', atlaskit: 'color.background.brand.bold.hovered' } satisfies AdsToken,
  },
  /**
   * StatusLozenge — the 3-colour guardrail (CLAUDE.md §5).
   * These are the ONLY colours allowed for a status badge. Any other colour
   * in a StatusLozenge is a bug.
   */
  status: {
    grey:  { bg: { cp: '--cp-lozenge-grey-bg',  light: 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))', dark: 'var(--ds-text)', atlaskit: '' } satisfies AdsToken,
             fg: { cp: '--cp-lozenge-grey-fg',  light: 'var(--ds-text)', dark: 'var(--ds-background-neutral)', atlaskit: '' } satisfies AdsToken },
    blue:  { bg: { cp: '--cp-lozenge-blue-bg',  light: 'var(--ds-background-information)', dark: '#1A3A6A', atlaskit: '' } satisfies AdsToken,
             fg: { cp: '--cp-lozenge-blue-fg',  light: 'var(--ds-link-pressed)', dark: '#DDEBFF', atlaskit: '' } satisfies AdsToken },
    green: { bg: { cp: '--cp-lozenge-green-bg', light: 'var(--ds-background-success)', dark: '#1C3D2E', atlaskit: '' } satisfies AdsToken,
             fg: { cp: '--cp-lozenge-green-fg', light: 'var(--ds-text-success)', dark: '#B6F2D6', atlaskit: '' } satisfies AdsToken },
  },
  /**
   * Work-item type icons (CLAUDE.md §11) — canonical SVG colours. NEVER use
   * these for anything else; they are structural identifiers.
   */
  workItemType: {
    bug:         { cp: '--cp-wi-bug',         light: 'var(--ds-background-danger-bold)', dark: 'var(--ds-background-danger-bold)', atlaskit: '' } satisfies AdsToken,
    story:       { cp: '--cp-wi-story',       light: 'var(--ds-background-success-bold)', dark: 'var(--ds-background-success-bold)', atlaskit: '' } satisfies AdsToken,
    task:        { cp: '--cp-wi-task',        light: 'var(--ds-background-information-bold)', dark: 'var(--ds-background-information-bold)', atlaskit: '' } satisfies AdsToken,
    epic:        { cp: '--cp-wi-epic',        light: 'var(--ds-background-discovery-bold)', dark: 'var(--ds-background-discovery-bold)', atlaskit: '' } satisfies AdsToken,
    subtask:     { cp: '--cp-wi-subtask',     light: 'var(--ds-background-information-bold)', dark: 'var(--ds-background-information-bold)', atlaskit: '' } satisfies AdsToken,
    newFeature:  { cp: '--cp-wi-new-feature', light: 'var(--ds-background-success-bold)', dark: 'var(--ds-background-success-bold)', atlaskit: '' } satisfies AdsToken,
    improvement: { cp: '--cp-wi-improvement', light: 'var(--ds-background-information-bold)', dark: 'var(--ds-background-information-bold)', atlaskit: '' } satisfies AdsToken,
    incident:    { cp: '--cp-wi-incident',    light: 'var(--ds-background-danger-bold)', dark: 'var(--ds-background-danger-bold)', atlaskit: '' } satisfies AdsToken,
  },
} as const;

/**
 * cp — helper to read a bridge token through its --cp-* variable.
 *
 *   style={{ color: cp(adsTokens.text.primary) }}
 *   // → color: var(--cp-text-primary)
 *
 * Use this instead of hardcoding hex inside wrappers. The value lives in
 * one place (index.css generates --cp-*); ADS wrappers read through the
 * variable so theme changes propagate without recompile.
 */
export function cp(token: AdsToken): string {
  return `var(${token.cp})`;
}

/**
 * resolved — pick the concrete hex for a colour mode. Used by
 * AdsThemeProvider to seed @atlaskit/tokens' customColors and by test
 * utilities that need the actual value (visual-regression fixtures).
 */
export function resolved(token: AdsToken, mode: 'light' | 'dark'): string {
  return mode === 'dark' ? token.dark : token.light;
}

/**
 * atlaskitCustomColors — shape expected by `setGlobalTheme({ colorMode,
 * customColors })`. Iterates the bridge and emits the Atlaskit-token →
 * concrete-hex map for the requested mode. Rebuilt on every theme flip;
 * memoise at call site if profiling shows hotpath pressure.
 */
export function atlaskitCustomColors(mode: 'light' | 'dark'): Record<string, string> {
  const out: Record<string, string> = {};
  for (const group of Object.values(adsTokens)) {
    for (const value of Object.values(group)) {
      // status / workItemType groups are nested one level deeper — handle both shapes.
      if ('atlaskit' in value) {
        if (value.atlaskit) out[value.atlaskit] = resolved(value, mode);
      } else {
        for (const inner of Object.values(value)) {
          if ('atlaskit' in inner && inner.atlaskit) out[inner.atlaskit] = resolved(inner, mode);
        }
      }
    }
  }
  return out;
}