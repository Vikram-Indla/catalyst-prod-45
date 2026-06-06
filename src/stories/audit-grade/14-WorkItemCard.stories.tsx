
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface, #fff)' }}>{children}</div></Providers>;
}

import { WorkItemCard } from '@/components/kanban/WorkItemCard';

const tk = {
  surface: 'var(--ds-surface, #fff)', surfaceHover: 'var(--ds-surface-hovered, #fafbfc)',
  border: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #172B4D)',
  textSubtle: 'var(--ds-text-subtle, #42526E)', textSubtlest: 'var(--ds-text-subtlest, #6B778C)',
  flagBg: 'var(--ds-background-warning, #FFF7D6)', selected: 'var(--ds-background-selected, #E9F2FE)',
};
const d = { cardPadding: 12, avatarSize: 24, fontSize: 13, keyFontSize: 11, gap: 6, borderRadius: 8, minHeight: 80 };

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
