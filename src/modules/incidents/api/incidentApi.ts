/**
 * Incident API Adapter Layer
 * 
 * Real Supabase implementation only - no mock data
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Incident,
  CreateIncidentFormData,
  IncidentFilters,
  IncidentDashboardMetrics,
  CommitteeQueueItem,
  UserProfile,
  Workgroup,
  ReleaseVersion,
  Department,
  BusinessProcess,
  DeliveryPlatform,
  SlaConfig,
  IncidentComment,
  CommentType,
} from '../types';

// Helper for calculating aging
function getHoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

// ============================================================================
// REAL API IMPLEMENTATION (Supabase)
// ============================================================================

export const incidentApi = {
  async listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
    let query = supabase
      .from('incidents')
      .select(`
        *,
        release_version:release_versions(*),
        assignee:incident_user_profiles!incidents_assignee_id_fkey(*),
        reporter:incident_user_profiles!incidents_reporter_id_fkey(*),
        assignee_workgroup:workgroups(*),
        sla:sla_records(*)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.severity?.length) {
      query = query.in('severity', filters.severity);
    }
    if (filters?.support_level?.length) {
      query = query.in('support_level', filters.support_level);
    }
    if (filters?.priority?.length) {
      query = query.in('priority', filters.priority);
    }
    if (filters?.is_major_incident !== undefined) {
      query = query.eq('is_major_incident', filters.is_major_incident);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,incident_key.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      sla: Array.isArray(item.sla) ? item.sla[0] : item.sla,
    })) as unknown as Incident[];
  },

  async getIncident(id: string): Promise<Incident | null> {
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        release_version:release_versions(*),
        assignee:incident_user_profiles!incidents_assignee_id_fkey(*, workgroup:workgroups(*)),
        reporter:incident_user_profiles!incidents_reporter_id_fkey(*),
        assignee_workgroup:workgroups(*),
        committee:incident_committees(*),
        sla:sla_records(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Incident;
  },

  async createIncident(formData: CreateIncidentFormData): Promise<Incident> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('incidents')
      .insert({
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        impact: formData.impact,
        urgency: formData.urgency,
        is_major_incident: formData.is_major_incident,
        release_version_id: formData.release_version_id,
        source_department_id: formData.source_department_id,
        business_process_id: formData.business_process_id,
        delivery_platform_id: formData.delivery_platform_id,
        assignee_id: formData.assignee_id,
        reporter_id: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Incident;
  },

  async updateIncident(id: string, updates: Partial<Incident>): Promise<Incident | null> {
    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Incident;
  },

  async addComment(incidentId: string, content: string, commentType: CommentType = 'update'): Promise<IncidentComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('incident_comments')
      .insert({
        incident_id: incidentId,
        author_id: user.id,
        content,
        comment_type: commentType,
      })
      .select(`*, author:incident_user_profiles(*)`)
      .single();

    if (error) throw error;
    return data as unknown as IncidentComment;
  },

  async getDashboardMetrics(): Promise<IncidentDashboardMetrics> {
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('id, status, severity, is_major_incident, created_at, support_level')
      .is('deleted_at', null);

    if (error) throw error;

    const openIncidents = (incidents || []).filter(i => !['resolved', 'closed'].includes(i.status));
    const majorIncidents = openIncidents.filter(i => i.is_major_incident);
    
    return {
      open_count: openIncidents.length,
      major_count: majorIncidents.length,
      sla_breached_count: 0, // Would need to join with sla_records
      l1_count: openIncidents.filter(i => i.support_level === 'L1').length,
      l2_count: openIncidents.filter(i => i.support_level === 'L2').length,
      l3_count: openIncidents.filter(i => i.support_level === 'L3').length,
      resolved_today: (incidents || []).filter(i => {
        if (i.status !== 'resolved') return false;
        const today = new Date().toDateString();
        return new Date(i.created_at).toDateString() === today;
      }).length,
      created_today: (incidents || []).filter(i => {
        const today = new Date().toDateString();
        return new Date(i.created_at).toDateString() === today;
      }).length,
      needs_attention: [],
      my_queue: [],
    };
  },

  async getCommitteeQueue(includesClosed?: boolean): Promise<CommitteeQueueItem[]> {
    let query = supabase
      .from('incidents')
      .select(`
        *,
        committee:incident_committees(*, members:committee_members(*))
      `)
      .eq('requires_committee', true)
      .is('deleted_at', null);

    if (!includesClosed) {
      query = query.not('status', 'in', '("resolved","closed")');
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || [])
      .filter(i => i.committee)
      .map(incident => {
        const committee = incident.committee;
        const members = committee?.members || [];
        const approvedCount = members.filter((m: any) => m.vote === 'approved').length;
        const rejectedCount = members.filter((m: any) => m.vote === 'rejected' || m.vote === 'vetoed').length;
        const pendingCount = members.filter((m: any) => !m.vote || m.vote === 'pending').length;
        const hasVeto = members.some((m: any) => m.vote === 'vetoed');

        // Map members to include added_at field
        const mappedMembers = members.map((m: any) => ({
          ...m,
          added_at: m.created_at || new Date().toISOString(),
        }));

        return {
          incident: incident as unknown as Incident,
          committee: {
            ...committee,
            incident_id: committee.incident_id || incident.id,
            members: mappedMembers,
          },
          time_waiting_hours: getHoursAgo(incident.created_at),
          aging_hours: getHoursAgo(incident.created_at),
          approvals_count: approvedCount,
          rejections_count: rejectedCount,
          pending_count: pendingCount,
          has_veto: hasVeto,
        } as CommitteeQueueItem;
      });
  },

  async getWorkgroups(): Promise<Workgroup[]> {
    const { data } = await supabase.from('workgroups').select('*').is('deleted_at', null);
    return (data || []) as unknown as Workgroup[];
  },

  async getUserProfiles(): Promise<UserProfile[]> {
    const { data } = await supabase.from('incident_user_profiles').select('*');
    return (data || []) as unknown as UserProfile[];
  },

  async getReleaseVersions(): Promise<ReleaseVersion[]> {
    const { data } = await supabase.from('release_versions').select('*').order('version', { ascending: false });
    return (data || []) as unknown as ReleaseVersion[];
  },

  async getDepartments(): Promise<Department[]> {
    const { data } = await supabase.from('departments').select('*');
    return (data || []) as unknown as Department[];
  },

  async getBusinessProcesses(): Promise<BusinessProcess[]> {
    const { data } = await supabase.from('business_processes').select('*').eq('active', true).order('sort_order');
    return (data || []) as unknown as BusinessProcess[];
  },

  async getDeliveryPlatforms(): Promise<DeliveryPlatform[]> {
    // delivery_platforms table doesn't exist yet - return empty array
    return [];
  },

  async getSlaConfigs(): Promise<SlaConfig[]> {
    const { data } = await supabase.from('sla_configs').select('*');
    return (data || []) as unknown as SlaConfig[];
  },
};

// ============================================================================
// BUSINESS LOGIC HELPERS
// ============================================================================

export function derivePriority(impact: string, urgency: string): 'P1' | 'P2' | 'P3' | 'P4' {
  const matrix: Record<string, Record<string, 'P1' | 'P2' | 'P3' | 'P4'>> = {
    high: { high: 'P1', medium: 'P2', low: 'P3' },
    medium: { high: 'P2', medium: 'P3', low: 'P4' },
    low: { high: 'P3', medium: 'P4', low: 'P4' },
  };
  return matrix[impact]?.[urgency] || 'P3';
}

export default incidentApi;
