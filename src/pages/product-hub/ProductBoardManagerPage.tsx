/**
 * ProductHub Board Manager — resolves product key to ph_projects id
 * then renders the shared BoardManagerPage.
 *
 * boards.project_id FKs to ph_projects, so we resolve via ph_projects.key.
 * INV/MINI/SEN/ENT exist as ph_projects rows (excluded from the project list
 * via excludedProjectKeys in useProjectHub.ts, but present in the DB).
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import BoardManagerPage from '@/components/boards/BoardManagerPage';

export default function ProductBoardManagerPage() {
  const { key } = useParams<{ key: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-for-product-boards', key],
    queryFn: async () => {
      if (!key) return null;
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      if (error || !data) { console.warn(error?.message ?? `ph_project not found for key: ${key}`); return null; }
      return { id: data.id, key: data.key, name: data.name };
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
        Product not found
      </div>
    );
  }

  return (
    <BoardManagerPage
      projectIdOverride={project.id}
      basePath={`/product-hub/${key}/boards`}
      projectName={project.name}
      projectKey={project.key}
    />
  );
}
