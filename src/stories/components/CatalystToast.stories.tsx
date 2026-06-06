import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Components/Catalyst Toast',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { type: 'success', msg: 'Item saved successfully' },
        { type: 'error', msg: 'Failed to delete item' },
        { type: 'info', msg: 'Syncing with Jira...' },
        { type: 'warning', msg: 'You have unsaved changes' },
      ].map(({ type, msg }) => (
        <div key={type} style={{ padding: '12px 16px', borderRadius: 4, border: '1px solid var(--ds-border, #DFE1E6)', fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>
          <strong style={{ textTransform: 'uppercase' as const, fontSize: 11, marginRight: 8 }}>{type}</strong>
          {msg}
        </div>
      ))}
    </div>
  ),
};
