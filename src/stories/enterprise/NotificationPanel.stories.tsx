import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Enterprise Components/Notification Panel',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const Placeholder: Story = {
  render: () => (
    <div style={{ width: 380, border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, padding: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 653, margin: '0 0 12px 0', color: 'var(--ds-text, #292A2E)' }}>Notifications</h3>
      <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)' }}>
        Notification panel renders mentions, comments, status changes, and assignments.
        Requires live Supabase connection for real-time updates.
      </div>
    </div>
  ),
};
