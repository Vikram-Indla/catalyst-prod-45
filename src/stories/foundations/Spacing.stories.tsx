import type { Meta, StoryObj } from '@storybook/react';

const GRID_VALUES = [4, 8, 12, 16, 24, 32, 40, 48];

function SpacingGrid() {
  return (
    <div style={{ padding: 24, fontFamily: 'Atlassian Sans, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: 'var(--ds-text, #172B4D)', margin: '0 0 8px' }}>
        Spacing grid
      </h1>
      <p style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle, #42526E)', margin: '0 0 24px' }}>
        Catalyst uses a fixed spacing grid: 4, 8, 12, 16, 24, 32, 40, 48 px. No arbitrary values.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {GRID_VALUES.map((px) => (
          <div key={px} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <code style={{ width: 48, textAlign: 'right', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'monospace' }}>
              {px}px
            </code>
            <div
              style={{
                width: px,
                height: px,
                background: 'var(--ds-background-information-bold, #0C66E4)',
                borderRadius: 2,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                height: 24,
                width: px * 4,
                background: 'var(--ds-background-information, #E9F2FE)',
                borderRadius: 4,
                border: '1px solid var(--ds-border, #DFE1E6)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'Foundations/Spacing',
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

export const Grid: Story = {
  render: () => <SpacingGrid />,
};
