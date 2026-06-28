
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

import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

const ALL_TYPES = ['Story', 'Epic', 'Feature', 'Task', 'Sub-task', 'QA Bug', 'Defect', 'Production Incident', 'Change Request', 'Business Request', 'Business Gap', 'Backend', 'Frontend', 'Integration', 'Idea'];

export default { title: 'Audit Grade/16 — Issue Type Icons' };

export const AllTypes: StoryObj = {
  render: () => (
    <Frame width={600}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {ALL_TYPES.map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
            <JiraIssueTypeIcon type={t} size={20} />
            <span style={{ fontSize: 'var(--ds-font-size-400)' }}>{t}</span>
          </div>
        ))}
      </div>
    </Frame>
  ),
};
export const Size16: StoryObj = {
  render: () => (
    <Frame width={600}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {ALL_TYPES.slice(0, 8).map(t => <JiraIssueTypeIcon key={t} type={t} size={16} />)}
      </div>
    </Frame>
  ),
};
export const Size24: StoryObj = {
  render: () => (
    <Frame width={600}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {ALL_TYPES.slice(0, 8).map(t => <JiraIssueTypeIcon key={t} type={t} size={24} />)}
      </div>
    </Frame>
  ),
};
