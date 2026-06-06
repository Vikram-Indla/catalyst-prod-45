/**
 * Pages/Tasks/Create Modal — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { AssigneeSelect } from '@/modules/tasks/components/CreateTaskModal/fields/AssigneeSelect';
import { CreateTaskModal } from '@/modules/tasks/components/CreateTaskModal/CreateTaskModal';
import { PlannerTaskList } from '@/modules/tasks/components/PlannerTaskList';
import { PlannerTimeline } from '@/modules/tasks/components/PlannerTimeline';
import { PrioritySelect } from '@/modules/tasks/components/CreateTaskModal/fields/PrioritySelect';
import { WorkstreamSelect } from '@/modules/tasks/components/CreateTaskModal/fields/WorkstreamSelect';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</QueryClientProvider></MemoryRouter></div>);
}

export default { title: 'Pages/Tasks/Create Modal' };

export const CreateTaskModalDefault: StoryObj = {
  name: 'CreateTaskModal / Default',
  render: () => <Wrap><CreateTaskModal open=true onOpenChange={fn()} /></Wrap>,
}

export const CreateTaskModalOpen: StoryObj = {
  name: 'CreateTaskModal / Open',
  render: () => <Wrap><CreateTaskModal open=true onOpenChange={fn()} open={true} /></Wrap>,
}

export const AssigneeSelectDefault: StoryObj = {
  name: 'AssigneeSelect / Default',
  render: () => <Wrap><AssigneeSelect value="test-value" onChange={fn()} /></Wrap>,
}

export const PrioritySelectDefault: StoryObj = {
  name: 'PrioritySelect / Default',
  render: () => <Wrap><PrioritySelect value={{{}}} onChange={fn()} /></Wrap>,
}

export const WorkstreamSelectDefault: StoryObj = {
  name: 'WorkstreamSelect / Default',
  render: () => <Wrap><WorkstreamSelect value="test-value" onChange={fn()} /></Wrap>,
}

export const PlannerTaskListDefault: StoryObj = {
  name: 'PlannerTaskList / Default',
  render: () => <Wrap><PlannerTaskList tasks=[] onTaskClick={fn()} onTaskUpdate={fn()} selectedTaskIds={{{}}} onSelectionChange={fn()} visibleColumns={{{}}} /></Wrap>,
}

export const PlannerTimelineDefault: StoryObj = {
  name: 'PlannerTimeline / Default',
  render: () => <Wrap><PlannerTimeline  /></Wrap>,
}
