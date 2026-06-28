import type { Meta, StoryObj } from '@storybook/react';

const TOKEN_GROUPS = [
  {
    name: 'Text',
    tokens: [
      { token: '--ds-text', fallback: 'var(--ds-text)', label: 'text' },
      { token: '--ds-text-subtle', fallback: 'var(--ds-text-subtle)', label: 'text-subtle' },
      { token: '--ds-text-subtlest', fallback: 'var(--ds-text-subtlest)', label: 'text-subtlest' },
      { token: '--ds-text-inverse', fallback: 'var(--ds-surface)', label: 'text-inverse' },
      { token: '--ds-text-disabled', fallback: 'var(--ds-text-subtlest)', label: 'text-disabled' },
      { token: '--ds-text-danger', fallback: 'var(--ds-text-danger)', label: 'text-danger' },
      { token: '--ds-text-success', fallback: 'var(--ds-text-success)', label: 'text-success' },
      { token: '--ds-text-warning', fallback: 'var(--ds-text-warning)', label: 'text-warning' },
      { token: '--ds-text-information', fallback: 'var(--ds-link)', label: 'text-information' },
      { token: '--ds-text-discovery', fallback: 'var(--ds-background-discovery-bold)', label: 'text-discovery' },
    ],
  },
  {
    name: 'Surface',
    tokens: [
      { token: '--ds-surface', fallback: 'var(--ds-surface)', label: 'surface' },
      { token: '--ds-surface-overlay', fallback: 'var(--ds-surface)', label: 'surface-overlay' },
      { token: '--ds-surface-raised', fallback: 'var(--ds-surface)', label: 'surface-raised' },
      { token: '--ds-surface-sunken', fallback: 'var(--ds-surface-sunken)', label: 'surface-sunken' },
    ],
  },
  {
    name: 'Background',
    tokens: [
      { token: '--ds-background-neutral', fallback: 'var(--ds-background-neutral)', label: 'background-neutral' },
      { token: '--ds-background-neutral-subtle', fallback: 'var(--ds-surface-sunken)', label: 'background-neutral-subtle' },
      { token: '--ds-background-neutral-bold', fallback: 'var(--ds-icon)', label: 'background-neutral-bold' },
      { token: '--ds-background-selected', fallback: 'var(--ds-background-selected)', label: 'background-selected' },
      { token: '--ds-background-selected-bold', fallback: 'var(--ds-link)', label: 'background-selected-bold' },
      { token: '--ds-background-danger', fallback: 'var(--ds-background-danger)', label: 'background-danger' },
      { token: '--ds-background-danger-bold', fallback: 'var(--ds-background-danger-bold)', label: 'background-danger-bold' },
      { token: '--ds-background-success', fallback: 'var(--ds-background-success)', label: 'background-success' },
      { token: '--ds-background-success-bold', fallback: 'var(--ds-background-success-bold)', label: 'background-success-bold' },
      { token: '--ds-background-warning', fallback: 'var(--ds-background-warning)', label: 'background-warning' },
      { token: '--ds-background-warning-bold', fallback: 'var(--ds-background-warning-bold)', label: 'background-warning-bold' },
      { token: '--ds-background-information', fallback: 'var(--ds-background-selected)', label: 'background-information' },
      { token: '--ds-background-information-bold', fallback: 'var(--ds-link)', label: 'background-information-bold' },
      { token: '--ds-background-discovery', fallback: 'var(--ds-background-discovery)', label: 'background-discovery' },
      { token: '--ds-background-discovery-bold', fallback: 'var(--ds-background-discovery-bold)', label: 'background-discovery-bold' },
    ],
  },
  {
    name: 'Border',
    tokens: [
      { token: '--ds-border', fallback: 'var(--ds-border)', label: 'border' },
      { token: '--ds-border-bold', fallback: 'var(--ds-text-subtle)', label: 'border-bold' },
      { token: '--ds-border-focused', fallback: 'var(--ds-background-information-bold)', label: 'border-focused' },
      { token: '--ds-border-danger', fallback: 'var(--ds-background-danger-bold)', label: 'border-danger' },
      { token: '--ds-border-success', fallback: 'var(--ds-background-success-bold)', label: 'border-success' },
      { token: '--ds-border-discovery', fallback: 'var(--ds-background-discovery-bold)', label: 'border-discovery' },
    ],
  },
  {
    name: 'Link',
    tokens: [
      { token: '--ds-link', fallback: 'var(--ds-link)', label: 'link' },
      { token: '--ds-link-pressed', fallback: 'var(--ds-link-pressed)', label: 'link-pressed' },
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
          border: '1px solid var(--ds-border)',
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text)' }}>
          {label}
        </div>
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', fontFamily: 'monospace' }}>
          var({tokenName}, {fallback})
        </div>
      </div>
    </div>
  );
}

function ColorPalette() {
  return (
    <div style={{ padding: 24, fontFamily: 'Atlassian Sans, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: 'var(--ds-text)', margin: '0 0 24px' }}>
        ADS Color Tokens
      </h1>
      {TOKEN_GROUPS.map((group) => (
        <div key={group.name} style={{ marginBlockEnd: 32 }}>
          <h2 style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 653, color: 'var(--ds-text)', margin: '0 0 16px', borderBottom: '1px solid var(--ds-border)', paddingBlockEnd: 8 }}>
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
