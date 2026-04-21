/**
 * Hub tone colors — single source of truth for hub-identifier swatches.
 *
 * These are STRUCTURAL hub identifiers (Home, StrategyHub, ProductHub, …),
 * not semantic status colours. Per CLAUDE.md §6 hub badge colours are
 * non-semantic — they must never be confused with StatusLozenge colours.
 *
 * Rendering convention (HubSwitcher, hub chips, nav breadcrumbs):
 *   - icon tile fill:    `${tone}1A`   (10% alpha wash)
 *   - icon glyph color:  tone          (full value)
 *   - text color:        `color.text`  (never derived from tone)
 *
 * Previously these literals were inlined in HubSwitcher.tsx. Extracted in
 * Apr 2026 per jira-compare DS-4 so future hub consumers (breadcrumbs,
 * recent-hubs chips, home dashboard tiles) share the same palette.
 */
export type HubKey =
  | 'home'
  | 'strategy'
  | 'product'
  | 'project'
  | 'release'
  | 'test'
  | 'incident'
  | 'task'
  | 'plan'
  | 'wiki';

export interface HubColor {
  /** Full-value tone used for glyphs and the 1A wash tile fill. */
  tone: string;
  /** Optional pre-mixed 10% alpha wash; fall back to `${tone}1A` otherwise. */
  tileFill?: string;
}

export const HUB_COLORS: Record<HubKey, HubColor> = {
  home:     { tone: '#42526E' },
  strategy: { tone: '#8270DB' },
  product:  { tone: '#0052CC' },
  project:  { tone: '#00A3BF' },
  release:  { tone: '#FF8B00' },
  test:     { tone: '#36B37E' },
  incident: { tone: '#DE350B' },
  task:     { tone: '#FFAB00' },
  plan:     { tone: '#E774BB' },
  wiki:     { tone: '#65BA43' },
};

/** 10% alpha wash used as icon-tile background. */
export function hubTileFill(key: HubKey): string {
  const color = HUB_COLORS[key];
  return color.tileFill ?? `${color.tone}1A`;
}

export function hubTone(key: HubKey): string {
  return HUB_COLORS[key].tone;
}
