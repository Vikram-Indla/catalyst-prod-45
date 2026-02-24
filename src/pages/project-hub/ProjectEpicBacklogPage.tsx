/**
 * ProjectHub Epic Backlog — wraps src/modules/backlog/ BacklogWorkspace
 * Maps project-hub :key context to the Epic Backlog module.
 */
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BacklogStateProvider } from '@/modules/backlog/hooks/useBacklogState';
import { BacklogWorkspace } from '@/modules/backlog/components/BacklogWorkspace';

export default function ProjectEpicBacklogPage() {
  const { key } = useParams<{ key: string }>();

  // Look up ph_project to get its id, then find linked program
  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-epic-backlog', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      return data;
    },
    enabled: !!key,
  });

  // Try to find a matching program (projects table) by key
  const { data: programProject } = useQuery({
    queryKey: ['program-for-project-key', key],
    queryFn: async () => {
      if (!key) return null;
      // Try matching by key
      const { data } = await supabase
        .from('projects')
        .select('id, program_id, key, name')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      return data;
    },
    enabled: !!key,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading Epic Backlog...</div>;
  }

  // Use the program_id from the matching project, or fall back to ph_project id
  const contextId = programProject?.program_id || programProject?.id || project?.id;

  if (!contextId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-lg font-semibold">Epic Backlog</p>
        <p className="mt-2">No linked program found for project {key?.toUpperCase()}.</p>
      </div>
    );
  }

  return (
    <BacklogStateProvider
      key={contextId}
      initialScope="program"
      initialType="epic"
      contextId={contextId}
      isEpicBacklog={true}
      programId={contextId}
    >
      <BacklogWorkspace />
    </BacklogStateProvider>
  );
}
