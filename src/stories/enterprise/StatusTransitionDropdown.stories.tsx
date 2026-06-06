import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Enterprise Components/Status Transition Dropdown',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const Placeholder: Story = {
  render: () => (
    <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ padding: '4px 12px', borderRadius: 3, background: '#669DF1', color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>
        IN PROGRESS
      </span>
      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>Click to transition (requires live workflow engine)</span>
    </div>
  ),
};
