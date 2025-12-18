/**
 * Incident API Adapter Layer
 * 
 * Supports both mock mode (for development) and real mode (Supabase)
 * Per 04-API-CONTRACT spec
 */

import { supabase } from '@/integrations/supabase/client';
import { seedData } from '../data/seedData';
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

// Configuration
const USE_MOCK_MODE = true; // Toggle this to switch between mock and real mode

// Helper for calculating aging
function getHoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

// ============================================================================
// MOCK API IMPLEMENTATION
// ============================================================================

let mockIncidents = [...seedData.incidents];
let mockNextIncidentNum = 1248;

const mockApi = {
  // List incidents with filters
  async listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
    let result = [...mockIncidents];

    if (filters?.status?.length) {
      result = result.filter(i => filters.status!.includes(i.status));
    }
    if (filters?.severity?.length) {
      result = result.filter(i => filters.severity!.includes(i.severity));
    }
    if (filters?.support_level?.length) {
      result = result.filter(i => i.support_level && filters.support_level!.includes(i.support_level));
    }
    if (filters?.priority?.length) {
      result = result.filter(i => i.priority && filters.priority!.includes(i.priority));
    }
    if (filters?.is_major_incident !== undefined) {
      result = result.filter(i => i.is_major_incident === filters.is_major_incident);
    }
    if (filters?.assignee_id) {
      result = result.filter(i => i.assignee_id === filters.assignee_id);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(i => 
        i.incident_key.toLowerCase().includes(search) ||
        i.title.toLowerCase().includes(search)
      );
    }

    // Sort by created_at desc
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Get single incident
  async getIncident(id: string): Promise<Incident | null> {
    return mockIncidents.find(i => i.id === id || i.incident_key === id) || null;
  },

  // Create incident
  async createIncident(data: CreateIncidentFormData): Promise<Incident> {
    const newIncident: Incident = {
      id: `inc-${Date.now()}`,
      incident_key: `INC-${mockNextIncidentNum++}`,
      title: data.title,
      description: data.description,
      status: 'open',
      severity: data.severity,
      priority: derivePriority(data.impact, data.urgency),
      impact: data.impact,
      urgency: data.urgency,
      is_major_incident: data.is_major_incident,
      release_version_id: data.release_version_id,
      release_version: seedData.releaseVersions.find(r => r.id === data.release_version_id),
      source_department_id: data.source_department_id,
      source_department: seedData.departments.find(d => d.id === data.source_department_id),
      business_process_id: data.business_process_id,
      business_process: seedData.businessProcesses.find(b => b.id === data.business_process_id),
      delivery_platform_id: data.delivery_platform_id,
      delivery_platform: data.delivery_platform_id ? seedData.deliveryPlatforms.find(p => p.id === data.delivery_platform_id) : undefined,
      assignee_id: data.assignee_id,
      assignee: data.assignee_id ? seedData.userProfiles.find(u => u.id === data.assignee_id) : undefined,
      requires_committee: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      comments: [],
      attachments: [],
      history: [],
    };

    // Calculate SLA
    const slaConfig = seedData.slaConfigs.find(s => s.severity === data.severity);
    if (slaConfig) {
      const now = new Date();
      newIncident.sla = {
        id: `sla-${Date.now()}`,
        incident_id: newIncident.id,
        response_due_at: new Date(now.getTime() + slaConfig.response_minutes * 60 * 1000).toISOString(),
        response_breached: false,
        resolution_due_at: new Date(now.getTime() + slaConfig.resolution_minutes * 60 * 1000).toISOString(),
        resolution_breached: false,
      };
    }

    mockIncidents.unshift(newIncident);
    return newIncident;
  },

  // Update incident
  async updateIncident(id: string, data: Partial<Incident>): Promise<Incident | null> {
    const index = mockIncidents.findIndex(i => i.id === id);
    if (index === -1) return null;

    mockIncidents[index] = {
      ...mockIncidents[index],
      ...data,
      updated_at: new Date().toISOString(),
    };

    return mockIncidents[index];
  },

  // Add comment
  async addComment(incidentId: string, content: string, commentType: CommentType = 'update'): Promise<IncidentComment> {
    const incident = mockIncidents.find(i => i.id === incidentId);
    if (!incident) throw new Error('Incident not found');

    const comment: IncidentComment = {
      id: `cmt-${Date.now()}`,
      incident_id: incidentId,
      author_id: 'user-1',
      author: seedData.userProfiles[0],
      content,
      comment_type: commentType,
      is_pinned: false,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    incident.comments = [comment, ...(incident.comments || [])];
    return comment;
  },

  // Get dashboard metrics
  async getDashboardMetrics(): Promise<IncidentDashboardMetrics> {
    const openStatuses = ['open', 'triage', 'to_committee', 'in_progress'];
    const openIncidents = mockIncidents.filter(i => openStatuses.includes(i.status));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      open_count: openIncidents.length,
      major_count: openIncidents.filter(i => i.is_major_incident).length,
      sla_breached_count: openIncidents.filter(i => i.sla?.response_breached || i.sla?.resolution_breached).length,
      l1_count: openIncidents.filter(i => i.support_level === 'L1').length,
      l2_count: openIncidents.filter(i => i.support_level === 'L2').length,
      l3_count: openIncidents.filter(i => i.support_level === 'L3').length,
      resolved_today: mockIncidents.filter(i => i.resolved_at && new Date(i.resolved_at) >= today).length,
      created_today: mockIncidents.filter(i => new Date(i.created_at) >= today).length,
      needs_attention: openIncidents.filter(i => 
        i.sla?.response_breached || 
        i.sla?.resolution_breached || 
        i.is_major_incident ||
        i.status === 'open'
      ).slice(0, 10),
      my_queue: openIncidents.filter(i => i.assignee_id === 'user-1').slice(0, 10),
    };
  },

  // Get committee queue
  async getCommitteeQueue(includesClosed = false): Promise<CommitteeQueueItem[]> {
    const relevantIncidents = mockIncidents.filter(i => 
      i.committee && 
      (includesClosed || i.committee.status === 'pending')
    );

    return relevantIncidents.map(incident => {
      const committee = incident.committee!;
      const votes = committee.members?.map(m => m.vote) || [];
      const approvedCount = votes.filter(v => v?.vote === 'approved').length;
      const rejectedCount = votes.filter(v => v?.vote === 'rejected' || v?.vote === 'vetoed').length;
      const pendingCount = votes.filter(v => !v?.vote || v.vote === 'pending').length;
      const hasVeto = votes.some(v => v?.vote === 'vetoed');

      // Time waiting = since first approver added
      const firstMemberAdded = committee.members?.reduce((min, m) => {
        const addedAt = new Date(m.added_at).getTime();
        return addedAt < min ? addedAt : min;
      }, Date.now()) || Date.now();

      return {
        incident,
        committee,
        time_waiting_hours: (Date.now() - firstMemberAdded) / (1000 * 60 * 60),
        aging_hours: getHoursAgo(incident.created_at),
        approvals_count: approvedCount,
        rejections_count: rejectedCount,
        pending_count: pendingCount,
        has_veto: hasVeto,
      };
    });
  },

  // Reference data
  async getWorkgroups(): Promise<Workgroup[]> {
    return seedData.workgroups;
  },

  async getUserProfiles(): Promise<UserProfile[]> {
    return seedData.userProfiles;
  },

  async getReleaseVersions(): Promise<ReleaseVersion[]> {
    return seedData.releaseVersions;
  },

  async getDepartments(): Promise<Department[]> {
    return seedData.departments;
  },

  async getBusinessProcesses(): Promise<BusinessProcess[]> {
    return seedData.businessProcesses;
  },

  async getDeliveryPlatforms(): Promise<DeliveryPlatform[]> {
    return seedData.deliveryPlatforms;
  },

  async getSlaConfigs(): Promise<SlaConfig[]> {
    return seedData.slaConfigs;
  },
};

// ============================================================================
// REAL API IMPLEMENTATION (Supabase)
// ============================================================================

const realApi = {
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

  // TODO: SPEC REQUIRED - Implement remaining real API methods
  async createIncident(_data: CreateIncidentFormData): Promise<Incident> {
    throw new Error('Real API not implemented - use mock mode');
  },

  async updateIncident(_id: string, _data: Partial<Incident>): Promise<Incident | null> {
    throw new Error('Real API not implemented - use mock mode');
  },

  async addComment(_incidentId: string, _content: string, _commentType?: CommentType): Promise<IncidentComment> {
    throw new Error('Real API not implemented - use mock mode');
  },

  async getDashboardMetrics(): Promise<IncidentDashboardMetrics> {
    throw new Error('Real API not implemented - use mock mode');
  },

  async getCommitteeQueue(_includesClosed?: boolean): Promise<CommitteeQueueItem[]> {
    throw new Error('Real API not implemented - use mock mode');
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
    // TODO: SPEC REQUIRED - delivery_platforms table doesn't exist in schema yet
    return seedData.deliveryPlatforms;
  },

  async getSlaConfigs(): Promise<SlaConfig[]> {
    const { data } = await supabase.from('sla_configs').select('*');
    return (data || []) as unknown as SlaConfig[];
  },
};

// ============================================================================
// BUSINESS LOGIC HELPERS
// ============================================================================

function derivePriority(impact: string, urgency: string): 'P1' | 'P2' | 'P3' | 'P4' {
  const matrix: Record<string, Record<string, 'P1' | 'P2' | 'P3' | 'P4'>> = {
    high: { high: 'P1', medium: 'P2', low: 'P3' },
    medium: { high: 'P2', medium: 'P3', low: 'P4' },
    low: { high: 'P3', medium: 'P4', low: 'P4' },
  };
  return matrix[impact]?.[urgency] || 'P3';
}

// ============================================================================
// EXPORTED API (switches between mock and real)
// ============================================================================

export const incidentApi = USE_MOCK_MODE ? mockApi : realApi;

export default incidentApi;
