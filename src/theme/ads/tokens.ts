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
    page:     { cp: '--cp-bg-page',     light: '#FFFFFF', dark: '#1F1F21', atlaskit: 'color.background.neutral' } satisfies AdsToken,
    /**
     * hubPage — outer page background for <AtlaskitPageShell>.
     *
     * Apr 19, 2026 (V3 — White Canvas):
     *   Light mode moved from Jira-blue #E9F2FE to #FFFFFF on Vikram's
     *   decision (dashboard read as a "grey/blue tint" next to backlog;
     *   backlog's mostly-white content had been masking the same frame).
     *   Decision: flatten project-hub surfaces to a single white canvas.
     *   The shell keeps its 8px outer padding + inner rounded card so
     *   scroll clipping and layout continue working — they just become
     *   white-on-white and visually invisible.
     *
     *   Pre-V3 (historical): #E9F2FE — Jira BAU list DOM rgb(233,242,254)
     *   measured 2026-04-18.
     *
     * Dark mode continues to mirror DARK MODE page bg #0A0A0A (CLAUDE.md §18).
     */
    hubPage:  { cp: '--cp-bg-hub-page', light: '#FFFFFF', dark: '#1F1F21', atlaskit: '' } satisfies AdsToken,
    surface:  { cp: '--cp-bg-surface',  light: '#FFFFFF', dark: '#242528', atlaskit: 'elevation.surface' } satisfies AdsToken,
    overlay:  { cp: '--cp-bg-overlay',  light: '#F8FAFC', dark: '#1F1F1F', atlaskit: 'elevation.surface.overlay' } satisfies AdsToken,
    inset:    { cp: '--cp-bg-inset',    light: '#F1F5F9', dark: '#111111', atlaskit: 'color.background.neutral.subtle' } satisfies AdsToken,
    hover:    { cp: '--cp-interact-hover',    light: 'rgba(0,0,0,0.04)', dark: '#1F1F1F', atlaskit: 'color.background.neutral.hovered' } satisfies AdsToken,
    selected: { cp: '--cp-interact-selected', light: 'rgba(37,99,235,0.08)', dark: 'rgba(37,99,235,0.14)', atlaskit: 'color.background.selected' } satisfies AdsToken,
    pressed:  { cp: '--cp-interact-press',    light: 'rgba(0,0,0,0.08)', dark: '#292929', atlaskit: 'color.background.neutral.pressed' } satisfies AdsToken,
  },
  text: {
    primary:   { cp: '--cp-text-primary',   light: '#0F172A', dark: '#EDEDED', atlaskit: 'color.text' } satisfies AdsToken,
    secondary: { cp: '--cp-text-secondary', light: '#475569', dark: '#A1A1A1', atlaskit: 'color.text.subtle' } satisfies AdsToken,
    muted:     { cp: '--cp-text-muted',     light: '#94A3B8', dark: '#878787', atlaskit: 'color.text.subtlest' } satisfies AdsToken,
    disabled:  { cp: '--cp-text-disabled',  light: '#CBD5E1', dark: '#7D7D7D', atlaskit: 'color.text.disabled' } satisfies AdsToken,
    inverse:   { cp: '--cp-text-inverse',   light: '#FFFFFF', dark: '#0A0A0A', atlaskit: 'color.text.inverse' } satisfies AdsToken,
  },
  border: {
    default: { cp: '--cp-border-default', light: '#E2E8F0', dark: '#2E2E2E', atlaskit: 'color.border' } satisfies AdsToken,
    subtle:  { cp: '--cp-border-subtle',  light: '#F1F5F9', dark: '#292929', atlaskit: 'color.border.accent.gray' } satisfies AdsToken,
    strong:  { cp: '--cp-border-strong',  light: '#CBD5E1', dark: '#454545', atlaskit: 'color.border.bold' } satisfies AdsToken,
    focus:   { cp: '--cp-border-focus',   light: '#2563EB', dark: '#2563EB', atlaskit: 'color.border.focused' } satisfies AdsToken,
  },
  brand: {
    primary:       { cp: '--cp-primary-60',       light: '#2563EB', dark: '#2563EB', atlaskit: 'color.background.brand.bold' } satisfies AdsToken,
    primaryHover:  { cp: '--cp-primary-70',       light: '#1D4ED8', dark: '#1D4ED8', atlaskit: 'color.background.brand.bold.hovered' } satisfies AdsToken,
  },
  /**
   * StatusLozenge — the 3-colour guardrail (CLAUDE.md §5).
   * These are the ONLY colours allowed for a status badge. Any other colour
   * in a StatusLozenge is a bug.
   */
  status: {
    grey:  { bg: { cp: '--cp-lozenge-grey-bg',  light: '#DFE1E6', dark: '#292929', atlaskit: '' } satisfies AdsToken,
             fg: { cp: '--cp-lozenge-grey-fg',  light: '#253858', dark: '#EDEDED', atlaskit: '' } satisfies AdsToken },
    blue:  { bg: { cp: '--cp-lozenge-blue-bg',  light: '#DEEBFF', dark: '#1A3A6A', atlaskit: '' } satisfies AdsToken,
             fg: { cp: '--cp-lozenge-blue-fg',  light: '#0747A6', dark: '#DDEBFF', atlaskit: '' } satisfies AdsToken },
    green: { bg: { cp: '--cp-lozenge-green-bg', light: '#E3FCEF', dark: '#1C3D2E', atlaskit: '' } satisfies AdsToken,
             fg: { cp: '--cp-lozenge-green-fg', light: '#006644', dark: '#B6F2D6', atlaskit: '' } satisfies AdsToken },
  },
  /**
   * Work-item type icons (CLAUDE.md §11) — canonical SVG colours. NEVER use
   * these for anything else; they are structural identifiers.
   */
  workItemType: {
    bug:         { cp: '--cp-wi-bug',         light: '#E5493A', dark: '#E5493A', atlaskit: '' } satisfies AdsToken,
    story:       { cp: '--cp-wi-story',       light: '#63BA3C', dark: '#63BA3C', atlaskit: '' } satisfies AdsToken,
    task:        { cp: '--cp-wi-task',        light: '#4BADE8', dark: '#4BADE8', atlaskit: '' } satisfies AdsToken,
    epic:        { cp: '--cp-wi-epic',        light: '#904EE2', dark: '#904EE2', atlaskit: '' } satisfies AdsToken,
    subtask:     { cp: '--cp-wi-subtask',     light: '#4BADE8', dark: '#4BADE8', atlaskit: '' } satisfies AdsToken,
    newFeature:  { cp: '--cp-wi-new-feature', light: '#63BA3C', dark: '#63BA3C', atlaskit: '' } satisfies AdsToken,
    improvement: { cp: '--cp-wi-improvement', light: '#4BADE8', dark: '#4BADE8', atlaskit: '' } satisfies AdsToken,
    incident:    { cp: '--cp-wi-incident',    light: '#E5493A', dark: '#E5493A', atlaskit: '' } satisfies AdsToken,
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