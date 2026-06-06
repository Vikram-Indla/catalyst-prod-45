import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = { title: 'Catalyst AI & Feed/Caty AI Components', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

export const AskCatyInlineBar: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg, rgba(255,60,172,0.05), rgba(43,134,197,0.05))', border: '1px solid var(--ds-border,#DFE1E6)' }}>
      <span style={{ fontSize: 14 }}>✦</span>
      <span style={{ fontSize: 13, color: 'var(--ds-text,#172B4D)' }}>Ask Caty about this issue...</span>
    </div>
  ),
};

export const ImproveIssueDropdown: Story = {
  render: () => (
    <div style={{ width: 240, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8, overflow: 'hidden' }}>
      {['Improve description', 'Suggest child issues', 'Find similar items', 'Summarize comments'].map(item => (
        <div key={item} style={{ padding: '10px 16px', fontSize: 13, color: 'var(--ds-text,#172B4D)', cursor: 'pointer', borderBottom: '1px solid var(--ds-border,#DFE1E6)' }}>{item}</div>
      ))}
    </div>
  ),
};

export const ThemeCard: Story = {
  render: () => (
    <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8, maxWidth: 320 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text,#172B4D)', marginBottom: 8 }}>UI Revamp Issues</div>
      <div style={{ fontSize: 12, color: 'var(--ds-text-subtle,#42526E)', marginBottom: 12 }}>5 issues clustered around Senaei App UI inconsistencies</div>
      <div style={{ display: 'flex', gap: 4 }}>
        <span style={{ padding: '2px 6px', borderRadius: 3, background: 'rgba(9,30,66,0.06)', fontSize: 11, fontWeight: 600 }}>BAU-5972</span>
        <span style={{ padding: '2px 6px', borderRadius: 3, background: 'rgba(9,30,66,0.06)', fontSize: 11, fontWeight: 600 }}>BAU-5973</span>
        <span style={{ padding: '2px 6px', borderRadius: 3, background: 'rgba(9,30,66,0.06)', fontSize: 11, fontWeight: 600 }}>+3</span>
      </div>
    </div>
  ),
};
