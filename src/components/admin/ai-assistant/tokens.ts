// Design tokens — Atlassian Design System via CSS custom properties.
// ZERO-DRIFT: var(--ds-*) only, no hex fallbacks, no bare rgb/rgba/hsl.
export const T = {
  text:         'var(--ds-text)',
  subtle:       'var(--ds-text-subtle)',
  subtlest:     'var(--ds-text-subtlest)',
  disabled:     'var(--ds-text-disabled)',
  inverse:      'var(--ds-text-inverse)',
  link:         'var(--ds-link)',
  linkPressed:  'var(--ds-link-pressed)',
  border:       'var(--ds-border)',
  borderBold:   'var(--ds-border-bold)',
  borderSubtle: 'var(--ds-border-subtle)',
  surface:      'var(--ds-surface)',
  surfaceRaised:'var(--ds-surface-raised)',
  surfaceSunken:'var(--ds-surface-sunken)',
  bgInput:      'var(--ds-surface)',
  btnDefault:   'var(--ds-background-neutral)',
  btnDefaultHov:'var(--ds-background-neutral-hovered)',
  selected:     'var(--ds-background-selected)',
  bgInfo:       'var(--ds-background-information)',
  bgSuccess:    'var(--ds-background-success)',
  bgSuccessBold:'var(--ds-background-success-bold)',
  bgWarning:    'var(--ds-background-warning)',
  bgDanger:     'var(--ds-background-danger)',
  bgDiscovery:  'var(--ds-background-discovery)',
  textSuccess:  'var(--ds-text-success)',
  textWarning:  'var(--ds-text-warning)',
  textDanger:   'var(--ds-text-danger)',
  textDiscovery:'var(--ds-text-discovery)',
  icon:         'var(--ds-icon)',
  iconSubtle:   'var(--ds-icon-subtle)',
  shadowRaised: 'var(--ds-shadow-raised)',
} as const;

// Avatar backgrounds — ADS bold semantic tokens, text on bold = T.inverse.
export const AVATAR = {
  purple: 'var(--ds-background-discovery-bold)',
  teal:   'var(--ds-background-success-bold)',
  blue:   'var(--ds-background-information-bold)',
  red:    'var(--ds-background-danger-bold)',
  amber:  'var(--ds-background-warning-bold)',
} as const;
