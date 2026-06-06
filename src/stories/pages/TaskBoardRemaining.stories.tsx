/**
 * Pages/Tasks/Board Remaining — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { BoardKanban } from '@/modules/tasks/components/boards/BoardKanban';
import { KanbanBoard } from '@/modules/tasks/components/kanban/KanbanBoard';
import { PlannerBoardsPage } from '@/modules/tasks/components/boards/PlannerBoardsPage';
import { TaskDetailDrawer } from '@/modules/tasks/components/kanban/TaskDetailDrawer';
import { TaskListPage } from '@/modules/tasks/components/TaskList/TaskListPage';
import { TaskListPageV3 } from '@/modules/tasks/components/TaskList/TaskListPageV3';
import { TaskListTable } from '@/modules/tasks/components/TaskList/TaskListTable';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</MemoryRouter></QueryClientProvider></div>);
}

export default { title: 'Pages/Tasks/Board Remaining' };

export const BoardKanbanDefault: StoryObj = {
  name: 'BoardKanban / Default',
  render: () => <Wrap><BoardKanban  /></Wrap>,
}

export const PlannerBoardsPageDefault: StoryObj = {
  name: 'PlannerBoardsPage / Default',
  render: () => <Wrap><PlannerBoardsPage  /></Wrap>,
}

export const KanbanBoardDefault: StoryObj = {
  name: 'KanbanBoard / Default',
  render: () => <Wrap><KanbanBoard  /></Wrap>,
}

export const TaskDetailDrawerDefault: StoryObj = {
  name: 'TaskDetailDrawer / Default',
  render: () => <Wrap><TaskDetailDrawer task=null open=true onOpenChange={fn()} /></Wrap>,
}

export const TaskDetailDrawerOpen: StoryObj = {
  name: 'TaskDetailDrawer / Open',
  render: () => <Wrap><TaskDetailDrawer task=null open=true onOpenChange={fn()} open={true} /></Wrap>,
}

export const TaskListPageDefault: StoryObj = {
  name: 'TaskListPage / Default',
  render: () => <Wrap><TaskListPage onTaskClick={fn()} onCreateTask={fn()} /></Wrap>,
}

export const TaskListPageV3Default: StoryObj = {
  name: 'TaskListPageV3 / Default',
  render: () => <Wrap><TaskListPageV3 onTaskClick={fn()} onCreateTask={fn()} /></Wrap>,
}

export const TaskListTableDefault: StoryObj = {
  name: 'TaskListTable / Default',
  render: () => <Wrap><TaskListTable tasks=[] isLoading=false sorting={{{}}} onSortChange={fn()} selectedIds={{{}}} onSelectionChange={fn()} onTaskClick={fn()} onTaskDelete={fn()} visibleColumns={{{}}} groupBy={{{}}} /></Wrap>,
}

export const TaskListTableLoading: StoryObj = {
  name: 'TaskListTable / Loading',
  render: () => <Wrap><TaskListTable tasks=[] isLoading=false sorting={{{}}} onSortChange={fn()} selectedIds={{{}}} onSelectionChange={fn()} onTaskClick={fn()} onTaskDelete={fn()} visibleColumns={{{}}} groupBy={{{}}} /></Wrap>,
}
