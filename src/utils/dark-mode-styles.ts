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
  pageBg:        'var(--cp-bg-page, #1D2125)',
  cardBg:        'var(--cp-bg-elevated, #22272B)',
  headerBg:      'var(--cp-bg-elevated, #22272B)',
  tableHeaderBg: 'var(--cp-bg-sunken, #161A1D)',
  hoverBg:       'var(--cp-interact-hover, #2E2E2E)',
  selectedBg:    'var(--cp-interact-selected, rgba(59,130,246,0.15))',
  floatBg:       'var(--cp-float, #1A1A1A)',
  chipBg:        'var(--cp-bg-sunken, #292929)',
  progressTrack: 'var(--cp-border-default, #2E2E2E)',
  iconBg:        'var(--cp-bg-sunken, #292929)',

  t1: 'var(--cp-text-primary, #EDEDED)',
  t2: 'var(--cp-text-secondary, #C9CCD0)',
  t3: 'var(--cp-text-tertiary, #A1A1A1)',
  t4: 'var(--cp-text-tertiary, #878787)',

  border:       'var(--cp-border-default, #2E2E2E)',
  borderStrong: 'var(--cp-border-strong, #454545)',
  divider:      'var(--cp-border-default, #292929)',

  blue:      'var(--cp-blue-text, #60A5FA)',
  blueKey:   'var(--cp-blue-text, #60A5FA)',
  green:     'var(--cp-ok, #4ADE80)',
  greenText: 'var(--cp-ok, #4ADE80)',

  shadow:     'var(--cp-shadow-xs, none)',
  cardShadow: 'var(--cp-shadow-xs, none)',
} as const;

export const LK: DarkTokens = {
  pageBg:        'var(--cp-bg-page, #FFFFFF)',
  cardBg:        'var(--cp-bg-elevated, #FFFFFF)',
  headerBg:      'var(--cp-bg-elevated, #FFFFFF)',
  tableHeaderBg: 'var(--cp-bg-sunken, #F1F5F9)',
  hoverBg:       'var(--cp-interact-hover, rgba(15,23,42,0.04))',
  selectedBg:    'var(--cp-interact-selected, #F0F4FF)',
  floatBg:       'var(--cp-float, #FFFFFF)',
  chipBg:        'var(--cp-bg-sunken, #F1F5F9)',
  progressTrack: 'var(--cp-bg-sunken, #F1F5F9)',
  iconBg:        'var(--cp-bg-sunken, #F1F5F9)',

  t1: 'var(--cp-text-primary, #0F172A)',
  t2: 'var(--cp-text-secondary, #44546F)',
  t3: 'var(--cp-text-tertiary, #6B6E76)',
  t4: 'var(--cp-text-tertiary, #94A3B8)',

  border:       'var(--cp-border-default, rgba(15,23,42,0.12))',
  borderStrong: 'var(--cp-border-strong, rgba(15,23,42,0.20))',
  divider:      'var(--cp-border-default, rgba(15,23,42,0.06))',

  blue:      'var(--cp-blue-text, #2563EB)',
  blueKey:   'var(--cp-blue-text, #2563EB)',
  green:     'var(--cp-ok, #16A34A)',
  greenText: 'var(--cp-ok, #11853D)',

  shadow:     'var(--cp-shadow-xs, 0 1px 3px rgba(0,0,0,0.06))',
  cardShadow: 'var(--cp-shadow-xs, 0 1px 3px rgba(0,0,0,0.06))',
} as const;
