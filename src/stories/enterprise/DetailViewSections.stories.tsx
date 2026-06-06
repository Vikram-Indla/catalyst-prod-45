import type { Meta, StoryObj } from '@storybook/react';
import { ISSUES } from '../fixtures/production-data';

const meta: Meta = { title: 'Enterprise Components/Detail View Sections', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

export const CatalystViewBase: Story = {
  render: () => (
    <div style={{ border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ds-border,#DFE1E6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--ds-text-subtle,#42526E)' }}>IN-61</span>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ds-text,#172B4D)', margin: '4px 0 0' }}>Export task list</h1>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: 3, background: 'rgba(9,30,66,0.06)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const }}>BACKLOG</span>
      </div>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, padding: 24, fontSize: 14, color: 'var(--ds-text,#172B4D)' }}>Description + Activity + Subtasks area</div>
        <div style={{ width: 320, padding: 16, borderLeft: '1px solid var(--ds-border,#DFE1E6)', fontSize: 13 }}>Sidebar Details (assignee, priority, etc.)</div>
      </div>
    </div>
  ),
};

export const ConfirmDialogs: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {['Archive', 'Clone', 'Delete', 'Move'].map(action => (
        <div key={action} style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8, width: 200, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{action} issue?</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button style={{ padding: '4px 12px', borderRadius: 3, border: '1px solid var(--ds-border,#DFE1E6)', fontSize: 12 }}>Cancel</button>
            <button style={{ padding: '4px 12px', borderRadius: 3, background: action === 'Delete' ? '#CA3521' : '#0C66E4', color: '#fff', border: 'none', fontSize: 12 }}>{action}</button>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const AttachmentsPanel: Story = {
  render: () => (
    <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8 }}>
      <h3 style={{ fontSize: 16, fontWeight: 653, margin: '0 0 12px' }}>Attachments <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ds-text-subtlest,#6B778C)' }}>2</span></h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ padding: '8px 12px', border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 4, fontSize: 12 }}>screenshot.png (245 KB)</div>
        <div style={{ padding: '8px 12px', border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 4, fontSize: 12 }}>requirements.pdf (1.2 MB)</div>
      </div>
    </div>
  ),
};

export const CommentsSection: Story = {
  render: () => (
    <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8, maxWidth: 600 }}>
      <h3 style={{ fontSize: 16, fontWeight: 653, margin: '0 0 12px' }}>Activity</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#5E4DB2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>SH</div>
        <div>
          <div style={{ fontSize: 13 }}><strong>Syed Habib</strong> <span style={{ color: 'var(--ds-text-subtlest,#6B778C)' }}>2 days ago</span></div>
          <div style={{ fontSize: 14, color: 'var(--ds-text,#172B4D)', marginTop: 4 }}>Updated the acceptance criteria to include export format selection.</div>
        </div>
      </div>
    </div>
  ),
};
