/**
 * ProjectHub Board Canvas wrapper — resolves project key to ID
 * then renders the shared BoardCanvasPage
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BoardCanvasPage from '@/components/boards/BoardCanvasPage';

export default function ProjectBoardCanvasPage() {
  const { key, boardId } = useParams<{ key: string; boardId: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-for-boards', key],
    queryFn: async () => {
      if (!key) return null;
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      if (error) { console.warn(error.message); return null; }
      return data;
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

  return <BoardCanvasPage projectIdOverride={project.id} basePath={`/project-hub/${key}/boards`} />;
}
