import React, { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import EpicBacklogPage from '@/modules/project-work-hub/pages/EpicBacklogPage';

export default function NativeEpicBacklogPage() {
  const { key } = useParams<{ key: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-by-key', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, program_id')
        .eq('key', key!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!key,
  });

  if (isLoading) {
    return <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-0)' }}><span style={{ color: 'var(--fg-3)', fontSize: 13 }}>Loading…</span></div>;
  }

  if (!project) {
    return <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-0)' }}><span style={{ color: '#DC2626', fontSize: 13 }}>Project not found</span></div>;
  }

  return <EpicBacklogPage projectId={project.id} />;
}
