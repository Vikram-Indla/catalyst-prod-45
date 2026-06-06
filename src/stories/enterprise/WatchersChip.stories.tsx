import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Enterprise Components/Watchers Chip',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const Placeholder: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 8 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 3C4.5 3 1.7 5.1 0.5 8c1.2 2.9 4 5 7.5 5s6.3-2.1 7.5-5c-1.2-2.9-4-5-7.5-5zm0 8.3c-1.8 0-3.3-1.5-3.3-3.3S6.2 4.7 8 4.7s3.3 1.5 3.3 3.3S9.8 11.3 8 11.3z" fill="var(--ds-icon, #44546F)" />
        <circle cx="8" cy="8" r="2" fill="var(--ds-icon, #44546F)" />
      </svg>
      <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>3 watching</span>
    </div>
  ),
};
