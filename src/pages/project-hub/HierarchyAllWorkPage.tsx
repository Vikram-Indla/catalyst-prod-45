/**
 * HierarchyAllWorkPage — 3-column issue view (DEPRECATED 2026-04-25).
 * Previously mounted at /project-hub/:key/hierarchy/allwork. That route now
 * redirects to /project-hub/:key/allwork (ProjectAllWorkView, Jira-parity).
 * Module retained for transitional reference until removal.
 * Header pattern from StoryBacklogPage (title + subtitle).
 */
import { useParams } from 'react-router-dom';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
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
    <div className="h-full min-h-0 flex flex-col overflow-hidden" style={{ background: tk.pageBg }}>
      {/* ── Title ── */}
      <CatalystPageHeader title={`${projectName} All Work`} />

      {/* ── 3-column split view ── */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <IssueViewShell
          projectKey={projectKey}
          storageKey={`allwork.${projectKey}.layoutWidths`}
        />
      </div>
    </div>
  );
}
