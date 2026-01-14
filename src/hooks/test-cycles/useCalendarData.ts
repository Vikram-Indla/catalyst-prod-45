import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isWithinInterval } from 'date-fns';
import type { CalendarEvent, CalendarFilters, DateRange, CycleInfo, CalendarMilestone } from '@/types/calendar.types';

// Mock data generator for calendar events
function generateMockEvents(dateRange: DateRange, cycleInfo: CycleInfo): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const modules = ['Login', 'Dashboard', 'Payments', 'Reports', 'User Management'];
  const statuses: CalendarEvent['status'][] = ['not_started', 'in_progress', 'passed', 'failed', 'blocked'];
  const priorities: CalendarEvent['priority'][] = ['critical', 'high', 'medium', 'low'];
  const assignees = [
    { id: '1', name: 'Ahmed S.', avatar: null },
    { id: '2', name: 'Sara M.', avatar: null },
    { id: '3', name: 'Omar K.', avatar: null },
    { id: '4', name: 'Fatima R.', avatar: null },
  ];

  // Generate events for dates within cycle range
  const cycleStart = cycleInfo.startDate;
  const cycleEnd = cycleInfo.endDate;
  const currentDate = new Date(cycleStart);

  let testCounter = 1;
  while (currentDate <= cycleEnd && currentDate <= dateRange.end) {
    if (currentDate >= dateRange.start) {
      // Add 2-8 tests per day
      const testsPerDay = Math.floor(Math.random() * 7) + 2;
      for (let i = 0; i < testsPerDay; i++) {
        const assignee = assignees[Math.floor(Math.random() * assignees.length)];
        events.push({
          id: `ctc-${testCounter}`,
          testCaseId: `tc-${testCounter}`,
          code: `TC-${String(testCounter).padStart(3, '0')}`,
          title: `Test Case ${testCounter} - ${modules[Math.floor(Math.random() * modules.length)]} Validation`,
          module: modules[Math.floor(Math.random() * modules.length)],
          dueDate: new Date(currentDate),
          status: statuses[Math.floor(Math.random() * statuses.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          assigneeAvatar: assignee.avatar,
          estimatedDurationMinutes: Math.floor(Math.random() * 60) + 15,
        });
        testCounter++;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return events;
}

export function useCalendarData(
  cycleId: string,
  dateRange: DateRange,
  filters: CalendarFilters
) {
  return useQuery({
    queryKey: ['calendar-data', cycleId, dateRange.start.toISOString(), dateRange.end.toISOString(), filters],
    queryFn: async () => {
      // Mock cycle info
      const cycleInfo: CycleInfo = {
        id: cycleId,
        name: 'Regression Cycle R2.1',
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-01-24'),
        status: 'active',
      };

      // Generate mock events
      let events = generateMockEvents(dateRange, cycleInfo);

      // Apply filters
      if (filters.assignees.length > 0) {
        events = events.filter(e => e.assigneeId && filters.assignees.includes(e.assigneeId));
      }
      if (filters.statuses.length > 0) {
        events = events.filter(e => filters.statuses.includes(e.status));
      }
      if (filters.priorities.length > 0) {
        events = events.filter(e => filters.priorities.includes(e.priority));
      }
      if (filters.modules.length > 0) {
        events = events.filter(e => filters.modules.includes(e.module));
      }

      // Group by date
      const eventsByDate = new Map<string, CalendarEvent[]>();
      events.forEach(event => {
        const key = format(event.dueDate, 'yyyy-MM-dd');
        if (!eventsByDate.has(key)) eventsByDate.set(key, []);
        eventsByDate.get(key)!.push(event);
      });

      // Create milestones
      const milestones: CalendarMilestone[] = [
        { id: `${cycleId}-start`, name: 'Cycle Start', type: 'start', date: cycleInfo.startDate },
        { id: `${cycleId}-end`, name: 'Cycle End', type: 'end', date: cycleInfo.endDate },
      ];

      return {
        events,
        eventsByDate,
        cycleInfo,
        milestones,
      };
    },
  });
}

export function useCalendarFilters() {
  // Mock filter options
  const filterOptions = {
    assignees: [
      { id: '1', name: 'Ahmed S.' },
      { id: '2', name: 'Sara M.' },
      { id: '3', name: 'Omar K.' },
      { id: '4', name: 'Fatima R.' },
    ],
    statuses: [
      { value: 'not_started', label: 'Not Started' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'passed', label: 'Passed' },
      { value: 'failed', label: 'Failed' },
      { value: 'blocked', label: 'Blocked' },
    ],
    modules: ['Login', 'Dashboard', 'Payments', 'Reports', 'User Management'],
  };

  return { filterOptions };
}
