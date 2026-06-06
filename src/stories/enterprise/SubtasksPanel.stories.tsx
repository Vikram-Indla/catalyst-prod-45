import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Enterprise Components/Subtasks Panel',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const Placeholder: Story = {
  render: () => (
    <div style={{ padding: 24, border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 4 }}>
      <h3 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #292A2E)', margin: 0 }}>
        Sub-tasks
        <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ds-text-subtlest, #6B778C)', marginLeft: 8 }}>3</span>
      </h3>
      <p style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)', marginTop: 8 }}>
        Subtasks panel renders via JiraTable with inline create. Connect to live data to see full interaction.
      </p>
    </div>
  ),
};
