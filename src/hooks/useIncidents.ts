import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Incident, IncidentFormData, IncidentFilters, IncidentComment, CommentType } from '@/types/incident';

// Fetch all incidents with optional filters
export function useIncidents(filters?: IncidentFilters) {
  return useQuery({
    queryKey: ['incidents', filters],
    queryFn: async () => {
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

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.severity?.length) {
        query = query.in('severity', filters.severity);
      }
      if (filters?.support_level?.length) {
        query = query.in('support_level', filters.support_level);
      }
      if (filters?.delivery_stage?.length) {
        query = query.in('delivery_stage', filters.delivery_stage);
      }
      if (filters?.release_version_id) {
        query = query.eq('release_version_id', filters.release_version_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform data to match types (sla comes as array, take first)
      return (data || []).map(item => ({
        ...item,
        sla: Array.isArray(item.sla) ? item.sla[0] : item.sla,
      })) as Incident[];
    },
  });
}

// Fetch single incident with all related data
export function useIncident(id: string) {
  return useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          release_version:release_versions(*),
          assignee:incident_user_profiles!incidents_assignee_id_fkey(*, workgroup:workgroups(*)),
          reporter:incident_user_profiles!incidents_reporter_id_fkey(*),
          assignee_workgroup:workgroups(*),
          business_process:business_processes(*),
          project:projects!incidents_project_id_fkey(id, name, key),
          committee:incident_committees!incidents_committee_id_fkey(
            *,
            members:committee_members(
              *,
              user:incident_user_profiles(*),
              vote:committee_votes(*)
            )
          ),
          sla:sla_records(*)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;

      // Fetch labels separately due to junction table
      const { data: labelData } = await supabase
        .from('incident_labels')
        .select('label:incident_label_defs(*)')
        .eq('incident_id', id);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('incident_comments')
        .select('*, author:incident_user_profiles(*)')
        .eq('incident_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Fetch attachments
      const { data: attachmentsData } = await supabase
        .from('incident_attachments')
        .select('*, uploader:incident_user_profiles(*)')
        .eq('incident_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Fetch history
      const { data: historyData } = await supabase
        .from('incident_history')
        .select('*, changer:incident_user_profiles(*)')
        .eq('incident_id', id)
        .order('changed_at', { ascending: false });

      // Transform data to match types
      const transformedData = {
        ...data,
        sla: Array.isArray(data.sla) ? data.sla[0] : data.sla,
        committee: data.committee ? {
          ...data.committee,
          members: data.committee.members?.map((m: { vote?: unknown[]; [key: string]: unknown }) => ({
            ...m,
            vote: Array.isArray(m.vote) ? m.vote[0] : m.vote,
          })),
        } : undefined,
        labels: labelData?.map(l => l.label) || [],
        comments: commentsData || [],
        attachments: attachmentsData || [],
        history: historyData || [],
      };

      return transformedData as unknown as Incident;
    },
    enabled: !!id,
  });
}

// Create incident
export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: IncidentFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: incident, error } = await supabase
        .from('incidents')
        .insert({
          ...data,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

// Update incident
export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IncidentFormData> & Record<string, unknown> }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: incident, error } = await supabase
        .from('incidents')
        .update({
          ...data,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return incident;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
    },
  });
}

// Add comment
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      incident_id, 
      content, 
      comment_type = 'update' 
    }: { 
      incident_id: string; 
      content: string; 
      comment_type?: CommentType;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('incident_comments')
        .insert({
          incident_id,
          content,
          comment_type,
          author_id: user?.id,
        })
        .select('*, author:incident_user_profiles(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { incident_id }) => {
      queryClient.invalidateQueries({ queryKey: ['incident', incident_id] });
    },
  });
}

// Fetch workgroups
export function useWorkgroups() {
  return useQuery({
    queryKey: ['workgroups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workgroups')
        .select('*')
        .is('deleted_at', null);

      if (error) throw error;
      return data;
    },
  });
}

// Fetch release versions
export function useReleaseVersions() {
  return useQuery({
    queryKey: ['release_versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_versions')
        .select('*')
        .order('version', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Fetch incident labels
export function useIncidentLabels() {
  return useQuery({
    queryKey: ['incident_labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_label_defs')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}
