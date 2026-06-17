// ============================================================
// ITSM QUERY HOOKS — react-query wrappers over itsmService (read).
// ============================================================

import { useQuery } from '@tanstack/react-query';
import {
  listIncidents,
  getIncident,
  listSlaPolicies,
  listTimeline,
  listStatusHistory,
} from '../services/itsmService';
import { itsmKeys } from './itsmKeys';

export function useItsmIncidents() {
  return useQuery({
    queryKey: itsmKeys.incidents(),
    queryFn: listIncidents,
  });
}

export function useItsmIncident(key: string | undefined) {
  return useQuery({
    queryKey: itsmKeys.incident(key ?? ''),
    queryFn: () => getIncident(key as string),
    enabled: !!key,
  });
}

export function useItsmSlaPolicies() {
  return useQuery({
    queryKey: itsmKeys.sla(),
    queryFn: listSlaPolicies,
    staleTime: 5 * 60_000, // policies change rarely
  });
}

export function useItsmTimeline(incidentId: string | undefined) {
  return useQuery({
    queryKey: itsmKeys.timeline(incidentId ?? ''),
    queryFn: () => listTimeline(incidentId as string),
    enabled: !!incidentId,
  });
}

export function useItsmStatusHistory(incidentId: string | undefined) {
  return useQuery({
    queryKey: itsmKeys.statusHistory(incidentId ?? ''),
    queryFn: () => listStatusHistory(incidentId as string),
    enabled: !!incidentId,
  });
}
