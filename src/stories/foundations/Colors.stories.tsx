import type { Meta, StoryObj } from '@storybook/react';

const TOKEN_GROUPS = [
  {
    name: 'Text',
    tokens: [
      { token: '--ds-text', fallback: 'var(--ds-text, #172B4D)', label: 'text' },
      { token: '--ds-text-subtle', fallback: 'var(--ds-text-subtle, #42526E)', label: 'text-subtle' },
      { token: '--ds-text-subtlest', fallback: 'var(--ds-text-subtlest, #6B778C)', label: 'text-subtlest' },
      { token: '--ds-text-inverse', fallback: 'var(--ds-surface, #FFFFFF)', label: 'text-inverse' },
      { token: '--ds-text-disabled', fallback: 'var(--ds-text-subtlest, #626F86)', label: 'text-disabled' },
      { token: '--ds-text-danger', fallback: 'var(--ds-text-danger, #AE2A19)', label: 'text-danger' },
      { token: '--ds-text-success', fallback: 'var(--ds-text-success, #216E4E)', label: 'text-success' },
      { token: '--ds-text-warning', fallback: 'var(--ds-text-warning, #974F0C)', label: 'text-warning' },
      { token: '--ds-text-information', fallback: 'var(--ds-link, #0C66E4)', label: 'text-information' },
      { token: '--ds-text-discovery', fallback: 'var(--ds-background-discovery-bold, #6E5DC6)', label: 'text-discovery' },
    ],
  },
  {
    name: 'Surface',
    tokens: [
      { token: '--ds-surface', fallback: 'var(--ds-surface, #FFFFFF)', label: 'surface' },
      { token: '--ds-surface-overlay', fallback: 'var(--ds-surface, #FFFFFF)', label: 'surface-overlay' },
      { token: '--ds-surface-raised', fallback: 'var(--ds-surface, #FFFFFF)', label: 'surface-raised' },
      { token: '--ds-surface-sunken', fallback: 'var(--ds-surface-sunken, #F7F8F9)', label: 'surface-sunken' },
    ],
  },
  {
    name: 'Background',
    tokens: [
      { token: '--ds-background-neutral', fallback: 'var(--ds-background-neutral, #F1F2F4)', label: 'background-neutral' },
      { token: '--ds-background-neutral-subtle', fallback: 'var(--ds-surface-sunken, #F7F8F9)', label: 'background-neutral-subtle' },
      { token: '--ds-background-neutral-bold', fallback: 'var(--ds-icon, #44546F)', label: 'background-neutral-bold' },
      { token: '--ds-background-selected', fallback: 'var(--ds-background-selected, #E9F2FF)', label: 'background-selected' },
      { token: '--ds-background-selected-bold', fallback: 'var(--ds-link, #0C66E4)', label: 'background-selected-bold' },
      { token: '--ds-background-danger', fallback: 'var(--ds-background-danger, #FFECEB)', label: 'background-danger' },
      { token: '--ds-background-danger-bold', fallback: 'var(--ds-background-danger-bold, #C9372C)', label: 'background-danger-bold' },
      { token: '--ds-background-success', fallback: 'var(--ds-background-success, #DFFCF0)', label: 'background-success' },
      { token: '--ds-background-success-bold', fallback: 'var(--ds-background-success-bold, #1F845A)', label: 'background-success-bold' },
      { token: '--ds-background-warning', fallback: 'var(--ds-background-warning, #FFF7D6)', label: 'background-warning' },
      { token: '--ds-background-warning-bold', fallback: 'var(--ds-background-warning-bold, #E2B203)', label: 'background-warning-bold' },
      { token: '--ds-background-information', fallback: 'var(--ds-background-selected, #E9F2FF)', label: 'background-information' },
      { token: '--ds-background-information-bold', fallback: 'var(--ds-link, #0C66E4)', label: 'background-information-bold' },
      { token: '--ds-background-discovery', fallback: 'var(--ds-background-discovery, #F3F0FF)', label: 'background-discovery' },
      { token: '--ds-background-discovery-bold', fallback: 'var(--ds-background-discovery-bold, #6E5DC6)', label: 'background-discovery-bold' },
    ],
  },
  {
    name: 'Border',
    tokens: [
      { token: '--ds-border', fallback: 'var(--ds-border, #DFE1E6)', label: 'border' },
      { token: '--ds-border-bold', fallback: 'var(--ds-text-subtle, #44546F)', label: 'border-bold' },
      { token: '--ds-border-focused', fallback: 'var(--ds-background-information-bold, #0C66E4)', label: 'border-focused' },
      { token: '--ds-border-danger', fallback: 'var(--ds-background-danger-bold, #C9372C)', label: 'border-danger' },
      { token: '--ds-border-success', fallback: 'var(--ds-background-success-bold, #1F845A)', label: 'border-success' },
      { token: '--ds-border-discovery', fallback: 'var(--ds-background-discovery-bold, #6554C0)', label: 'border-discovery' },
    ],
  },
  {
    name: 'Link',
    tokens: [
      { token: '--ds-link', fallback: 'var(--ds-link, #0052CC)', label: 'link' },
      { token: '--ds-link-pressed', fallback: 'var(--ds-link-pressed, #0747A6)', label: 'link-pressed' },
    ],
  },
];

function Swatch({ tokenName, fallback, label }: { tokenName: string; fallback: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBlockEnd: 8 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          background: `var(${tokenName}, ${fallback})`,
          border: '1px solid var(--ds-border, #DFE1E6)',
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          {label}
        </div>
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'monospace' }}>
          var({tokenName}, {fallback})
        </div>
      </div>
    </div>
  );
}

function ColorPalette() {
  return (
    <div style={{ padding: 24, fontFamily: 'Atlassian Sans, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 24px' }}>
        ADS Color Tokens
      </h1>
      {TOKEN_GROUPS.map((group) => (
        <div key={group.name} style={{ marginBlockEnd: 32 }}>
          <h2 style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', paddingBlockEnd: 8 }}>
            {group.name}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {group.tokens.map((t) => (
              <Swatch key={t.token} tokenName={t.token} fallback={t.fallback} label={t.label} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Foundations/Colors',
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj;

export const Palette: Story = {
  render: () => <ColorPalette />,
};
