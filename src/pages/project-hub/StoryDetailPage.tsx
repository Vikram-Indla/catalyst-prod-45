import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StoryDetailView from '@/modules/project-work-hub/pages/StoryDetailView';
import { Loader2 } from 'lucide-react';

export default function StoryDetailPage() {
  const { key, itemId } = useParams<{ key: string; itemId: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-by-key', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, key')
        .eq('key', key!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!key,
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
        <Loader2 size={16} className="animate-spin" style={{ color: '#878787' }} />
      </div>
    );
  }

  if (!project || !itemId) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
        <span style={{ color: '#DC2626', fontSize: 13 }}>Story not found</span>
      </div>
    );
  }

  return <StoryDetailView projectId={project.id} projectKey={project.key} itemId={itemId} />;
}
