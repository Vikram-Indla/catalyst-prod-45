/**
 * HierarchyAllWorkPage — 3-column issue view at /project-hub/:key/hierarchy/allwork
 * Header pattern from StoryBacklogPage (title + subtitle)
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import { IssueViewShell } from '@/components/workhub/issue-view/IssueViewShell';

export default function HierarchyAllWorkPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;

  const { data: project } = useQuery({
    queryKey: ['project-meta', projectKey],
    enabled: !!projectKey,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, key')
        .eq('key', projectKey!)
        .maybeSingle();
      return data;
    },
  });

  const projectName = project?.name || projectKey || '';

  if (!projectKey) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="font-body text-sm" style={{ color: '#6B6E76' }}>
          No project key provided.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: tk.pageBg }}>
      {/* ── Title + Subtitle (Story Backlog pattern) ── */}
      <div className="px-6 pt-5 pb-3 border-b flex-shrink-0" style={{ borderColor: tk.border }}>
        <h1 className="text-xl font-semibold" style={{ color: tk.t1, fontFamily: "'Sora', sans-serif", fontWeight: 650 }}>
          {projectName} All Work
        </h1>
        <p className="text-sm mt-0.5" style={{ color: tk.t2 }}>
          All issues and work items across the project
        </p>
      </div>

      {/* ── 3-column split view ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <IssueViewShell
          projectKey={projectKey}
          storageKey={`allwork.${projectKey}.layoutWidths`}
        />
      </div>
    </div>
  );
}
