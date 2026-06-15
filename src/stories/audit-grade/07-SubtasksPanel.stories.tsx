
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

import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';

export default { title: 'Audit Grade/07 — Subtasks Panel' };

export const StoryParent: StoryObj = {
  render: () => <Frame width={800}><SubtasksPanel storyKey="BAU-5972" storyId="ph-001" projectKey="BAU" onSubtaskClick={fn()} parentIssueType="Story" parentSummary="Industrial Capabilities: Add Item" /></Frame>,
};
export const EpicParent: StoryObj = {
  render: () => <Frame width={800}><SubtasksPanel storyKey="BAU-5400" storyId="ph-002" projectKey="BAU" onSubtaskClick={fn()} parentIssueType="Epic" parentSummary="Industrial Capabilities Module" /></Frame>,
};
export const SubtaskParent: StoryObj = {
  name: 'Sub-task (creation disabled)',
  render: () => <Frame width={800}><SubtasksPanel storyKey="BAU-6001" storyId="ph-003" projectKey="BAU" onSubtaskClick={fn()} parentIssueType="Sub-task" parentSummary="Fix input validation" /></Frame>,
};
export const CustomTitle: StoryObj = {
  render: () => <Frame width={800}><SubtasksPanel storyKey="BAU-5400" storyId="ph-002" projectKey="BAU" onSubtaskClick={fn()} parentIssueType="Epic" title="Child work items" /></Frame>,
};
