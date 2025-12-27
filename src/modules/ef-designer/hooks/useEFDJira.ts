import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JiraConnection {
  id: string;
  name: string;
  status: string;
}

interface JiraProject {
  id: string;
  jira_project_key: string;
  jira_project_name: string;
}

interface JiraEpic {
  id: string;
  jira_key: string;
  summary: string;
  description: string | null;
  status: string;
}

// Fetch available Jira connections
export function useJiraConnections() {
  return useQuery<JiraConnection[]>({
    queryKey: ['jira-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jira_connections')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return (data || []).map((c: any) => ({ ...c, status: 'connected' })) as JiraConnection[];
    },
  });
}

// Fetch projects for a Jira connection
export function useJiraProjects(connectionId: string | null) {
  return useQuery<JiraProject[]>({
    queryKey: ['jira-projects', connectionId],
    enabled: !!connectionId,
    queryFn: async () => {
      if (!connectionId) return [];
      const { data, error } = await supabase
        .from('jira_project_mappings')
        .select('id, jira_project_key, jira_project_name')
        .eq('connection_id', connectionId)
        .order('jira_project_name');
      if (error) throw error;
      return (data || []) as JiraProject[];
    },
  });
}

// Fetch epics from synced Catalyst epics that came from Jira
export function useJiraEpics(projectKey: string | null) {
  return useQuery<JiraEpic[]>({
    queryKey: ['jira-epics', projectKey],
    enabled: !!projectKey,
    queryFn: async () => {
      if (!projectKey) return [];
      
      // Get epics from the epics table that have a jira reference
      const { data, error } = await supabase
        .from('epics')
        .select('id, epic_key, name, description, status')
        .not('epic_key', 'is', null)
        .ilike('epic_key', `${projectKey}%`)
        .is('deleted_at', null)
        .order('epic_key')
        .limit(50);
      
      if (error) throw error;
      
      // Map to JiraEpic interface
      return (data || []).map((e: any) => ({
        id: e.id,
        jira_key: e.epic_key || '',
        summary: e.name,
        description: e.description,
        status: e.status || 'Funnel',
      }));
    },
  });
}

// Import epics from Jira into EFD session
export function useImportJiraEpics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      jiraEpics,
    }: {
      sessionId: string;
      jiraEpics: JiraEpic[];
    }) => {
      if (jiraEpics.length === 0) {
        throw new Error('No epics selected');
      }

      const epicsToInsert = jiraEpics.map((epic, index) => ({
        session_id: sessionId,
        epic_key: `IMP-${index + 1}`,
        name: epic.summary,
        description: epic.description || null,
        state: 'Funnel' as const,
        is_selected_for_features: true,
        lbc_hypothesis: `Imported from Jira: ${epic.jira_key}`,
      }));

      const { data, error } = await supabase
        .from('efd_epics')
        .insert(epicsToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['efd-epics', variables.sessionId] });
      toast.success(`Imported ${data?.length || 0} epics from Jira`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import epics');
    },
  });
}
