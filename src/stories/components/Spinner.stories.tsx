import type { Meta, StoryObj } from '@storybook/react';
import Spinner from '@atlaskit/spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Components/Spinner',
  component: Spinner,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Spinner>;

export const Small: Story = { args: { size: 'small' } };
export const Medium: Story = { args: { size: 'medium' } };
export const Large: Story = { args: { size: 'large' } };
export const XLarge: Story = { args: { size: 'xlarge' } };

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {(['small', 'medium', 'large', 'xlarge'] as const).map((s) => (
        <div key={s} style={{ textAlign: 'center' }}>
          <Spinner size={s} />
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginBlockStart: 8 }}>{s}</div>
        </div>
      ))}
    </div>
  ),
};

export const InvertedOnDark: Story = {
  render: () => (
    <div style={{ background: 'var(--ds-background-neutral-bold, #44546F)', padding: 24, borderRadius: 8, display: 'inline-flex', gap: 16 }}>
      <Spinner size="small" appearance="invert" />
      <Spinner size="medium" appearance="invert" />
    </div>
  ),
};
