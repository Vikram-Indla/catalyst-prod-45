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
  passed: { bg: 'bg-[#ccfbf1]', border: 'border-[#0d9488]', text: 'text-[#0d9488]' },
  failed: { bg: 'bg-[#fee2e2]', border: 'border-[#ef4444]', text: 'text-[#ef4444]' },
  blocked: { bg: 'bg-[#fef3c7]', border: 'border-[#d97706]', text: 'text-[#d97706]' },
  in_progress: { bg: 'bg-[#dbeafe]', border: 'border-[#2563eb]', text: 'text-[#2563eb]' },
  not_started: { bg: 'bg-[#f1f5f9]', border: 'border-[#cbd5e1]', text: 'text-[#64748b]' },
};

export const PRIORITY_COLORS: Record<CalendarEventPriority, string> = {
  critical: 'bg-[#fee2e2] text-[#ef4444]',
  high: 'bg-[#fef3c7] text-[#d97706]',
  medium: 'bg-[#dbeafe] text-[#2563eb]',
  low: 'bg-[#f1f5f9] text-[#64748b]',
};

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  assignees: [],
  statuses: [],
  priorities: [],
  modules: [],
};
