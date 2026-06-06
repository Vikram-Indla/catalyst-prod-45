/**
 * Pages/Tasks/Other — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

import { AddColumnModal } from '@/modules/tasks/components/AddColumnModal';
import { BulkActionBar } from '@/modules/tasks/components/task-list/BulkActionBar';
import { ChecklistIndicator } from '@/modules/tasks/components/ChecklistIndicator';
import { CompletedTodaySection } from '@/modules/tasks/components/my-tasks/CompletedTodaySection';
import { DailyScorecardView } from '@/modules/tasks/components/insights/DailyScorecardView';
import { InlineDatePicker } from '@/modules/tasks/components/task-list/InlineDatePicker';
import { MonthlyChronicleView } from '@/modules/tasks/components/insights/MonthlyChronicleView';
import { MyTasksHeader } from '@/modules/tasks/components/my-tasks/MyTasksHeader';
import { PlannerBulkActionBar } from '@/modules/tasks/components/PlannerBulkActionBar';
import { PlannerBulkDeleteModal } from '@/modules/tasks/components/PlannerBulkDeleteModal';
import { PlannerCreateModal } from '@/modules/tasks/components/PlannerCreateModal';
import { PlannerCreateTeamModal } from '@/modules/tasks/components/PlannerCreateTeamModal';
import { PlannerSearchBar } from '@/modules/tasks/components/PlannerSearchBar';
import { PlannerSettings } from '@/modules/tasks/components/PlannerSettings';
import { PlannerViewHeader } from '@/modules/tasks/components/shared/PlannerViewHeader';
import { RowActions } from '@/modules/tasks/components/task-list/RowActions';
import { TaskChecklist } from '@/modules/tasks/components/TaskChecklist';
import { TaskSection } from '@/modules/tasks/components/my-tasks/TaskSection';
import { TodayLine } from '@/modules/tasks/components/timeline/TodayLine';
import { WeeklySummaryView } from '@/modules/tasks/components/insights/WeeklySummaryView';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</MemoryRouter></QueryClientProvider></div>);
}

export default { title: 'Pages/Tasks/Other' };

export const AddColumnModalDefault: StoryObj = {
  name: 'AddColumnModal / Default',
  render: () => <Wrap><AddColumnModal isOpen=true onClose={fn()} onAdd={fn()} existingColumns=[] /></Wrap>,
}

export const AddColumnModalOpen: StoryObj = {
  name: 'AddColumnModal / Open',
  render: () => <Wrap><AddColumnModal isOpen=true onClose={fn()} onAdd={fn()} existingColumns=[] /></Wrap>,
}

export const ChecklistIndicatorDefault: StoryObj = {
  name: 'ChecklistIndicator / Default',
  render: () => <Wrap><ChecklistIndicator storyId="item-1" /></Wrap>,
}

export const PlannerBulkActionBarDefault: StoryObj = {
  name: 'PlannerBulkActionBar / Default',
  render: () => <Wrap><PlannerBulkActionBar selectedCount=5 onClearSelection={fn()} onBulkDelete={fn()} /></Wrap>,
}

export const PlannerBulkDeleteModalDefault: StoryObj = {
  name: 'PlannerBulkDeleteModal / Default',
  render: () => <Wrap><PlannerBulkDeleteModal isOpen=true onClose={fn()} onConfirm={fn()} selectedCount=5 /></Wrap>,
}

export const PlannerBulkDeleteModalOpen: StoryObj = {
  name: 'PlannerBulkDeleteModal / Open',
  render: () => <Wrap><PlannerBulkDeleteModal isOpen=true onClose={fn()} onConfirm={fn()} selectedCount=5 /></Wrap>,
}

export const PlannerSearchBarDefault: StoryObj = {
  name: 'PlannerSearchBar / Default',
  render: () => <Wrap><PlannerSearchBar filters={{{}}} onSearchChange={fn()} onStatusChange={fn()} onPriorityChange={fn()} onBlockedChange={fn()} onOverdueChange={fn()} onClearFilters={fn()} hasActiveFilters=true filteredCount=5 totalCount=5 selectedTeamId="test-value" onTeamChange={fn()} /></Wrap>,
}

export const PlannerSettingsDefault: StoryObj = {
  name: 'PlannerSettings / Default',
  render: () => <Wrap><PlannerSettings  /></Wrap>,
}

export const PlannerCreateModalDefault: StoryObj = {
  name: 'PlannerCreateModal / Default',
  render: () => <Wrap><PlannerCreateModal isOpen=true onClose={fn()} onCreate={fn()} /></Wrap>,
}

export const PlannerCreateModalOpen: StoryObj = {
  name: 'PlannerCreateModal / Open',
  render: () => <Wrap><PlannerCreateModal isOpen=true onClose={fn()} onCreate={fn()} /></Wrap>,
}

export const PlannerCreateTeamModalDefault: StoryObj = {
  name: 'PlannerCreateTeamModal / Default',
  render: () => <Wrap><PlannerCreateTeamModal isOpen=true onClose={fn()} onCreate={{{}}} name="Vikram Indla" emoji="test-value" color="test-value" memberIds=[] /></Wrap>,
}

export const PlannerCreateTeamModalOpen: StoryObj = {
  name: 'PlannerCreateTeamModal / Open',
  render: () => <Wrap><PlannerCreateTeamModal isOpen=true onClose={fn()} onCreate={{{}}} name="Vikram Indla" emoji="test-value" color="test-value" memberIds=[] /></Wrap>,
}

export const TaskChecklistDefault: StoryObj = {
  name: 'TaskChecklist / Default',
  render: () => <Wrap><TaskChecklist taskId="item-1" taskTitle="Sample item title" /></Wrap>,
}

export const PlannerViewHeaderDefault: StoryObj = {
  name: 'PlannerViewHeader / Default',
  render: () => <Wrap><PlannerViewHeader title="Sample item title" subtitle="Sample item title" /></Wrap>,
}

export const BulkActionBarDefault: StoryObj = {
  name: 'BulkActionBar / Default',
  render: () => <Wrap><BulkActionBar selectedIds=[] selectedCount=5 onClearSelection={fn()} /></Wrap>,
}

export const InlineDatePickerDefault: StoryObj = {
  name: 'InlineDatePicker / Default',
  render: () => <Wrap><InlineDatePicker value=null onChange={fn()} /></Wrap>,
}

export const RowActionsDefault: StoryObj = {
  name: 'RowActions / Default',
  render: () => <Wrap><RowActions taskId="item-1" onEdit={fn()} onDuplicate={fn()} onDelete={fn()} /></Wrap>,
}

export const TodayLineDefault: StoryObj = {
  name: 'TodayLine / Default',
  render: () => <Wrap><TodayLine position=42 /></Wrap>,
}

export const CompletedTodaySectionDefault: StoryObj = {
  name: 'CompletedTodaySection / Default',
  render: () => <Wrap><CompletedTodaySection tasks=[] onOpenDetail={fn()} /></Wrap>,
}

export const MyTasksHeaderDefault: StoryObj = {
  name: 'MyTasksHeader / Default',
  render: () => <Wrap><MyTasksHeader filters={{{}}} onFilterChange={fn()} onOpenCreateModal={fn()} /></Wrap>,
}

export const TaskSectionDefault: StoryObj = {
  name: 'TaskSection / Default',
  render: () => <Wrap><TaskSection title="Sample item title" color="test-value" tasks=[] onOpenDetail={fn()} /></Wrap>,
}

export const DailyScorecardViewDefault: StoryObj = {
  name: 'DailyScorecardView / Default',
  render: () => <Wrap><DailyScorecardView  /></Wrap>,
}

export const MonthlyChronicleViewDefault: StoryObj = {
  name: 'MonthlyChronicleView / Default',
  render: () => <Wrap><MonthlyChronicleView  /></Wrap>,
}

export const WeeklySummaryViewDefault: StoryObj = {
  name: 'WeeklySummaryView / Default',
  render: () => <Wrap><WeeklySummaryView  /></Wrap>,
}
