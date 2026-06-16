/**
 * Pages/Tasks/List Components — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import { AssigneeDropdown } from '@/modules/tasks/components/TaskList/AssigneeDropdown';
import { ExportButton } from '@/modules/tasks/components/TaskList/ExportButton';
import { LabelsDropdown } from '@/modules/tasks/components/TaskList/LabelsDropdown';
import { PriorityDropdown } from '@/modules/tasks/components/TaskList/PriorityDropdown';
import { StatusDropdown } from '@/modules/tasks/components/TaskList/StatusDropdown';
import { TaskListHeader } from '@/modules/tasks/components/TaskList/TaskListHeader';
import { TaskListRowV3 } from '@/modules/tasks/components/TaskList/TaskListRowV3';
import { TaskListToolbar } from '@/modules/tasks/components/TaskList/TaskListToolbar';
import { TaskRow } from '@/modules/tasks/components/TaskList/TaskRow';
import { WorkstreamDropdown } from '@/modules/tasks/components/TaskList/WorkstreamDropdown';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><div style={{ maxWidth: 900, padding: 16 }}>{children}</div></QueryClientProvider>);
}

export default { title: 'Pages/Tasks/List Components' };

export const AssigneeDropdownDefault: StoryObj = {
  name: 'AssigneeDropdown / Default',
  render: () => <Wrap><AssigneeDropdown task={{} as any} users={{} as any} /></Wrap>,
}

export const ExportButtonDefault: StoryObj = {
  name: 'ExportButton / Default',
  render: () => <Wrap><ExportButton tasks={[]} /></Wrap>,
}

export const LabelsDropdownDefault: StoryObj = {
  name: 'LabelsDropdown / Default',
  render: () => <Wrap><LabelsDropdown task={{} as any} taskLabels={[]} width={{} as any} /></Wrap>,
}

export const PriorityDropdownDefault: StoryObj = {
  name: 'PriorityDropdown / Default',
  render: () => <Wrap><PriorityDropdown task={{} as any} width={{} as any} onUpdate={fn()} /></Wrap>,
}

export const StatusDropdownDefault: StoryObj = {
  name: 'StatusDropdown / Default',
  render: () => <Wrap><StatusDropdown task={{} as any} statuses={{} as any} /></Wrap>,
}

export const TaskListHeaderDefault: StoryObj = {
  name: 'TaskListHeader / Default',
  render: () => <Wrap><TaskListHeader totalCount={5} overdueCount={5} inProgressCount={5} doneCount={5} /></Wrap>,
}

export const TaskListHeaderLoading: StoryObj = {
  name: 'TaskListHeader / Loading',
  render: () => <Wrap><TaskListHeader totalCount={5} overdueCount={5} inProgressCount={5} doneCount={5} isLoading={true} /></Wrap>,
}

export const TaskListRowV3Default: StoryObj = {
  name: 'TaskListRowV3 / Default',
  render: () => <Wrap><TaskListRowV3 task={{} as any} index={42} isSelected={false} isFocused={false} onSelect={fn()} onClick={fn()} onUpdate={fn()} visibleColumns={{} as any} columnWidths={{} as any} statuses={{} as any} /></Wrap>,
}

export const TaskListToolbarDefault: StoryObj = {
  name: 'TaskListToolbar / Default',
  render: () => <Wrap><TaskListToolbar filters={{} as any} onFiltersChange={fn()} onSearch={fn()} onCreateTask={fn()} onExport={fn()} visibleColumns={{} as any} onColumnsChange={fn()} groupBy={{} as any} onGroupByChange={fn()} filteredCount={5} totalCount={5} /></Wrap>,
}

export const TaskRowDefault: StoryObj = {
  name: 'TaskRow / Default',
  render: () => <Wrap><TaskRow task={{} as any} index={42} isSelected={false} isFocused={false} onSelect={fn()} onClick={fn()} onDelete={fn()} visibleColumns={{} as any} /></Wrap>,
}

export const WorkstreamDropdownDefault: StoryObj = {
  name: 'WorkstreamDropdown / Default',
  render: () => <Wrap><WorkstreamDropdown task={{} as any} workstreamColors={{} as any} /></Wrap>,
}
