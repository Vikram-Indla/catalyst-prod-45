/**
 * Hook to fetch full incident details for the modal
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Incident, Assignee } from '@/types/release';

export function useIncidentDetail(incidentId: string | null) {
  return useQuery({
    queryKey: ['incident-detail', incidentId],
    queryFn: async (): Promise<Incident | null> => {
      if (!incidentId) return null;
      
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          assignee:incident_user_profiles!incidents_assignee_id_fkey(id, full_name, email, avatar_initials),
          reporter:incident_user_profiles!incidents_reporter_id_fkey(id, full_name, email, avatar_initials)
        `)
        .eq('id', incidentId)
        .single();
      
      if (error) throw error;
      if (!data) return null;
      
      // Transform to the modal's Incident type
      const assigneeData = data.assignee as Record<string, unknown> | null;
      const reporterData = data.reporter as Record<string, unknown> | null;
      
      const toAssignee = (d: Record<string, unknown> | null): Assignee => {
        if (!d) return { id: '', name: 'Unassigned', initials: 'UA' };
        const fullName = (d.full_name as string) || 'Unknown';
        const initials = (d.avatar_initials as string) || fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        return {
          id: (d.id as string) || '',
          name: fullName,
          initials,
          email: d.email as string | undefined,
        };
      };
      
      // Map status values
      const statusMap: Record<string, Incident['status']> = {
        'open': 'open',
        'triage': 'open',
        'in_progress': 'in-progress',
        'to_committee': 'pending',
        'resolved': 'resolved',
        'closed': 'closed',
        'converted': 'closed',
      };
      
      return {
        id: data.id,
        summary: data.title,
        description: data.description || '',
        severity: (data.severity || 'SEV3') as 'SEV1' | 'SEV2' | 'SEV3',
        impact: (data.impact || 'medium') as 'high' | 'medium' | 'low',
        urgency: (data.urgency || 'medium') as 'high' | 'medium' | 'low',
        priority: mapPriority(data.severity),
        status: statusMap[data.status] || 'open',
        assignee: toAssignee(assigneeData),
        reporter: toAssignee(reporterData),
        component: data.service_component || 'General',
        components: data.service_component ? [data.service_component] : [],
        labels: [],
        targetDate: data.target_date || new Date().toISOString(),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        linkedItems: [],
        watchers: [],
        comments: [],
        attachments: [],
        timeline: [],
        isMajorIncident: data.is_major_incident,
        releaseVersion: data.release_version_id || undefined,
      };
    },
    enabled: !!incidentId,
  });
}

function mapPriority(severity: string | null): 'critical' | 'high' | 'medium' | 'low' {
  switch (severity) {
    case 'SEV1': return 'critical';
    case 'SEV2': return 'high';
    case 'SEV3': return 'medium';
    case 'SEV4': return 'low';
    default: return 'medium';
  }
}
