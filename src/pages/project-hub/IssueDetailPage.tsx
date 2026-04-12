/**
 * IssueDetailPage — Full-page view for any work item type.
 *
 * Route: /project-hub/:key/issue/:issueKey
 * Resolves :issueKey to an item ID via ph_issues, then renders
 * CatalystDetailRouter in fullPageMode (no modal overlay, fills viewport).
 */
import { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

export default function IssueDetailPage() {
  const { key: projectKey, issueKey } = useParams<{ key: string; issueKey: string }>();
  const navigate = useNavigate();

  // Look up issue by issue_key to get the ID and type
  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue-detail-page', issueKey],
    enabled: !!issueKey,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_type, project_key')
        .eq('issue_key', issueKey!)
        .is('deleted_at', null)
        .maybeSingle();
      return data;
    },
    staleTime: 120000,
  });

  const openDetail = useGlobalSearchStore(s => s.openDetail);

  const handleOpenItem = (itemId: string) => {
    openDetail({ id: itemId, projectKey: projectKey });
  };

  const handleClose = () => {
    navigate(`/project-hub/${projectKey}/list`);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'Inter, sans-serif', color: '#5E6C84' }}>
        Loading...
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'Inter, sans-serif', gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#344054' }}>Issue not found</span>
        <span style={{ fontSize: 13, color: '#5E6C84' }}>{issueKey} could not be found or has been deleted.</span>
        <button
          onClick={() => navigate(`/project-hub/${projectKey}/list`)}
          style={{ marginTop: 8, padding: '8px 16px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Suspense fallback={null}>
        <CatalystDetailRouter
          isOpen={true}
          onClose={handleClose}
          itemId={issue.id}
          projectKey={issue.project_key || projectKey || ''}
          itemType={issue.issue_type}
          fullPageMode={true}
          onOpenItem={handleOpenItem}
        />
      </Suspense>
    </div>
  );
}
