import type { Meta, StoryObj } from '@storybook/react';

const TOKEN_GROUPS = [
  {
    name: 'Text',
    tokens: [
      { token: '--ds-text', fallback: '#172B4D', label: 'text' },
      { token: '--ds-text-subtle', fallback: '#42526E', label: 'text-subtle' },
      { token: '--ds-text-subtlest', fallback: '#6B778C', label: 'text-subtlest' },
      { token: '--ds-text-inverse', fallback: '#FFFFFF', label: 'text-inverse' },
      { token: '--ds-text-disabled', fallback: '#A5ADBA', label: 'text-disabled' },
      { token: '--ds-text-danger', fallback: '#AE2A19', label: 'text-danger' },
      { token: '--ds-text-success', fallback: '#216E4E', label: 'text-success' },
      { token: '--ds-text-warning', fallback: '#974F0C', label: 'text-warning' },
      { token: '--ds-text-information', fallback: '#0055CC', label: 'text-information' },
      { token: '--ds-text-discovery', fallback: '#5E4DB2', label: 'text-discovery' },
    ],
  },
  {
    name: 'Surface',
    tokens: [
      { token: '--ds-surface', fallback: '#FFFFFF', label: 'surface' },
      { token: '--ds-surface-overlay', fallback: '#FFFFFF', label: 'surface-overlay' },
      { token: '--ds-surface-raised', fallback: '#FFFFFF', label: 'surface-raised' },
      { token: '--ds-surface-sunken', fallback: '#F7F8F9', label: 'surface-sunken' },
    ],
  },
  {
    name: 'Background',
    tokens: [
      { token: '--ds-background-neutral', fallback: '#F1F2F4', label: 'background-neutral' },
      { token: '--ds-background-neutral-subtle', fallback: '#F7F8F9', label: 'background-neutral-subtle' },
      { token: '--ds-background-neutral-bold', fallback: '#44546F', label: 'background-neutral-bold' },
      { token: '--ds-background-selected', fallback: '#E9F2FE', label: 'background-selected' },
      { token: '--ds-background-selected-bold', fallback: '#0C66E4', label: 'background-selected-bold' },
      { token: '--ds-background-danger', fallback: '#FFECEB', label: 'background-danger' },
      { token: '--ds-background-danger-bold', fallback: '#CA3521', label: 'background-danger-bold' },
      { token: '--ds-background-success', fallback: '#DCFFF1', label: 'background-success' },
      { token: '--ds-background-success-bold', fallback: '#1F845A', label: 'background-success-bold' },
      { token: '--ds-background-warning', fallback: '#FFF7D6', label: 'background-warning' },
      { token: '--ds-background-warning-bold', fallback: '#E2B203', label: 'background-warning-bold' },
      { token: '--ds-background-information', fallback: '#E9F2FE', label: 'background-information' },
      { token: '--ds-background-information-bold', fallback: '#0C66E4', label: 'background-information-bold' },
      { token: '--ds-background-discovery', fallback: '#F3F0FF', label: 'background-discovery' },
      { token: '--ds-background-discovery-bold', fallback: '#6E5DC6', label: 'background-discovery-bold' },
    ],
  },
  {
    name: 'Border',
    tokens: [
      { token: '--ds-border', fallback: '#DFE1E6', label: 'border' },
      { token: '--ds-border-bold', fallback: '#758195', label: 'border-bold' },
      { token: '--ds-border-focused', fallback: '#4C9AFF', label: 'border-focused' },
      { token: '--ds-border-danger', fallback: '#FF5630', label: 'border-danger' },
      { token: '--ds-border-success', fallback: '#36B37E', label: 'border-success' },
      { token: '--ds-border-discovery', fallback: '#6554C0', label: 'border-discovery' },
    ],
  },
  {
    name: 'Link',
    tokens: [
      { token: '--ds-link', fallback: '#0052CC', label: 'link' },
      { token: '--ds-link-pressed', fallback: '#0747A6', label: 'link-pressed' },
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
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'monospace' }}>
          var({tokenName}, {fallback})
        </div>
      </div>
    </div>
  );
}

function ColorPalette() {
  return (
    <div style={{ padding: 24, fontFamily: 'Atlassian Sans, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 24px' }}>
        ADS Color Tokens
      </h1>
      {TOKEN_GROUPS.map((group) => (
        <div key={group.name} style={{ marginBlockEnd: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', paddingBlockEnd: 8 }}>
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
