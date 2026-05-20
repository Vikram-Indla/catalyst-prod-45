/**
 * AllWorkDetailPage — Full-page detail view opened from global search.
 *
 * Route: /project-hub/:key/allwork/:issueKey
 *
 * Mirrors BacklogDetailPage: renders CatalystDetailRouter in fullPageMode
 * within the project-hub route tree so the BAU/ICP/etc project sidebar is
 * visible. Back-button returns to /project-hub/:key/allwork.
 */
import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIssueDocumentTitle } from '@/hooks/useIssueDocumentTitle';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

interface ResolvedIssue {
  id: string;
  issue_type: string;
  project_key: string;
  issue_key: string;
  summary: string | null;
}

export default function AllWorkDetailPage() {
  const { key: projectKey, issueKey } = useParams<{ key: string; issueKey: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<ResolvedIssue | null>(null);
  const [loading, setLoading] = useState(true);

  useIssueDocumentTitle({
    issueKey,
    summary: issue?.summary,
    isLoading: loading,
    isError: false,
    isNotFound: !loading && !issue,
  });

  useEffect(() => {
    if (!issueKey) { setLoading(false); return; }

    setIssue(null);
    setLoading(true);
    let cancelled = false;

    async function resolve() {
      try {
        const { data, error } = await (supabase as any)
          .from('ph_issues')
          .select('id, issue_key, issue_type, project_key, summary')
          .eq('issue_key', issueKey)
          .maybeSingle();

        if (cancelled) return;
        if (error) { setLoading(false); return; }

        if (data) {
          setIssue({ id: data.id, issue_type: data.issue_type, project_key: data.project_key, issue_key: data.issue_key, summary: data.summary ?? null });
          setLoading(false);
          return;
        }

        // Fallback: in-app created items
        const catRes = await (supabase as any)
          .from('catalyst_issues')
          .select('id, issue_type, issue_key, summary, projects(key)')
          .eq('issue_key', issueKey)
          .maybeSingle();
        if (cancelled) return;
        const catRow = catRes.data;
        if (catRow) {
          setIssue({ id: catRow.id, issue_type: catRow.issue_type, project_key: catRow.projects?.key ?? projectKey ?? '', issue_key: catRow.issue_key, summary: catRow.summary ?? null });
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [issueKey, projectKey]);

  const handleClose = () => navigate(`/project-hub/${projectKey}/allwork`);

  const handleOpenItem = (itemId: string) => {
    navigate(`/project-hub/${projectKey}/allwork/${itemId}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--cp-font-body)', color: '#5E6C84' }}>
        Loading…
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--cp-font-body)', gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#344054' }}>Issue not found</span>
        <span style={{ fontSize: 13, color: '#5E6C84' }}>{issueKey} could not be found or has been deleted.</span>
        <button
          onClick={handleClose}
          style={{ marginTop: 8, padding: '8px 16px', background: 'var(--ds-text-brand, #2563EB)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--cp-font-body)' }}
        >
          Back to work items
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={handleClose}
            itemId={issue.issue_key}
            projectKey={issue.project_key || projectKey || ''}
            itemType={issue.issue_type}
            fullPageMode={true}
            onOpenItem={handleOpenItem}
          />
        </Suspense>
      </div>
    </div>
  );
}
