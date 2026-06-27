// Design tokens — Atlassian Design System via CSS custom properties.
// ZERO-DRIFT: never hardcode hex in components; always read these. Fallbacks
// mirror the live token values and keep Storybook/tests rendering off-app.
export const T = {
  text:         'var(--ds-text, #172B4D)',
  subtle:       'var(--ds-text-subtle, #44546F)',
  subtlest:     'var(--ds-text-subtlest, #626F86)',
  disabled:     'var(--ds-text-disabled, #8993A4)',
  link:         'var(--ds-link, #0C66E4)',
  linkPressed:  'var(--ds-link-pressed, #0055CC)',
  border:       'var(--ds-border, #091E4224)',
  borderSubtle: 'var(--ds-border-subtle, #091E420F)',
  surface:      'var(--ds-surface, #FFFFFF)',
  surfaceRaised:'var(--ds-surface-raised, #FFFFFF)',
  surfaceSunken:'var(--ds-surface-sunken, #F7F8F9)',
  bgInput:      'var(--ds-surface, #FFFFFF)',
  btnDefault:   'var(--ds-background-neutral, #091E420F)',
  btnDefaultHov:'var(--ds-background-neutral-hovered, #091E4224)',
  selected:     'var(--ds-background-selected, #E9F2FF)',
  bgInfo:       'var(--ds-background-information, #E9F2FF)',
  bgSuccess:    'var(--ds-background-success, #DCFFF1)',
  bgWarning:    'var(--ds-background-warning, #FFF7D6)',
  bgDanger:     'var(--ds-background-danger, #FFECEB)',
  bgDiscovery:  'var(--ds-background-discovery, #F3F0FF)',
  dangerBold:   'var(--ds-background-danger-bold, #C9372C)',
  textSuccess:  'var(--ds-text-success, #216E4E)',
  textWarning:  'var(--ds-text-warning, #974F0C)',
  textDanger:   'var(--ds-text-danger, #AE2A19)',
  textDiscovery:'var(--ds-text-discovery, #5E4DB2)',
  icon:         'var(--ds-icon, #44546F)',
  iconSubtle:   'var(--ds-icon-subtle, #626F86)',
  shadowRaised: 'var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31))',
} as const;

// Avatar palette for resolved users / roles (kept stable, brand-derived).
export const AVATAR = {
  purple: '#5E4DB2', teal: '#1F845A', blue: '#0C66E4', red: '#C9372C', amber: '#A54800',
} as const;
