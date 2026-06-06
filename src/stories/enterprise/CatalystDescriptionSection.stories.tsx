import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Enterprise Components/Description Section',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const Placeholder: Story = {
  render: () => (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ds-text-subtle, #505258)' }}>Description</h2>
      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: 'var(--ds-text, #172B4D)' }}>
        <p>As a user, I want to authenticate using my Jira credentials so that I can access Catalyst without a separate login.</p>
        <h3>Acceptance Criteria</h3>
        <ul>
          <li>SSO flow completes in under 3 seconds</li>
          <li>Failed auth shows a clear error message</li>
          <li>Session persists for 7 days</li>
        </ul>
      </div>
    </div>
  ),
};
