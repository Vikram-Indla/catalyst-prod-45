// Calendar Types for Test Cycles

export type CalendarView = 'month' | 'week' | 'day';

export type CalendarEventStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'passed' 
  | 'failed' 
  | 'blocked';

export type CalendarEventPriority = 'critical' | 'high' | 'medium' | 'low';

export interface CalendarEvent {
  id: string;
  testCaseId: string;
  code: string;
  title: string;
  module: string;
  dueDate: Date;
  status: CalendarEventStatus;
  priority: CalendarEventPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  estimatedDurationMinutes: number;
}

export interface CalendarMilestone {
  id: string;
  name: string;
  type: 'start' | 'end';
  date: Date;
}

export interface CalendarFilters {
  assignees: string[];
  statuses: CalendarEventStatus[];
  priorities: CalendarEventPriority[];
  modules: string[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CycleInfo {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

export interface TeamAvailability {
  userId: string;
  userName: string;
  date: Date;
  isAvailable: boolean;
  availableHours: number;
  notes: string | null;
}

export interface RescheduleParams {
  testId: string;
  newDate: Date;
}

export interface BulkRescheduleParams {
  testIds: string[];
  shiftDays?: number;
  fromRange?: DateRange;
  toRange?: DateRange;
}

export interface DaySummary {
  date: Date;
  totalTests: number;
  byStatus: Record<CalendarEventStatus, number>;
  byAssignee: { id: string; name: string; count: number }[];
  overdueCount: number;
}

// Status color mapping using Catalyst V5 colors
export const STATUS_CALENDAR_COLORS: Record<CalendarEventStatus, { bg: string; border: string; text: string }> = {
  passed: { bg: 'bg-[var(--ds-background-success)]', border: 'border-[var(--ds-chart-teal-bold)]', text: 'text-[var(--ds-chart-teal-bold)]' },
  failed: { bg: 'bg-[var(--ds-background-danger)]', border: 'border-[var(--ds-background-danger-bold)]', text: 'text-[var(--ds-background-danger-bold)]' },
  blocked: { bg: 'bg-[var(--ds-background-warning)]', border: 'border-[var(--ds-background-warning-bold)]', text: 'text-[var(--ds-background-warning-bold)]' },
  in_progress: { bg: 'bg-[var(--ds-background-information)]', border: 'border-[var(--cp-workstream-catalyst-primary)]', text: 'text-[var(--cp-workstream-catalyst-primary)]' },
  not_started: { bg: 'bg-[var(--ds-surface-sunken)]', border: 'border-[var(--ds-border)]', text: 'text-[var(--ds-text-subtlest)]' },
};

export const PRIORITY_COLORS: Record<CalendarEventPriority, string> = {
  critical: 'bg-[var(--ds-background-danger)] text-[var(--ds-background-danger-bold)]',
  high: 'bg-[var(--ds-background-warning)] text-[var(--ds-background-warning-bold)]',
  medium: 'bg-[var(--ds-background-information)] text-[var(--cp-workstream-catalyst-primary)]',
  low: 'bg-[var(--ds-surface-sunken)] text-[var(--ds-text-subtlest)]',
};

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  assignees: [],
  statuses: [],
  priorities: [],
  modules: [],
};
