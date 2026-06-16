/**
 * Pages/Tasks/Kanban Components — realistic mocks matching app usage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { fn } from 'storybook/test';

import { AddColumnButton } from '@/modules/tasks/components/kanban/AddColumnButton';
import { AssigneeAvatar } from '@/modules/tasks/components/kanban/AssigneeAvatar';
import { DueDateBadge } from '@/modules/tasks/components/kanban/DueDateBadge';
import { KanbanCard } from '@/modules/tasks/components/kanban/KanbanCard';
import { KanbanColumn } from '@/modules/tasks/components/kanban/KanbanColumn';
import { KanbanFilters } from '@/modules/tasks/components/kanban/KanbanFilters';
import { PriorityBadge } from '@/modules/tasks/components/kanban/PriorityBadge';
import { SwimlaneCard } from '@/modules/tasks/components/kanban/SwimlaneCard';
import { SwimlaneRow } from '@/modules/tasks/components/kanban/SwimlaneRow';
import { WorkstreamBadge } from '@/modules/tasks/components/kanban/WorkstreamBadge';

import {
  MOCK_STATUSES,
  MOCK_TASKS,
  MOCK_PROFILES,
  MOCK_WORKSTREAMS,
  MOCK_FILTERS,
} from '@/stories/fixtures/kanban';

function Wrap({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ maxWidth: wide ? 1200 : 900, padding: 16 }}>{children}</div>
  );
}

// Kanban column/card use dnd-kit hooks (useDroppable + useSortable)
// which require a DndContext + SortableContext ancestor.
function DndWrap({ children, items }: { children: React.ReactNode; items: string[] }) {
  return (
    <DndContext>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export default { title: 'Pages/Tasks/Kanban Components' };

export const AddColumnButtonDefault: StoryObj = {
  name: 'AddColumnButton / Default',
  render: () => <Wrap><AddColumnButton /></Wrap>,
};

export const AssigneeAvatarDefault: StoryObj = {
  name: 'AssigneeAvatar / Default',
  render: () => (
    <Wrap>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <AssigneeAvatar profile={MOCK_PROFILES[0]} />
        <AssigneeAvatar profile={MOCK_PROFILES[1]} showName />
        <AssigneeAvatar profile={null} />
      </div>
    </Wrap>
  ),
};

export const DueDateBadgeDefault: StoryObj = {
  name: 'DueDateBadge / Default',
  render: () => (
    <Wrap>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <DueDateBadge dueDate="2026-06-25" />
        <DueDateBadge dueDate="2026-06-10" />
        <DueDateBadge dueDate={null} />
        <DueDateBadge dueDate="2026-06-10" isCompleted />
      </div>
    </Wrap>
  ),
};

export const KanbanCardDefault: StoryObj = {
  name: 'KanbanCard / Default',
  render: () => (
    <Wrap>
      <DndWrap items={MOCK_TASKS.map((t) => t.id)}>
        <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
          {MOCK_TASKS.slice(0, 3).map((task) => (
            <KanbanCard key={task.id} task={task} onClick={fn()} onEdit={fn()} onDelete={fn()} />
          ))}
        </div>
      </DndWrap>
    </Wrap>
  ),
};

export const KanbanColumnDefault: StoryObj = {
  name: 'KanbanColumn / Default',
  render: () => {
    const status = MOCK_STATUSES[2]; // In progress
    const tasks = MOCK_TASKS.filter((t) => t.status_id === status.id);
    return (
      <Wrap wide>
        <DndWrap items={[`column-${status.id}`, ...tasks.map((t) => t.id)]}>
          <div style={{ width: 320 }}>
            <KanbanColumn
              status={status}
              tasks={tasks}
              onTaskClick={fn()}
              onTaskEdit={fn()}
              onTaskDelete={fn()}
              onAddTask={fn()}
            />
          </div>
        </DndWrap>
      </Wrap>
    );
  },
};

export const KanbanColumnEmpty: StoryObj = {
  name: 'KanbanColumn / Empty',
  render: () => {
    const status = MOCK_STATUSES[0]; // Backlog
    return (
      <Wrap wide>
        <DndWrap items={[`column-${status.id}`]}>
          <div style={{ width: 320 }}>
            <KanbanColumn status={status} tasks={[]} onAddTask={fn()} />
          </div>
        </DndWrap>
      </Wrap>
    );
  },
};

export const KanbanFiltersDefault: StoryObj = {
  name: 'KanbanFilters / Default',
  render: () => (
    <Wrap wide>
      <KanbanFilters
        filters={MOCK_FILTERS}
        onFilterChange={fn()}
        taskCount={MOCK_TASKS.length}
        swimlane="none"
        onSwimlaneChange={fn()}
        viewMode="board"
        onViewModeChange={fn()}
      />
    </Wrap>
  ),
};

export const PriorityBadgeDefault: StoryObj = {
  name: 'PriorityBadge / Default',
  render: () => (
    <Wrap>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PriorityBadge priority="critical" />
        <PriorityBadge priority="high" />
        <PriorityBadge priority="medium" />
        <PriorityBadge priority="low" />
      </div>
    </Wrap>
  ),
};

export const SwimlaneCardDefault: StoryObj = {
  name: 'SwimlaneCard / Default',
  render: () => (
    <Wrap>
      <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
        {MOCK_TASKS.slice(0, 3).map((task) => (
          <SwimlaneCard key={task.id} task={task} onClick={fn()} />
        ))}
      </div>
    </Wrap>
  ),
};

export const SwimlaneRowDefault: StoryObj = {
  name: 'SwimlaneRow / Default',
  render: () => (
    <Wrap wide>
      <SwimlaneRow
        groupKey={MOCK_PROFILES[0].id}
        groupLabel={MOCK_PROFILES[0].full_name ?? 'Unassigned'}
        tasks={MOCK_TASKS.filter((t) => t.assignee_id === MOCK_PROFILES[0].id)}
        statuses={MOCK_STATUSES}
        isCollapsed={false}
        onToggleCollapse={fn()}
        onTaskClick={fn()}
        swimlaneType="assignee"
      />
    </Wrap>
  ),
};

export const WorkstreamBadgeDefault: StoryObj = {
  name: 'WorkstreamBadge / Default',
  render: () => (
    <Wrap>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {MOCK_WORKSTREAMS.map((ws) => (
          <WorkstreamBadge key={ws.id} workstream={ws} />
        ))}
      </div>
    </Wrap>
  ),
};
