
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface)' }}>{children}</div></Providers>;
}

import { WorkItemCard } from '@/components/kanban/WorkItemCard';

const tk = {
  surface: 'var(--ds-surface)', surfaceHover: 'var(--ds-surface-hovered)',
  border: 'var(--ds-border)', text: 'var(--ds-text)',
  textSubtle: 'var(--ds-text-subtle)', textSubtlest: 'var(--ds-text-subtlest)',
  flagBg: 'var(--ds-background-warning)', selected: 'var(--ds-background-selected)',
};
const d = { cardPadding: 12, avatarSize: 24, fontSize: 'var(--ds-font-size-300)', keyFontSize: 11, gap: 6, borderRadius: 8, minHeight: 80 };

const card = {
  id: 'i1', issue_key: 'BAU-5972', summary: 'Industrial Capabilities: Add Item Interface',
  status: 'In Development', status_category: 'indeterminate', priority: 'High',
  issue_type: 'Story', assignee_display_name: 'Vikram Indla', assignee_account_id: 'u1',
  project_key: 'BAU', flagged: false, labels: ['frontend'], comment_count: 3,
};

export default { title: 'Audit Grade/14 — Kanban Work Item Card' };

export const Default: StoryObj = {
  render: () => <Frame width={300}><WorkItemCard issue={card as any} d={d as any} tk={tk as any} onOpenDetail={fn()} /></Frame>,
};
export const Selected: StoryObj = {
  render: () => <Frame width={300}><WorkItemCard issue={card as any} d={d as any} tk={tk as any} isSelected onOpenDetail={fn()} /></Frame>,
};
export const Flagged: StoryObj = {
  render: () => <Frame width={300}><WorkItemCard issue={{ ...card, flagged: true } as any} d={d as any} tk={tk as any} onOpenDetail={fn()} /></Frame>,
};
export const QABug: StoryObj = {
  render: () => <Frame width={300}><WorkItemCard issue={{ ...card, issue_type: 'QA Bug', issue_key: 'BAU-5973', summary: 'Validation tooltip missing', priority: 'Critical' } as any} d={d as any} tk={tk as any} onOpenDetail={fn()} /></Frame>,
};
export const Unassigned: StoryObj = {
  render: () => <Frame width={300}><WorkItemCard issue={{ ...card, assignee_display_name: null, assignee_account_id: null } as any} d={d as any} tk={tk as any} onOpenDetail={fn()} /></Frame>,
};
