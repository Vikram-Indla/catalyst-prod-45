/**
 * ProjectHub Board Manager wrapper — resolves project key to ID
 * then renders the shared BoardManagerPage
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import BoardManagerPage from '@/components/boards/BoardManagerPage';

export default function ProjectBoardManagerPage() {
  const { key } = useParams<{ key: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-for-boards', key],
    queryFn: async () => {
      if (!key) return null;
      const { data: phProject, error: phErr } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      if (phErr || !phProject) { console.warn(phErr?.message ?? 'ph_project not found'); return null; }
      return { id: phProject.id, key: phProject.key, name: phProject.name };
    },
    enabled: !!key,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 32 }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 32, color: 'var(--ds-text-subtlest)' }}>
        Project not found
      </div>
    );
  }

  return (
    <BoardManagerPage
      projectIdOverride={project.id}
      basePath={`/project-hub/${key}/boards`}
      projectName={project.name}
      projectKey={project.key}
    />
  );
}
