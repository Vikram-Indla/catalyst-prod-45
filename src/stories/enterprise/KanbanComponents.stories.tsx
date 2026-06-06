import type { Meta, StoryObj } from '@storybook/react';
import { ISSUES } from '../fixtures/production-data';

const meta: Meta = { title: 'Enterprise Components/Kanban Components', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

export const KanbanColumn: Story = {
  render: () => (
    <div style={{ width: 280, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8, padding: 8, background: 'var(--ds-surface-sunken,#F7F8F9)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 653, color: 'var(--ds-text-subtle,#42526E)' }}>IN PROGRESS</span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest,#6B778C)' }}>3</span>
      </div>
      {[ISSUES.story, ISSUES.task, ISSUES.qaBug].map(i => (
        <div key={i.issue_key} style={{ padding: 12, marginBottom: 4, borderRadius: 4, background: 'var(--ds-surface,#fff)', border: '1px solid var(--ds-border,#DFE1E6)', fontSize: 13 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--ds-text-subtle,#42526E)', marginBottom: 4 }}>{i.issue_key}</div>
          <div style={{ color: 'var(--ds-text,#172B4D)' }}>{i.summary.slice(0, 40)}...</div>
        </div>
      ))}
    </div>
  ),
};

export const InlineCreateCard: Story = {
  render: () => (
    <div style={{ width: 280, padding: 8, border: '2px dashed var(--ds-border,#DFE1E6)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtlest,#6B778C)', fontSize: 13, cursor: 'pointer' }}>
      <span style={{ fontSize: 18 }}>+</span> Create issue
    </div>
  ),
};

export const KanbanSwimlane: Story = {
  render: () => (
    <div style={{ borderTop: '1px solid var(--ds-border,#DFE1E6)', padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text,#172B4D)' }}>Vikram Indla</span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest,#6B778C)' }}>4 issues</span>
      </div>
    </div>
  ),
};
