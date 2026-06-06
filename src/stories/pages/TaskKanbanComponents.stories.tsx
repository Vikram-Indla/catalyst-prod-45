/**
 * Pages/Tasks/Kanban Components — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { fn } from '@storybook/test';

import { AddColumnButton } from '@/modules/tasks/components/kanban/AddColumnButton';
import { AssigneeAvatar } from '@/modules/tasks/components/kanban/AssigneeAvatar';
import { DueDateBadge } from '@/modules/tasks/components/kanban/DueDateBadge';
import { KanbanColumn } from '@/modules/tasks/components/kanban/KanbanColumn';
import { KanbanFilters } from '@/modules/tasks/components/kanban/KanbanFilters';
import { PriorityBadge } from '@/modules/tasks/components/kanban/PriorityBadge';
import { SwimlaneCard } from '@/modules/tasks/components/kanban/SwimlaneCard';
import { SwimlaneRow } from '@/modules/tasks/components/kanban/SwimlaneRow';
import { WorkstreamBadge } from '@/modules/tasks/components/kanban/WorkstreamBadge';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</MemoryRouter></div>);
}

export default { title: 'Pages/Tasks/Kanban Components' };

export const AddColumnButtonDefault: StoryObj = {
  name: 'AddColumnButton / Default',
  render: () => <Wrap><AddColumnButton  /></Wrap>,
}

export const AssigneeAvatarDefault: StoryObj = {
  name: 'AssigneeAvatar / Default',
  render: () => <Wrap><AssigneeAvatar profile=null /></Wrap>,
}

export const DueDateBadgeDefault: StoryObj = {
  name: 'DueDateBadge / Default',
  render: () => <Wrap><DueDateBadge dueDate="test-value" /></Wrap>,
}

export const KanbanColumnDefault: StoryObj = {
  name: 'KanbanColumn / Default',
  render: () => <Wrap><KanbanColumn status={{{}}} tasks=[] /></Wrap>,
}

export const KanbanFiltersDefault: StoryObj = {
  name: 'KanbanFilters / Default',
  render: () => <Wrap><KanbanFilters filters={{{}}} onFilterChange={fn()} taskCount=5 swimlane={{{}}} onSwimlaneChange={fn()} viewMode={{{}}} onViewModeChange={fn()} /></Wrap>,
}

export const PriorityBadgeDefault: StoryObj = {
  name: 'PriorityBadge / Default',
  render: () => <Wrap><PriorityBadge priority={{{}}} /></Wrap>,
}

export const SwimlaneCardDefault: StoryObj = {
  name: 'SwimlaneCard / Default',
  render: () => <Wrap><SwimlaneCard task={{{}}} /></Wrap>,
}

export const SwimlaneRowDefault: StoryObj = {
  name: 'SwimlaneRow / Default',
  render: () => <Wrap><SwimlaneRow groupKey="BAU-5972" groupLabel="Sample item title" tasks=[] statuses=[] isCollapsed=false onToggleCollapse={fn()} swimlaneType={{{}}} /></Wrap>,
}

export const WorkstreamBadgeDefault: StoryObj = {
  name: 'WorkstreamBadge / Default',
  render: () => <Wrap><WorkstreamBadge workstream={{{}}} /></Wrap>,
}
