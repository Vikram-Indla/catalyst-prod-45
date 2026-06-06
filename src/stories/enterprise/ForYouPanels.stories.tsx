import type { Meta, StoryObj } from '@storybook/react';
import { ISSUES, TEAM, STATUSES } from '../fixtures/production-data';

const meta: Meta = { title: 'Enterprise Components/For You Panels', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

export const AssignedPanel: Story = {
  render: () => <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8 }}><h3 style={{ fontSize: 16, fontWeight: 653, margin: '0 0 12px' }}>Assigned to me</h3><p style={{ fontSize: 13, color: 'var(--ds-text-subtle,#42526E)' }}>Shows all ph_issues assigned to current user via assignee_account_id. Grouped by status category. Uses JiraTable cells.</p></div>,
};
export const StarredPanel: Story = {
  render: () => <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8 }}><h3 style={{ fontSize: 16, fontWeight: 653, margin: '0 0 12px' }}>Starred</h3><p style={{ fontSize: 13, color: 'var(--ds-text-subtle,#42526E)' }}>Issues bookmarked by user. Real-time via Supabase subscription on user_starred_items.</p></div>,
};
export const AgeingPanel: Story = {
  render: () => <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8 }}><h3 style={{ fontSize: 16, fontWeight: 653, margin: '0 0 12px' }}>Ageing</h3><p style={{ fontSize: 13, color: 'var(--ds-text-subtle,#42526E)' }}>In-progress issues past SLA threshold. Sorted by days since status change.</p></div>,
};
export const RecommendedPanel: Story = {
  render: () => <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8 }}><h3 style={{ fontSize: 16, fontWeight: 653, margin: '0 0 12px' }}>Recommended</h3><p style={{ fontSize: 13, color: 'var(--ds-text-subtle,#42526E)' }}>Mentions, comments, reactions via ph_comments + ph_comment_reactions. Emoji reaction strip + reply composer.</p></div>,
};
export const BoardPanel: Story = {
  render: () => <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8 }}><h3 style={{ fontSize: 16, fontWeight: 653, margin: '0 0 12px' }}>Board</h3><p style={{ fontSize: 13, color: 'var(--ds-text-subtle,#42526E)' }}>Mini kanban view of user's sprint. Uses PragmaticBoard adapter.</p></div>,
};
export const R360Panel: Story = {
  render: () => <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8 }}><h3 style={{ fontSize: 16, fontWeight: 653, margin: '0 0 12px' }}>Resource 360</h3><p style={{ fontSize: 13, color: 'var(--ds-text-subtle,#42526E)' }}>Team resource panel showing capacity, workload risk, and velocity from resource_inventory.</p></div>,
};
export const AiThemePanel: Story = {
  render: () => <div style={{ padding: 16, border: '1px solid var(--ds-border,#DFE1E6)', borderRadius: 8 }}><h3 style={{ fontSize: 16, fontWeight: 653, margin: '0 0 12px' }}>AI Focus (Themes)</h3><p style={{ fontSize: 13, color: 'var(--ds-text-subtle,#42526E)' }}>AI-generated theme clusters from ai-digest edge function. Uses Gemini to group issues into actionable themes.</p></div>,
};
