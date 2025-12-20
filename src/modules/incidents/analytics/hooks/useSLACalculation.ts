/**
 * SLA Calculation Hook
 * Resolution-only SLA with configurable thresholds
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SLAState, SLAPolicy } from '../types';

// Default SLA policies (hours)
const DEFAULT_SLA_POLICIES: Record<string, number | null> = {
  SEV1: 24,
  SEV2: 48,
  SEV3: 168, // 7 days
  SEV4: null, // No SLA
};

// Major incident override (hours)
const MAJOR_INCIDENT_SLA_HOURS = 4;

// At risk threshold (percentage of remaining time)
const AT_RISK_THRESHOLD = 0.20; // 20%

export interface SLAConfig {
  severity_targets: Record<string, number | null>;
  major_incident_hours: number;
  at_risk_threshold: number;
}

export function useSLAConfig() {
  return useQuery({
    queryKey: ['sla-analytics-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_configs')
        .select('severity, resolution_minutes')
        .order('severity');

      if (error) {
        console.error('Failed to fetch SLA configs:', error);
        return {
          severity_targets: DEFAULT_SLA_POLICIES,
          major_incident_hours: MAJOR_INCIDENT_SLA_HOURS,
          at_risk_threshold: AT_RISK_THRESHOLD,
        };
      }

      const targets: Record<string, number | null> = { ...DEFAULT_SLA_POLICIES };
      data?.forEach(config => {
        targets[config.severity] = config.resolution_minutes ? config.resolution_minutes / 60 : null;
      });

      return {
        severity_targets: targets,
        major_incident_hours: MAJOR_INCIDENT_SLA_HOURS,
        at_risk_threshold: AT_RISK_THRESHOLD,
      } as SLAConfig;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function calculateSLAState(
  incident: {
    created_at: string;
    resolved_at: string | null;
    status: string;
    severity: string;
    is_major_incident: boolean;
  },
  config: SLAConfig
): SLAState {
  const { severity, is_major_incident, created_at, resolved_at, status } = incident;

  // SEV4 has no SLA
  if (severity === 'SEV4' && !is_major_incident) {
    return { state: 'n_a' };
  }

  // Determine SLA target hours
  let targetHours: number;
  if (is_major_incident) {
    targetHours = config.major_incident_hours;
  } else {
    const severityTarget = config.severity_targets[severity];
    if (severityTarget === null || severityTarget === undefined) {
      return { state: 'n_a' };
    }
    targetHours = severityTarget;
  }

  const createdDate = new Date(created_at);
  const dueAt = new Date(createdDate.getTime() + targetHours * 60 * 60 * 1000);
  const now = new Date();

  // If resolved or closed, check if met
  if (resolved_at || status === 'resolved' || status === 'closed') {
    const resolvedDate = resolved_at ? new Date(resolved_at) : now;
    if (resolvedDate <= dueAt) {
      return { state: 'met', due_at: dueAt.toISOString() };
    } else {
      return { state: 'breached', due_at: dueAt.toISOString() };
    }
  }

  // For open incidents
  if (now > dueAt) {
    return { state: 'breached', due_at: dueAt.toISOString() };
  }

  const remainingMs = dueAt.getTime() - now.getTime();
  const totalMs = targetHours * 60 * 60 * 1000;
  const remainingRatio = remainingMs / totalMs;
  const remainingHours = remainingMs / (60 * 60 * 1000);

  if (remainingRatio <= config.at_risk_threshold) {
    return { 
      state: 'at_risk', 
      remaining_hours: remainingHours,
      due_at: dueAt.toISOString() 
    };
  }

  return { 
    state: 'on_track', 
    remaining_hours: remainingHours,
    due_at: dueAt.toISOString() 
  };
}

export function calculateAgeHours(created_at: string): number {
  const created = new Date(created_at);
  const now = new Date();
  return (now.getTime() - created.getTime()) / (60 * 60 * 1000);
}
