/**
 * Pages/Tasks/Create Modal — Storybook coverage.
 * CAT-TASKS-20260627-001 Slice 8: removed the orphaned per-field stories
 * (AssigneeSelect/PrioritySelect/WorkstreamSelect were dead code — the
 * canonical CreateTaskModal builds its fields inline — and have been deleted).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Storybook prop stubs */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import { CreateTaskModal } from '@/modules/tasks/components/CreateTaskModal/CreateTaskModal';
import { PlannerTaskList } from '@/modules/tasks/components/PlannerTaskList';
import { PlannerTimeline } from '@/modules/tasks/components/PlannerTimeline';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Pages/Tasks/Create Modal' };

export const CreateTaskModalDefault: StoryObj = {
  name: 'CreateTaskModal / Default',
  render: () => <Wrap><CreateTaskModal open={true} onOpenChange={fn()} /></Wrap>,
};

export const PlannerTaskListDefault: StoryObj = {
  name: 'PlannerTaskList / Default',
  render: () => <Wrap><PlannerTaskList tasks={[]} onTaskClick={fn()} onTaskUpdate={fn()} selectedTaskIds={{} as any} onSelectionChange={fn()} visibleColumns={{} as any} /></Wrap>,
};

export const PlannerTimelineDefault: StoryObj = {
  name: 'PlannerTimeline / Default',
  render: () => <Wrap><PlannerTimeline /></Wrap>,
};
