// src/hooks/home/useHomeOperationsData.ts
// Operations Mode: Incident Management + Release Management
// Provides summary counts and paginated work items

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItemType } from '@/components/ja/icons/WorkItemTypeIcon';

// ============================================
// TYPES
// ============================================
export interface OperationsSummary {
  incidents: {
    major: { open: number; breached: number; atRisk: number };
    slaAtRisk: number;
    awaitingMe: number;
    blocked: number;
  };
  releases: {
    active: number;
    atRisk: number;
    blocked: number;
  };
}

export interface OperationsWorkItem {
  id: string;
  key: string;
  summary: string;
  project: string;
  projectKey: string;
  status: string;
  type: WorkItemType;
  assignee: string | null;
  activityDate: Date;
  activityType: 'Updated' | 'Created';
  priority?: string;
  severity?: string;
}

export interface OperationsItemsParams {
  type?: 'incident' | 'release';
  filter?: 'major' | 'sla-at-risk' | 'blocked';
  search?: string;
  sort?: 'updated' | 'priority';
  page?: number;
  pageSize?: number;
}

export interface OperationsItemsResponse {
  items: OperationsWorkItem[];
  counts: { total: number };
}

// ============================================
// SUMMARY HOOK
// ============================================
export function useHomeOperationsSummary(userId?: string) {
  return useQuery({
    queryKey: ['home-operations-summary', userId],
    queryFn: async (): Promise<OperationsSummary> => {
      // Fetch incidents with user scope
      const { data: incidents, error: incidentsError } = await supabase
        .from('incidents')
        .select('id, status, severity, is_major_incident, assignee_id')
        .is('deleted_at', null);

      if (incidentsError) throw incidentsError;

      // Fetch SLA records
      const { data: slaRecords, error: slaError } = await supabase
        .from('sla_records')
        .select('incident_id, response_breached, resolution_breached, response_due_at, resolution_due_at');

      if (slaError) throw slaError;

      // Fetch releases
      const { data: releases, error: releasesError } = await supabase
        .from('releases')
        .select('id, status');

      if (releasesError) throw releasesError;

      // Calculate incident counts
      const incidentList = incidents || [];
      const slaList = slaRecords || [];
      const releaseList = releases || [];

      // Major incidents (SEV1/SEV2 or flagged as major)
      const majorIncidents = incidentList.filter(i => 
        i.is_major_incident || i.severity === 'SEV1' || i.severity === 'SEV2'
      );
      
      // SLA breaches
      const breachedCount = slaList.filter(sla => 
        sla.response_breached === true || sla.resolution_breached === true
      ).length;

      // At risk (due within 4 hours)
      const now = new Date();
      const atRiskCount = slaList.filter(sla => {
        if (sla.response_breached || sla.resolution_breached) return false;
        const dueAt = sla.resolution_due_at ? new Date(sla.resolution_due_at) : null;
        if (!dueAt) return false;
        const hoursUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilDue > 0 && hoursUntilDue <= 4;
      }).length;

      // Awaiting me (triage or to_committee and assigned to user)
      const awaitingMe = userId 
        ? incidentList.filter(i => 
            (i.status === 'triage' || i.status === 'to_committee') && 
            i.assignee_id === userId
          ).length
        : incidentList.filter(i => 
            i.status === 'triage' || i.status === 'to_committee'
          ).length;

      // Release counts - based on actual schema (status: planned, ready, shipped)
      const activeReleases = releaseList.filter(r => 
        r.status === 'planned' || r.status === 'ready'
      ).length;
      const atRiskReleases = 0; // No health column in current schema
      const blockedReleases = 0; // No blocked status in current schema

      return {
        incidents: {
          major: {
            open: majorIncidents.filter(i => !['resolved', 'closed'].includes(i.status)).length,
            breached: breachedCount,
            atRisk: atRiskCount,
          },
          slaAtRisk: atRiskCount,
          awaitingMe,
          blocked: 0, // Incidents don't have blocked status in current schema
        },
        releases: {
          active: activeReleases,
          atRisk: atRiskReleases,
          blocked: blockedReleases,
        },
      };
    },
    staleTime: 1000 * 30,
  });
}

// ============================================
// ITEMS HOOK
// ============================================
export function useHomeOperationsItems(params: OperationsItemsParams = {}) {
  const { type, filter, search, sort = 'updated', page = 1, pageSize = 20 } = params;

  return useQuery({
    queryKey: ['home-operations-items', type, filter, search, sort, page, pageSize],
    queryFn: async (): Promise<OperationsItemsResponse> => {
      const items: OperationsWorkItem[] = [];
      let totalCount = 0;

      // Fetch incidents if type is 'incident' or not specified
      if (!type || type === 'incident') {
        let query = supabase
          .from('incidents')
          .select(`
            id,
            incident_key,
            title,
            status,
            severity,
            is_major_incident,
            assignee_id,
            created_at,
            updated_at,
            project:projects!incidents_project_id_fkey(id, name, key)
          `, { count: 'exact' })
          .is('deleted_at', null);

        // Apply filters
        if (filter === 'major') {
          query = query.or('is_major_incident.eq.true,severity.eq.SEV1,severity.eq.SEV2');
        }
        // Note: 'blocked' filter not applicable - incidents don't have blocked status

        // Apply search
        if (search) {
          query = query.or(`title.ilike.%${search}%,incident_key.ilike.%${search}%`);
        }

        // Apply sorting
        if (sort === 'priority') {
          query = query.order('severity', { ascending: true });
        } else {
          query = query.order('updated_at', { ascending: false });
        }

        // Apply pagination
        const from = (page - 1) * pageSize;
        query = query.range(from, from + pageSize - 1);

        const { data: incidents, count, error } = await query;

        if (error) throw error;

        totalCount += count || 0;

        (incidents || []).forEach(incident => {
          items.push({
            id: incident.id,
            key: incident.incident_key || `INC-${incident.id.slice(0, 6)}`,
            summary: incident.title,
            project: incident.project?.name || 'Unknown Project',
            projectKey: incident.project?.key || 'UNK',
            status: incident.status,
            type: 'defect' as WorkItemType,
            assignee: incident.assignee_id,
            activityDate: new Date(incident.updated_at || incident.created_at),
            activityType: 'Updated',
            severity: incident.severity,
          });
        });
      }

      // Fetch releases if type is 'release' or not specified
      if (!type || type === 'release') {
        let query = supabase
          .from('releases')
          .select('*', { count: 'exact' });

        // Note: releases don't have 'blocked' status in current schema

        if (search) {
          query = query.ilike('name', `%${search}%`);
        }

        query = query.order('target_date', { ascending: true });

        const from = (page - 1) * pageSize;
        query = query.range(from, from + pageSize - 1);

        const { data: releases, count, error } = await query;

        if (error) throw error;

        totalCount += count || 0;

        (releases || []).forEach(release => {
          items.push({
            id: release.id,
            key: `REL-${release.id.slice(0, 6)}`,
            summary: release.name,
            project: 'Release Management',
            projectKey: 'REL',
            status: release.status,
            type: 'epic' as WorkItemType,
            assignee: null, // No release_manager_id in current schema
            activityDate: new Date(release.updated_at || release.created_at),
            activityType: 'Updated',
          });
        });
      }

      // Sort combined items
      items.sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());

      return {
        items,
        counts: { total: totalCount },
      };
    },
    staleTime: 1000 * 30,
  });
}
