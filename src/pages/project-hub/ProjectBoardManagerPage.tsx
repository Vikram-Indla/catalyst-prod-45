/**
 * ProjectHub Board Manager wrapper — resolves project key to ID
 * then renders the shared BoardManagerPage
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      // Then resolve to projects table ID (boards FK references projects, not ph_projects)
      const { data: project } = await (supabase as any)
        .from('projects')
        .select('id, name')
        .ilike('name', phProject.name)
        .maybeSingle();
      return project ? { id: project.id, key: phProject.key, name: phProject.name } : { id: phProject.id, key: phProject.key, name: phProject.name };
    },
    enabled: !!key,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2563EB' }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B', fontSize: 13 }}>
        Project not found
      </div>
    );
  }

  return <BoardManagerPage projectIdOverride={project.id} basePath={`/project-hub/${key}/boards`} />;
}
