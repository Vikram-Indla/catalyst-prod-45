/**
 * Period-based Analytics Hook
 * Fetches Today, This Week, Last Week data with comparison metrics
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSLAConfig, calculateSLAState, calculateAgeHours } from './useSLACalculation';
import type { InsightPeriod, PeriodMetrics, PeriodComparison, IncidentWithSLA, AnalyticsSnapshot, BreakdownData, ConversionMetrics, ConvertedIncident } from '../types';
import { startOfDay, startOfWeek, endOfDay, subDays, subWeeks, endOfWeek, differenceInHours } from 'date-fns';

const OPEN_STATUSES = ['open', 'triage', 'in_progress', 'to_committee'] as const;

interface PeriodRange {
  start: Date;
  end: Date;
  comparisonStart: Date;
  comparisonEnd: Date;
  label: string;
  comparisonLabel: string;
}

export function getPeriodRange(period: InsightPeriod): PeriodRange {
  const now = new Date();
  
  switch (period) {
    case 'today': {
      const todayStart = startOfDay(now);
      const yesterdayStart = startOfDay(subDays(now, 1));
      const yesterdayEnd = endOfDay(subDays(now, 1));
      return {
        start: todayStart,
        end: now,
        comparisonStart: yesterdayStart,
        comparisonEnd: yesterdayEnd,
        label: 'Today',
        comparisonLabel: 'Yesterday',
      };
    }
    case 'this_week': {
      // Week starts on Sunday
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const yesterdayEnd = endOfDay(subDays(now, 1));
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
      return {
        start: weekStart,
        end: yesterdayEnd,
        comparisonStart: lastWeekStart,
        comparisonEnd: lastWeekEnd,
        label: 'This Week (WTD)',
        comparisonLabel: 'Last Week',
      };
    }
    case 'last_week': {
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
      const twoWeeksAgoStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 0 });
      const twoWeeksAgoEnd = endOfWeek(subWeeks(now, 2), { weekStartsOn: 0 });
      return {
        start: lastWeekStart,
        end: lastWeekEnd,
        comparisonStart: twoWeeksAgoStart,
        comparisonEnd: twoWeeksAgoEnd,
        label: 'Last Week',
        comparisonLabel: 'Previous Week',
      };
    }
  }
}

function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function usePeriodAnalytics(period: InsightPeriod) {
  const { data: slaConfig, isLoading: slaConfigLoading } = useSLAConfig();
  const periodRange = getPeriodRange(period);

  // Fetch incidents for current period (including conversion data)
  const { data: currentPeriodIncidents, isLoading: currentLoading } = useQuery({
    queryKey: ['period-incidents', period, 'current'],
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
          converted_to_type,
          converted_to_key,
          converted_at,
          assignee:incident_user_profiles!incidents_assignee_id_fkey(full_name),
          assignee_workgroup:workgroups(name)
        `)
        .is('deleted_at', null)
        .gte('created_at', periodRange.start.toISOString())
        .lte('created_at', periodRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!slaConfig,
  });

  // Fetch conversions in current period (by converted_at date)
  const { data: currentPeriodConversions, isLoading: conversionsLoading } = useQuery({
    queryKey: ['period-conversions', period, 'current'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          incident_key,
          title,
          created_at,
          converted_to_type,
          converted_to_key,
          converted_at
        `)
        .is('deleted_at', null)
        .not('converted_at', 'is', null)
        .gte('converted_at', periodRange.start.toISOString())
        .lte('converted_at', periodRange.end.toISOString())
        .order('converted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch conversions in comparison period
  const { data: comparisonPeriodConversions, isLoading: comparisonConversionsLoading } = useQuery({
    queryKey: ['period-conversions', period, 'comparison'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          incident_key,
          title,
          created_at,
          converted_to_type,
          converted_to_key,
          converted_at
        `)
        .is('deleted_at', null)
        .not('converted_at', 'is', null)
        .gte('converted_at', periodRange.comparisonStart.toISOString())
        .lte('converted_at', periodRange.comparisonEnd.toISOString())
        .order('converted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch incidents for comparison period
  const { data: comparisonPeriodIncidents, isLoading: comparisonLoading } = useQuery({
    queryKey: ['period-incidents', period, 'comparison'],
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
        .gte('created_at', periodRange.comparisonStart.toISOString())
        .lte('created_at', periodRange.comparisonEnd.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!slaConfig,
  });

  // Fetch all currently open incidents
  const { data: allOpenIncidents, isLoading: openLoading } = useQuery({
    queryKey: ['period-incidents-open'],
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

  // Process conversion metrics for current period
  const currentConversionMetrics = useMemo<ConversionMetrics>(() => {
    if (!currentPeriodConversions) {
      return { total: 0, byType: {}, medianLatencyHours: null, latencyChange: null, recentConversions: [] };
    }

    const byType: Record<string, number> = { story: 0, feature: 0, epic: 0 };
    const latencies: number[] = [];
    const recentConversions: ConvertedIncident[] = [];

    currentPeriodConversions.forEach((inc: any) => {
      if (inc.converted_to_type && byType[inc.converted_to_type] !== undefined) {
        byType[inc.converted_to_type]++;
      }
      
      if (inc.created_at && inc.converted_at) {
        const latencyHours = differenceInHours(new Date(inc.converted_at), new Date(inc.created_at));
        latencies.push(latencyHours);
        
        recentConversions.push({
          incident_id: inc.id,
          incident_key: inc.incident_key,
          incident_title: inc.title,
          converted_to_type: inc.converted_to_type as 'story' | 'feature' | 'epic',
          converted_to_key: inc.converted_to_key,
          converted_at: inc.converted_at,
          latency_hours: latencyHours,
        });
      }
    });

    return {
      total: currentPeriodConversions.length,
      byType,
      medianLatencyHours: calculateMedian(latencies),
      latencyChange: null, // Will be set after comparison
      recentConversions: recentConversions.slice(0, 5), // Latest 5
    };
  }, [currentPeriodConversions]);

  // Process conversion metrics for comparison period
  const comparisonConversionMetrics = useMemo<{ total: number; medianLatencyHours: number | null }>(() => {
    if (!comparisonPeriodConversions) {
      return { total: 0, medianLatencyHours: null };
    }

    const latencies: number[] = [];
    comparisonPeriodConversions.forEach((inc: any) => {
      if (inc.created_at && inc.converted_at) {
        latencies.push(differenceInHours(new Date(inc.converted_at), new Date(inc.created_at)));
      }
    });

    return {
      total: comparisonPeriodConversions.length,
      medianLatencyHours: calculateMedian(latencies),
    };
  }, [comparisonPeriodConversions]);

  // Calculate latency change
  const conversionMetrics = useMemo<ConversionMetrics>(() => {
    let latencyChange: number | null = null;
    if (currentConversionMetrics.medianLatencyHours !== null && comparisonConversionMetrics.medianLatencyHours !== null) {
      latencyChange = currentConversionMetrics.medianLatencyHours - comparisonConversionMetrics.medianLatencyHours;
    }
    return { ...currentConversionMetrics, latencyChange };
  }, [currentConversionMetrics, comparisonConversionMetrics]);

  // Calculate metrics for a set of incidents
  const calculateMetrics = (incidents: any[], openIncidents: any[], slaConfig: any, converted: number): PeriodMetrics => {
    const created = incidents.length;
    const resolved = incidents.filter(inc => 
      inc.status === 'resolved' || inc.status === 'closed'
    ).length;
    
    // Calculate SLA states for open incidents
    const openWithSLA = openIncidents.map(inc => ({
      ...inc,
      sla_state: calculateSLAState(inc, slaConfig),
    }));

    const sla_breached = openWithSLA.filter(inc => 
      inc.sla_state.state === 'breached' && (OPEN_STATUSES as readonly string[]).includes(inc.status)
    ).length;

    const sla_at_risk = openWithSLA.filter(inc => 
      inc.sla_state.state === 'at_risk' && (OPEN_STATUSES as readonly string[]).includes(inc.status)
    ).length;

    const major_active = openIncidents.filter(inc => 
      inc.is_major_incident && (OPEN_STATUSES as readonly string[]).includes(inc.status)
    ).length;

    return {
      created,
      resolved,
      backlog_delta: created - resolved,
      sla_breached,
      sla_at_risk,
      major_active,
      converted,
    };
  };

  // Process current period incidents with SLA
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

  // Calculate current period metrics
  const currentMetrics = useMemo<PeriodMetrics>(() => {
    if (!currentPeriodIncidents || !allOpenIncidents || !slaConfig) {
      return { created: 0, resolved: 0, backlog_delta: 0, sla_breached: 0, sla_at_risk: 0, major_active: 0, converted: 0 };
    }
    return calculateMetrics(currentPeriodIncidents, allOpenIncidents, slaConfig, conversionMetrics.total);
  }, [currentPeriodIncidents, allOpenIncidents, slaConfig, conversionMetrics.total]);

  // Calculate comparison period metrics
  const comparisonMetrics = useMemo<PeriodMetrics>(() => {
    if (!comparisonPeriodIncidents || !slaConfig) {
      return { created: 0, resolved: 0, backlog_delta: 0, sla_breached: 0, sla_at_risk: 0, major_active: 0, converted: 0 };
    }
    // For comparison, we just count what happened in that period
    const created = comparisonPeriodIncidents.length;
    const resolved = comparisonPeriodIncidents.filter(inc => 
      inc.status === 'resolved' || inc.status === 'closed'
    ).length;
    
    return {
      created,
      resolved,
      backlog_delta: created - resolved,
      sla_breached: 0, // Historical SLA data not available
      sla_at_risk: 0,
      major_active: comparisonPeriodIncidents.filter(inc => inc.is_major_incident).length,
      converted: comparisonConversionMetrics.total,
    };
  }, [comparisonPeriodIncidents, slaConfig, comparisonConversionMetrics.total]);

  // Calculate deltas
  const deltas = useMemo<PeriodComparison>(() => ({
    created: currentMetrics.created - comparisonMetrics.created,
    resolved: currentMetrics.resolved - comparisonMetrics.resolved,
    backlog_delta: currentMetrics.backlog_delta - comparisonMetrics.backlog_delta,
    sla_breached: currentMetrics.sla_breached - comparisonMetrics.sla_breached,
    sla_at_risk: currentMetrics.sla_at_risk - comparisonMetrics.sla_at_risk,
    major_active: currentMetrics.major_active - comparisonMetrics.major_active,
    converted: currentMetrics.converted - comparisonMetrics.converted,
  }), [currentMetrics, comparisonMetrics]);

  // Current snapshot
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

  // Breakdowns
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

  // Major incidents
  const majorIncidents = useMemo(() => {
    return incidentsWithSLA
      .filter(inc => 
        inc.is_major_incident || 
        inc.sla_state.state === 'breached' || 
        inc.sla_state.state === 'at_risk'
      )
      .sort((a, b) => {
        const stateOrder: Record<string, number> = { breached: 0, at_risk: 1, on_track: 2, n_a: 3 };
        return (stateOrder[a.sla_state.state] || 3) - (stateOrder[b.sla_state.state] || 3);
      });
  }, [incidentsWithSLA]);

  // Incidents created in current period (for drilldown)
  const periodCreatedIncidents = useMemo<IncidentWithSLA[]>(() => {
    if (!currentPeriodIncidents || !slaConfig) return [];

    return currentPeriodIncidents.map(inc => {
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
  }, [currentPeriodIncidents, slaConfig]);

  // Filter for drilldown
  const getFilteredIncidents = (filterType: string): IncidentWithSLA[] => {
    switch (filterType) {
      case 'created':
        return periodCreatedIncidents;
      case 'resolved':
        return periodCreatedIncidents.filter(inc => 
          inc.status === 'resolved' || inc.status === 'closed'
        );
      case 'sla_breached':
        return incidentsWithSLA.filter(inc => inc.sla_state.state === 'breached');
      case 'sla_at_risk':
        return incidentsWithSLA.filter(inc => inc.sla_state.state === 'at_risk');
      case 'major_active':
        return incidentsWithSLA.filter(inc => 
          inc.is_major_incident && (OPEN_STATUSES as readonly string[]).includes(inc.status)
        );
      default:
        return [];
    }
  };

  return {
    periodRange,
    currentMetrics,
    comparisonMetrics,
    deltas,
    snapshot,
    breakdowns,
    majorIncidents,
    incidents: incidentsWithSLA,
    periodCreatedIncidents,
    getFilteredIncidents,
    conversionMetrics,
    isLoading: slaConfigLoading || currentLoading || comparisonLoading || openLoading || conversionsLoading || comparisonConversionsLoading,
  };
}