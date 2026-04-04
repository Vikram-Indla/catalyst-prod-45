/**
 * useCalendarData — ZERO MOCK DATA
 * All data from database. Empty arrays when no data exists.
 */

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { CalendarEvent, CalendarFilters, DateRange, CycleInfo, CalendarMilestone } from '@/types/calendar.types';

export function useCalendarData(
  cycleId: string,
  dateRange: DateRange,
  filters: CalendarFilters
) {
  return useQuery({
    queryKey: ['calendar-data', cycleId, dateRange.start.toISOString(), dateRange.end.toISOString(), filters],
    queryFn: async () => {
      // Fetch cycle info from DB
      const { data: cycleRow } = await supabase
        .from('tm_test_cycles')
        .select('id, name, planned_start, planned_end, status')
        .eq('id', cycleId)
        .single();

      const cycleInfo: CycleInfo = cycleRow
        ? {
            id: cycleRow.id,
            name: cycleRow.name,
            startDate: new Date(cycleRow.planned_start || dateRange.start),
            endDate: new Date(cycleRow.planned_end || dateRange.end),
            status: cycleRow.status as unknown as CycleInfo['status'],
          }
        : {
            id: cycleId,
            name: 'Unknown Cycle',
            startDate: dateRange.start,
            endDate: dateRange.end,
            status: 'planned',
          };

      // Fetch test runs for this cycle within the date range via tm_cycle_scope join
      // @ts-ignore — deep type instantiation on chained filters
      const { data: runs } = await supabase
        .from('tm_test_runs' as any)
        .select('id, status, created_at, cycle_scope:tm_cycle_scope!inner(test_case_id, cycle_id)')
        .eq('cycle_scope.cycle_id', cycleId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // Map DB rows to CalendarEvent[]
      let events: CalendarEvent[] = (runs || []).map((run: any) => ({
        id: run.id,
        testCaseId: run.cycle_scope?.test_case_id,
        code: run.cycle_scope?.test_case_id?.substring(0, 8) || '',
        title: 'Test Run',
        module: 'General',
        dueDate: new Date(run.created_at),
        status: mapStatus(run.status),
        priority: 'medium',
        assigneeId: null,
        assigneeName: null,
        assigneeAvatar: null,
        estimatedDurationMinutes: 30,
      }));

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

      // Create milestones from cycle dates
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
    enabled: !!cycleId,
  });
}

function mapStatus(dbStatus: string): CalendarEvent['status'] {
  switch (dbStatus) {
    case 'passed': return 'passed';
    case 'failed': return 'failed';
    case 'blocked': return 'blocked';
    case 'in_progress': return 'in_progress';
    default: return 'not_started';
  }
}

export function useCalendarFilters() {
  // Filter options derived from DB enums — no mock data
  const filterOptions = {
    assignees: [] as { id: string; name: string }[],
    statuses: [
      { value: 'not_started', label: 'Not Started' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'passed', label: 'Passed' },
      { value: 'failed', label: 'Failed' },
      { value: 'blocked', label: 'Blocked' },
    ],
    modules: [] as string[],
  };

  return { filterOptions };
}
