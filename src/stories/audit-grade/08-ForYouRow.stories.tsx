
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

import ForYouRow from '@/components/for-you/atlaskit/ForYouRow';
import type { WorkItem } from '@/hooks/useForYouData';

const item: WorkItem = {
  id: '1', key: 'BAU-5972', summary: 'Industrial Capabilities: Add Item Interface',
  mode: 'assigned' as any, level: 'standard', project: 'Senaei BAU', projectKey: 'BAU',
  hub: 'project' as any, hubLabel: 'Project Hub',
  updatedAt: new Date(Date.now() - 3_600_000).toISOString(), createdAt: '2026-04-01T10:00:00Z',
  assignee: { name: 'Vikram Indla', accountId: 'u1' },
  issueType: 'Story', group: 'today' as any, status: 'In Development',
  statusCategory: 'indeterminate', priority: 'High', priorityLevel: 2,
} as WorkItem;

export default { title: 'Audit Grade/08 — Work Item Row' };

export const Default: StoryObj = {
  render: () => <Frame width={800}><ForYouRow item={item} onSelect={fn()} onToggleStar={fn()} /></Frame>,
};
export const Starred: StoryObj = {
  render: () => <Frame width={800}><ForYouRow item={{ ...item, starred: true }} alwaysShowStar onSelect={fn()} onToggleStar={fn()} /></Frame>,
};
export const QABug: StoryObj = {
  render: () => <Frame width={800}><ForYouRow item={{ ...item, issueType: 'QA Bug', status: 'In QA', key: 'BAU-5973' } as WorkItem} onSelect={fn()} onToggleStar={fn()} /></Frame>,
};
export const Epic: StoryObj = {
  render: () => <Frame width={800}><ForYouRow item={{ ...item, issueType: 'Epic', key: 'BAU-5400', summary: 'Industrial Capabilities Module', priority: 'Critical' } as WorkItem} onSelect={fn()} onToggleStar={fn()} /></Frame>,
};
export const DoneStatus: StoryObj = {
  render: () => <Frame width={800}><ForYouRow item={{ ...item, status: 'Done', statusCategory: 'done' } as WorkItem} onSelect={fn()} onToggleStar={fn()} /></Frame>,
};
export const WithSuggestion: StoryObj = {
  render: () => <Frame width={800}><ForYouRow item={item} onSelect={fn()} onToggleStar={fn()} suggestion="Review the validation logic before QA handoff" /></Frame>,
};
export const HideProject: StoryObj = {
  render: () => <Frame width={800}><ForYouRow item={item} hideProject onSelect={fn()} onToggleStar={fn()} /></Frame>,
};
