
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface, #fff)' }}>{children}</div></Providers>;
}

import { JiraFilterAtlaskit } from '@/components/shared/JiraFilterAtlaskit';

const statusOpts = [
  { value: 'todo', label: 'To Do', category: 'new' },
  { value: 'inprog', label: 'In Progress', category: 'indeterminate' },
  { value: 'done', label: 'Done', category: 'done' },
];
const assigneeOpts = [
  { value: 'u1', label: 'Vikram Indla' },
  { value: 'u2', label: 'Yazeed Daraz' },
  { value: 'u3', label: 'Nada Alfassam' },
];

export default { title: 'Audit Grade/11 — Filter Bar' };

export const NoFilters: StoryObj = {
  render: () => <Frame><JiraFilterAtlaskit value={{}} onChange={fn()} statuses={statusOpts as any} assignees={assigneeOpts as any} /></Frame>,
};
export const WithActiveFilters: StoryObj = {
  render: () => <Frame><JiraFilterAtlaskit value={{ status: ['todo', 'inprog'], assignee: ['u1'] } as any} onChange={fn()} statuses={statusOpts as any} assignees={assigneeOpts as any} /></Frame>,
};
export const WithAllOptions: StoryObj = {
  render: () => <Frame><JiraFilterAtlaskit value={{}} onChange={fn()} statuses={statusOpts as any} assignees={assigneeOpts as any} reporters={assigneeOpts as any} labels={[{ value: 'frontend', label: 'frontend' }, { value: 'backend', label: 'backend' }] as any} workTypes={[{ value: 'Story', label: 'Story' }, { value: 'Bug', label: 'Bug' }] as any} /></Frame>,
};
