import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WorkItemCard } from '@/components/kanban/WorkItemCard';

const tk = {
  surface: 'var(--ds-surface, #fff)', surfaceHover: 'var(--ds-surface-hovered, #fafbfc)',
  border: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #172B4D)',
  textSubtle: 'var(--ds-text-subtle, #42526E)', textSubtlest: 'var(--ds-text-subtlest, #6B778C)',
  flagBg: 'var(--ds-background-warning, #FFF7D6)', selected: 'var(--ds-background-selected, #E9F2FE)',
};
const d = { cardPadding: 12, avatarSize: 24, fontSize: 13, keyFontSize: 11, gap: 6, borderRadius: 8, minHeight: 80 };

const meta: Meta = {
  title: 'Enterprise Components/Kanban Components',
  parameters: { layout: 'padded' },
};
export default meta;

export const StoryCard: StoryObj = {
  render: () => <div style={{ maxWidth: 280 }}><WorkItemCard issue={{ id: 'i1', issue_key: 'BAU-5972', summary: 'Add Item Interface', status: 'In Development', status_category: 'indeterminate', priority: 'High', issue_type: 'Story', assignee_display_name: 'Vikram Indla', project_key: 'BAU', flagged: false, comment_count: 3 } as any} d={d as any} tk={tk as any} onOpenDetail={fn()} /></div>,
};
export const BugCard: StoryObj = {
  render: () => <div style={{ maxWidth: 280 }}><WorkItemCard issue={{ id: 'i2', issue_key: 'BAU-5973', summary: 'Validation tooltip missing', status: 'In QA', status_category: 'indeterminate', priority: 'Critical', issue_type: 'QA Bug', assignee_display_name: 'Yazeed Daraz', project_key: 'BAU', flagged: false, comment_count: 1 } as any} d={d as any} tk={tk as any} onOpenDetail={fn()} /></div>,
};
