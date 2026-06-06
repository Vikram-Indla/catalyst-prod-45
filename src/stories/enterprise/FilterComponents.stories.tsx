import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = { title: 'Enterprise Components/Filter Components', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

export const BasicFilterBar: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--ds-border,#DFE1E6)' }}>
      {['Project', 'Type', 'Status', 'Assignee', 'Priority'].map(f => (
        <button key={f} style={{ padding: '4px 12px', borderRadius: 3, border: '1px solid var(--ds-border,#DFE1E6)', background: 'var(--ds-surface,#fff)', fontSize: 13, color: 'var(--ds-text,#172B4D)', cursor: 'pointer' }}>{f}</button>
      ))}
    </div>
  ),
};

export const FilterTemplateGallery: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 600 }}>
      {['My open issues', 'Done last 7 days', 'Blocked items', 'High priority', 'Recently updated'].map(t => (
        <div key={t} style={{ padding: 16, borderRadius: 8, border: '1px solid var(--ds-border,#DFE1E6)', cursor: 'pointer', fontSize: 14, color: 'var(--ds-text,#172B4D)', fontWeight: 500 }}>{t}</div>
      ))}
    </div>
  ),
};

export const JQLEditor: Story = {
  render: () => (
    <div style={{ padding: 12, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 4, fontFamily: 'monospace', fontSize: 13, color: 'var(--ds-text,#172B4D)', background: 'var(--ds-surface-sunken,#F7F8F9)' }}>
      project = BAU AND status = "In Progress" AND assignee = currentUser() ORDER BY updated DESC
    </div>
  ),
};
