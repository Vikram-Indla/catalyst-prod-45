/**
 * Incident Analytics Hook
 * Fetches incidents and computes analytics metrics
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSLAConfig, calculateSLAState, calculateAgeHours } from './useSLACalculation';
import type { TimeRange, AnalyticsSnapshot, BreakdownData, IncidentWithSLA } from '../types';

const OPEN_STATUSES = ['open', 'triage', 'in_progress', 'to_committee'] as const;
type OpenStatus = typeof OPEN_STATUSES[number];

function getTimeRangeFilter(range: TimeRange, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  const end = now;
  let start: Date;

  switch (range) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      start = customStart || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start, end: customEnd || end };
    default:
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

export function useIncidentAnalytics(timeRange: TimeRange, customStart?: Date, customEnd?: Date) {
  const { data: slaConfig, isLoading: slaConfigLoading } = useSLAConfig();
  
  // Memoize the time range to prevent infinite re-renders
  const { start, end } = useMemo(() => 
    getTimeRangeFilter(timeRange, customStart, customEnd),
    [timeRange, customStart?.getTime(), customEnd?.getTime()]
  );

  const { data: rawIncidents, isLoading: incidentsLoading, error } = useQuery({
    queryKey: ['incident-analytics', timeRange, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          incident_key,
          title,
          severity,
          support_level,
          status,
          is_major_incident,
          created_at,
          resolved_at,
          assignee:incident_user_profiles!incidents_assignee_id_fkey(full_name),
          assignee_workgroup:workgroups(name)
        `)
        .is('deleted_at', null)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!slaConfig,
  });

  // Also fetch all open incidents regardless of time range for active counts
  const { data: allOpenIncidents } = useQuery({
    queryKey: ['incident-analytics-open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          incident_key,
          title,
          severity,
          support_level,
          status,
          is_major_incident,
          created_at,
          resolved_at,
          assignee:incident_user_profiles!incidents_assignee_id_fkey(full_name),
          assignee_workgroup:workgroups(name)
        `)
        .is('deleted_at', null)
        .in('status', OPEN_STATUSES)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!slaConfig,
  });

  const incidentsWithSLA = useMemo<IncidentWithSLA[]>(() => {
    if (!allOpenIncidents || !slaConfig) return [];

    return allOpenIncidents.map(inc => {
      const slaState = calculateSLAState(inc, slaConfig);
      const ageHours = calculateAgeHours(inc.created_at);

      return {
        id: inc.id,
        incident_key: inc.incident_key,
        title: inc.title,
        severity: inc.severity as 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4',
        support_level: inc.support_level as 'L1' | 'L2' | 'L3' | null,
        status: inc.status,
        is_major_incident: inc.is_major_incident,
        created_at: inc.created_at,
        resolved_at: inc.resolved_at,
        assignee_name: (inc.assignee as any)?.full_name,
        assignee_workgroup: inc.assignee_workgroup as { name: string } | undefined,
        sla_state: slaState,
        age_hours: ageHours,
      };
    });
  }, [allOpenIncidents, slaConfig]);

  const snapshot = useMemo<AnalyticsSnapshot>(() => {
    if (!incidentsWithSLA.length) {
      return { open: 0, major_active: 0, sla_breached: 0, sla_at_risk: 0, committee: 0 };
    }

    const open = incidentsWithSLA.filter(inc => 
      (OPEN_STATUSES as readonly string[]).includes(inc.status)
    ).length;

    const major_active = incidentsWithSLA.filter(inc => 
      inc.is_major_incident && (OPEN_STATUSES as readonly string[]).includes(inc.status)
    ).length;

    const sla_breached = incidentsWithSLA.filter(inc => 
      inc.sla_state.state === 'breached' && (OPEN_STATUSES as readonly string[]).includes(inc.status)
    ).length;

    const sla_at_risk = incidentsWithSLA.filter(inc => 
      inc.sla_state.state === 'at_risk' && (OPEN_STATUSES as readonly string[]).includes(inc.status)
    ).length;

    const committee = incidentsWithSLA.filter(inc => 
      inc.status === 'to_committee'
    ).length;

    return { open, major_active, sla_breached, sla_at_risk, committee };
  }, [incidentsWithSLA]);

  const breakdowns = useMemo<BreakdownData>(() => {
    const severity: Record<string, number> = { SEV1: 0, SEV2: 0, SEV3: 0, SEV4: 0 };
    const level: Record<string, number> = { L1: 0, L2: 0, L3: 0 };
    const status: Record<string, number> = { 
      open: 0, triage: 0, in_progress: 0, to_committee: 0, resolved: 0, closed: 0 
    };
    const sla_state: Record<string, number> = { 
      on_track: 0, at_risk: 0, breached: 0, n_a: 0 
    };

    incidentsWithSLA.forEach(inc => {
      if (severity[inc.severity] !== undefined) severity[inc.severity]++;
      if (inc.support_level && level[inc.support_level] !== undefined) level[inc.support_level]++;
      if (status[inc.status] !== undefined) status[inc.status]++;
      if (sla_state[inc.sla_state.state] !== undefined && inc.sla_state.state !== 'met') {
        sla_state[inc.sla_state.state]++;
      }
    });

    return { severity, level, status, sla_state };
  }, [incidentsWithSLA]);

  const majorIncidents = useMemo(() => {
    return incidentsWithSLA
      .filter(inc => 
        inc.is_major_incident || 
        inc.sla_state.state === 'breached' || 
        inc.sla_state.state === 'at_risk'
      )
      .sort((a, b) => {
        // Breached first, then at_risk, then major
        const stateOrder: Record<string, number> = { breached: 0, at_risk: 1, on_track: 2, n_a: 3 };
        return (stateOrder[a.sla_state.state] || 3) - (stateOrder[b.sla_state.state] || 3);
      });
  }, [incidentsWithSLA]);

  return {
    incidents: incidentsWithSLA,
    snapshot,
    breakdowns,
    majorIncidents,
    isLoading: slaConfigLoading || incidentsLoading,
    error,
    slaConfig,
    timeRange: { start, end },
  };
}

export function useFilteredIncidents(
  incidents: IncidentWithSLA[],
  filterType: string | null,
  filterValue: string | null
): IncidentWithSLA[] {
  return useMemo(() => {
    if (!filterType) return [];

    switch (filterType) {
      case 'open':
        return incidents.filter(inc => (OPEN_STATUSES as readonly string[]).includes(inc.status));
      case 'major_active':
        return incidents.filter(inc => 
          inc.is_major_incident && (OPEN_STATUSES as readonly string[]).includes(inc.status)
        );
      case 'sla_breached':
        return incidents.filter(inc => 
          inc.sla_state.state === 'breached' && (OPEN_STATUSES as readonly string[]).includes(inc.status)
        );
      case 'sla_at_risk':
        return incidents.filter(inc => 
          inc.sla_state.state === 'at_risk' && (OPEN_STATUSES as readonly string[]).includes(inc.status)
        );
      case 'committee':
        return incidents.filter(inc => inc.status === 'to_committee');
      case 'severity':
        return incidents.filter(inc => inc.severity === filterValue);
      case 'level':
        return incidents.filter(inc => inc.support_level === filterValue);
      case 'status':
        return incidents.filter(inc => inc.status === filterValue);
      case 'sla_state':
        return incidents.filter(inc => inc.sla_state.state === filterValue);
      default:
        return [];
    }
  }, [incidents, filterType, filterValue]);
}
