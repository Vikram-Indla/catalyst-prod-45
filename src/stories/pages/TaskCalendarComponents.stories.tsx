/**
 * Pages/Tasks/Calendar Components — auto-generated Storybook coverage
 */
import React from 'react';
import type { StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { fn } from '@storybook/test';

import { ActiveFilterChips } from '@/modules/tasks/components/calendar/ActiveFilterChips';
import { CalendarCell } from '@/modules/tasks/components/calendar/CalendarCell';
import { CalendarHeader } from '@/modules/tasks/components/calendar/CalendarHeader';
import { CalendarLegend } from '@/modules/tasks/components/calendar/CalendarLegend';
import { CapacityPanel } from '@/modules/tasks/components/calendar/CapacityPanel';
import { QuickAddPopover } from '@/modules/tasks/components/calendar/QuickAddPopover';
import { TaskContextMenu } from '@/modules/tasks/components/calendar/TaskContextMenu';
import { TaskHoverCard } from '@/modules/tasks/components/calendar/TaskHoverCard';

function Wrap({ children }: { children: React.ReactNode }) {
  return (<MemoryRouter><div style={{ maxWidth: 900, padding: 16 }}>{children}</MemoryRouter></div>);
}

export default { title: 'Pages/Tasks/Calendar Components' };

export const ActiveFilterChipsDefault: StoryObj = {
  name: 'ActiveFilterChips / Default',
  render: () => <Wrap><ActiveFilterChips filters=[] onRemove={fn()} onClearAll={fn()} /></Wrap>,
}

export const CalendarCellDefault: StoryObj = {
  name: 'CalendarCell / Default',
  render: () => <Wrap><CalendarCell date={{{}}} tasks=[] isCurrentMonth=false isToday=false isWeekend=false isSelected=false onTaskClick={fn()} onDateClick={fn()} onTaskDrop={fn()} onQuickAdd={fn()} /></Wrap>,
}

export const CalendarHeaderDefault: StoryObj = {
  name: 'CalendarHeader / Default',
  render: () => <Wrap><CalendarHeader currentDate={{{}}} view={{{}}} onViewChange={fn()} onPrevPeriod={fn()} onNextPeriod={fn()} onToday={fn()} /></Wrap>,
}

export const CalendarLegendDefault: StoryObj = {
  name: 'CalendarLegend / Default',
  render: () => <Wrap><CalendarLegend  /></Wrap>,
}

export const CapacityPanelDefault: StoryObj = {
  name: 'CapacityPanel / Default',
  render: () => <Wrap><CapacityPanel visible=true weekStart={{{}}} teamMembers=[] tasks=[] /></Wrap>,
}

export const QuickAddPopoverDefault: StoryObj = {
  name: 'QuickAddPopover / Default',
  render: () => <Wrap><QuickAddPopover date={{{}}} isOpen=true onOpenChange={fn()} trigger={{<span>Content</span>}} /></Wrap>,
}

export const QuickAddPopoverOpen: StoryObj = {
  name: 'QuickAddPopover / Open',
  render: () => <Wrap><QuickAddPopover date={{{}}} isOpen=true onOpenChange={fn()} trigger={{<span>Content</span>}} /></Wrap>,
}

export const TaskContextMenuDefault: StoryObj = {
  name: 'TaskContextMenu / Default',
  render: () => <Wrap><TaskContextMenu task={{{}}} position={{{}}} /></Wrap>,
}

export const TaskHoverCardDefault: StoryObj = {
  name: 'TaskHoverCard / Default',
  render: () => <Wrap><TaskHoverCard task={{{}}} anchorEl={{{}}} onClose={fn()} /></Wrap>,
}
