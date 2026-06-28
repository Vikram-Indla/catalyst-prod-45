/**
 * ADS dark — canonical dark mode tokens for inline-style components
 * All surfaces/borders use solid hex (never rgba). Apr 2026.
 */
export type DarkTokens = {
  pageBg: string; cardBg: string; headerBg: string; tableHeaderBg: string;
  hoverBg: string; selectedBg: string; floatBg: string; chipBg: string;
  progressTrack: string; iconBg: string;
  t1: string; t2: string; t3: string; t4: string;
  border: string; borderStrong: string; divider: string;
  blue: string; blueKey: string; green: string; greenText: string;
  shadow: string; cardShadow: string;
};

/**
 * NOTE (2026-04-30): Both DK and LK now resolve to `var(--cp-*)` tokens.
 * This means consumers reading `T.t1`, `T.border`, etc. will automatically
 * follow the active theme via CSS variable flip in `index.css` (.dark block).
 * The `isDark ? DK : LK` selection still happens at component level for back-compat,
 * but the values are theme-neutral now.
 */
export const DK: DarkTokens = {
  pageBg:        'var(--cp-bg-page)',
  cardBg:        'var(--cp-bg-elevated)',
  headerBg:      'var(--cp-bg-elevated)',
  tableHeaderBg: 'var(--cp-bg-sunken)',
  hoverBg:       'var(--cp-interact-hover, var(--cp-ink-1))',
  selectedBg:    'var(--cp-interact-selected, rgba(59,130,246,0.15))',
  floatBg:       'var(--cp-float, var(--cp-ink-1))',
  chipBg:        'var(--cp-bg-sunken, var(--cp-ink-1))',
  progressTrack: 'var(--cp-border-default, var(--cp-ink-1))',
  iconBg:        'var(--cp-bg-sunken, var(--cp-ink-1))',

  t1: 'var(--cp-text-primary, var(--cp-bg-neutral))',
  t2: 'var(--cp-text-secondary)',
  t3: 'var(--cp-text-tertiary)',
  t4: 'var(--cp-text-tertiary, var(--cp-text-secondary))',

  border:       'var(--cp-border-default, var(--cp-ink-1))',
  borderStrong: 'var(--cp-border-strong)',
  divider:      'var(--cp-border-default, var(--cp-ink-1))',

  blue:      'var(--cp-blue-text)',
  blueKey:   'var(--cp-blue-text)',
  green:     'var(--cp-ok)',
  greenText: 'var(--cp-ok)',

  shadow:     'var(--cp-shadow-xs, none)',
  cardShadow: 'var(--cp-shadow-xs, none)',
} as const;

export const LK: DarkTokens = {
  pageBg:        'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  cardBg:        'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  headerBg:      'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  tableHeaderBg: 'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
  hoverBg:       'var(--cp-interact-hover, rgba(15,23,42,0.04))',
  selectedBg:    'var(--cp-interact-selected)',
  floatBg:       'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  chipBg:        'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
  progressTrack: 'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
  iconBg:        'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',

  t1: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1)))',
  t2: 'var(--cp-text-secondary, var(--cp-text-secondary, var(--cp-text-secondary)))',
  t3: 'var(--cp-text-tertiary)',
  t4: 'var(--cp-text-tertiary, var(--cp-ink-4, var(--cp-border-neutral-light)))',

  border:       'var(--cp-border-default, rgba(15,23,42,0.12))',
  borderStrong: 'var(--cp-border-strong, rgba(15,23,42,0.20))',
  divider:      'var(--cp-border-default, rgba(15,23,42,0.06))',

  blue:      'var(--cp-blue-text, var(--cp-workstream-catalyst-primary))',
  blueKey:   'var(--cp-blue-text, var(--cp-workstream-catalyst-primary))',
  green:     'var(--cp-ok, var(--cp-success))',
  greenText: 'var(--cp-ok)',

  shadow:     'var(--cp-shadow-xs, 0 1px 3px rgba(0,0,0,0.06))',
  cardShadow: 'var(--cp-shadow-xs, 0 1px 3px rgba(0,0,0,0.06))',
} as const;
