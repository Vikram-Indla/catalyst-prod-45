/**
 * Pages/Tasks/Calendar Components — realistic mocks matching app usage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ActiveFilterChips } from '@/modules/tasks/components/calendar/ActiveFilterChips';
import { CalendarCell } from '@/modules/tasks/components/calendar/CalendarCell';
import { CalendarHeader } from '@/modules/tasks/components/calendar/CalendarHeader';
import { CalendarLegend } from '@/modules/tasks/components/calendar/CalendarLegend';
import { CapacityPanel } from '@/modules/tasks/components/calendar/CapacityPanel';
import { QuickAddPopover } from '@/modules/tasks/components/calendar/QuickAddPopover';
import { TaskContextMenu } from '@/modules/tasks/components/calendar/TaskContextMenu';
import { TaskHoverCard } from '@/modules/tasks/components/calendar/TaskHoverCard';

import { MOCK_PLANNER_TASKS } from '@/stories/fixtures/planner';

const TODAY = new Date('2026-06-14T10:00:00.000Z');
const WEEK_START = new Date('2026-06-08T00:00:00.000Z');

const CALENDAR_STATUSES = [
  { id: 'todo', name: 'To do', color: 'var(--ds-text-subtlest, #626F86)' },
  { id: 'in_progress', name: 'In progress', color: 'var(--ds-background-warning-bold, #d97706)' },
  { id: 'in_review', name: 'In review', color: 'var(--ds-icon-information, #1D7AFC)' },
  { id: 'done', name: 'Done', color: 'var(--ds-background-success-bold, #1F845A)' },
];

const CALENDAR_USERS = [
  { id: 'p-vikram', name: 'Vikram Indla', initials: 'VI' },
  { id: 'p-nada', name: 'Nada Alfassam', initials: 'NA' },
  { id: 'p-ahmed', name: 'Ahmed Yousry', initials: 'AY' },
];

const TEAM_MEMBERS = CALENDAR_USERS.map((u) => ({ ...u, avatarColor: 'var(--ds-link, #2563eb)' }));

function Wrap({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div style={{ maxWidth: wide ? 1200 : 900, padding: 16 }}>{children}</div>;
}

export default { title: 'Pages/Tasks/Calendar Components' };

export const ActiveFilterChipsDefault: StoryObj = {
  name: 'ActiveFilterChips / Default',
  render: () => (
    <Wrap wide>
      <ActiveFilterChips
        filters={[
          { id: 'f-1', label: 'Status', value: 'In progress', color: 'var(--ds-background-warning-bold, #d97706)' },
          { id: 'f-2', label: 'Assignee', value: 'Vikram Indla' },
          { id: 'f-3', label: 'Priority', value: 'High', color: 'var(--ds-background-danger-bold, #ef4444)' },
        ]}
        onRemove={fn()}
        onClearAll={fn()}
      />
    </Wrap>
  ),
};

export const CalendarCellDefault: StoryObj = {
  name: 'CalendarCell / Default',
  render: () => (
    <Wrap>
      <div style={{ width: 180, height: 140, border: '1px solid var(--ds-border, #DFE1E6)' }}>
        <CalendarCell
          date={TODAY}
          tasks={MOCK_PLANNER_TASKS}
          isCurrentMonth={true}
          isToday={true}
          isWeekend={false}
          isSelected={false}
          onTaskClick={fn()}
          onDateClick={fn()}
          onTaskDrop={fn()}
          onQuickAdd={fn()}
          statuses={CALENDAR_STATUSES}
          users={CALENDAR_USERS}
        />
      </div>
    </Wrap>
  ),
};

export const CalendarHeaderDefault: StoryObj = {
  name: 'CalendarHeader / Default',
  render: () => (
    <Wrap wide>
      <CalendarHeader
        currentDate={TODAY}
        view="month"
        onViewChange={fn()}
        onPrevPeriod={fn()}
        onNextPeriod={fn()}
        onToday={fn()}
      />
    </Wrap>
  ),
};

export const CalendarLegendDefault: StoryObj = {
  name: 'CalendarLegend / Default',
  render: () => (
    <Wrap>
      <CalendarLegend
        workstreams={[
          { name: 'Platform', color: 'var(--ds-link, #2563eb)' },
          { name: 'CATY AI', color: 'var(--ds-background-discovery-bold, #6E5DC6)' },
          { name: 'Mobile', color: 'var(--ds-icon-information, #1D7AFC)' },
        ]}
      />
    </Wrap>
  ),
};

export const CapacityPanelDefault: StoryObj = {
  name: 'CapacityPanel / Default',
  render: () => (
    <Wrap wide>
      <CapacityPanel
        visible={true}
        weekStart={WEEK_START}
        teamMembers={TEAM_MEMBERS}
        tasks={MOCK_PLANNER_TASKS}
        dailyCapacity={8}
      />
    </Wrap>
  ),
};

export const QuickAddPopoverDefault: StoryObj = {
  name: 'QuickAddPopover / Default',
  render: () => (
    <Wrap>
      <QuickAddPopover
        date={TODAY}
        isOpen={false}
        onOpenChange={fn()}
        trigger={<button>Add task</button>}
      />
    </Wrap>
  ),
};

export const TaskContextMenuDefault: StoryObj = {
  name: 'TaskContextMenu / Default',
  render: () => (
    <Wrap>
      <div style={{ position: 'relative', height: 200 }}>
        <TaskContextMenu
          task={MOCK_PLANNER_TASKS[0]}
          position={{ x: 40, y: 40 }}
          onClose={fn()}
          onAction={fn()}
          statuses={CALENDAR_STATUSES}
          users={CALENDAR_USERS}
        />
      </div>
    </Wrap>
  ),
};

export const TaskHoverCardDefault: StoryObj = {
  name: 'TaskHoverCard / Default',
  render: () => {
    // TaskHoverCard expects an HTMLElement anchor. We render a target,
    // wait for next frame to grab the ref, then pass it in via state.
    const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
    return (
      <Wrap>
        <div
          ref={(el) => setAnchor(el)}
          style={{
            display: 'inline-block',
            padding: '8px 12px',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
          }}
        >
          Hover anchor
        </div>
        {anchor && (
          <TaskHoverCard task={MOCK_PLANNER_TASKS[0]} anchorEl={anchor} onClose={fn()} />
        )}
      </Wrap>
    );
  },
};
