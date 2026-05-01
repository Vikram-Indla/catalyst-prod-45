/**
 * ProjectHub Board Manager wrapper — resolves project key to ID
 * then renders the shared BoardManagerPage
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import BoardManagerPage from '@/components/boards/BoardManagerPage';

export default function ProjectBoardManagerPage() {
  const { key } = useParams<{ key: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-for-boards', key],
    queryFn: async () => {
      if (!key) return null;
      // First get ph_project name
      const { data: phProject, error: phErr } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      if (phErr || !phProject) { console.warn(phErr?.message ?? 'ph_project not found'); return null; }
      // Try to resolve to projects table ID (boards FK references projects)
      const { data: project } = await typedQuery('projects')
        .select('id, name')
        .ilike('name', phProject.name)
        .maybeSingle();
      
      // Also check if boards exist directly under ph_projects.id
      const resolvedId = project?.id || phProject.id;
      console.log('[ProjectBoardManagerPage] phProject.id:', phProject.id, 'projects.id:', project?.id, 'using:', resolvedId);
      return { id: resolvedId, key: phProject.key, name: phProject.name };
    },
    enabled: !!key,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', fontSize: 13 }}>
        Project not found
      </div>
    );
  }

  return <BoardManagerPage projectIdOverride={project.id} basePath={`/project-hub/${key}/boards`} />;
}
