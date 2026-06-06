import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Enterprise Components/Global Search',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

export const Placeholder: Story = {
  render: () => (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 4, background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ds-icon, #44546F)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        <span style={{ fontSize: 14, color: 'var(--ds-text-subtlest, #6B778C)' }}>Search issues, people, projects...</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 4 }}>Cmd+K to open. Searches across ph_issues by key, summary, assignee.</div>
    </div>
  ),
};
