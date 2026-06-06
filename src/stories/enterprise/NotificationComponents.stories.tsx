import type { Meta, StoryObj } from '@storybook/react';
import { TEAM, ISSUES } from '../fixtures/production-data';

const meta: Meta = { title: 'Enterprise Components/Notification Components', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

export const MentionActivityCard: Story = {
  render: () => (
    <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8, maxWidth: 400 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0C66E4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>SA</div>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ds-text,#172B4D)' }}><strong>{TEAM[2].name}</strong> mentioned you in <span style={{ color: 'var(--ds-link,#0C66E4)' }}>{ISSUES.story.issue_key}</span></div>
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest,#6B778C)', marginTop: 4 }}>2 hours ago</div>
        </div>
      </div>
    </div>
  ),
};

export const ReplyComposer: Story = {
  render: () => (
    <div style={{ maxWidth: 400, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8, padding: 12 }}>
      <div style={{ padding: '8px 12px', border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 4, fontSize: 13, color: 'var(--ds-text-subtlest,#6B778C)', marginBottom: 8 }}>Write a reply...</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button style={{ padding: '4px 12px', borderRadius: 3, border: '1px solid var(--ds-border,#DFE1E6)', fontSize: 13 }}>Cancel</button>
        <button style={{ padding: '4px 12px', borderRadius: 3, background: 'var(--ds-background-brand-bold,#0C66E4)', color: '#fff', border: 'none', fontSize: 13 }}>Reply</button>
      </div>
    </div>
  ),
};
