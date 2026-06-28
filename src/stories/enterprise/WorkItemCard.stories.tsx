import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { WorkItemCard } from '@/components/kanban/WorkItemCard';

const tk = {
  surface: 'var(--ds-surface)', surfaceHover: 'var(--ds-surface-hovered)',
  border: 'var(--ds-border)', text: 'var(--ds-text)',
  textSubtle: 'var(--ds-text-subtle)', textSubtlest: 'var(--ds-text-subtlest)',
  flagBg: 'var(--ds-background-warning)', selected: 'var(--ds-background-selected)',
};
const d = { cardPadding: 12, avatarSize: 24, fontSize: 'var(--ds-font-size-300)', keyFontSize: 11, gap: 6, borderRadius: 8, minHeight: 80 };
const issue = {
  id: 'i1', issue_key: 'BAU-5972', summary: 'Industrial Capabilities: Add Item Interface',
  status: 'In Development', status_category: 'indeterminate', priority: 'High',
  issue_type: 'Story', assignee_display_name: 'Vikram Indla', assignee_account_id: 'u1',
  project_key: 'BAU', flagged: false, labels: ['frontend'], comment_count: 3,
};

const meta: Meta<typeof WorkItemCard> = {
  title: 'Enterprise Components/Work Item Card',
  component: WorkItemCard,
  parameters: { layout: 'padded' },
};
export default meta;

export const Default: StoryObj<typeof WorkItemCard> = {
  render: () => <div style={{ maxWidth: 300 }}><WorkItemCard issue={issue as any} d={d as any} tk={tk as any} onOpenDetail={fn()} /></div>,
};
export const Flagged: StoryObj<typeof WorkItemCard> = {
  render: () => <div style={{ maxWidth: 300 }}><WorkItemCard issue={{ ...issue, flagged: true } as any} d={d as any} tk={tk as any} onOpenDetail={fn()} /></div>,
};
export const Selected: StoryObj<typeof WorkItemCard> = {
  render: () => <div style={{ maxWidth: 300 }}><WorkItemCard issue={issue as any} d={d as any} tk={tk as any} isSelected onOpenDetail={fn()} /></div>,
};
