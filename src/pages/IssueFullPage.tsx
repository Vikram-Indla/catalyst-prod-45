/**
 * IssueFullPage — Full-width issue detail inside CatalystShell.
 * Route: /issue/:issueKey  (inside shell — top nav visible, sidebar hidden)
 * 
 * Resolves the issue key from ph_issues, renders CatalystDetailRouter
 * in fullPageMode, and updates document.title to "[KEY] Summary".
 */
import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIssueDocumentTitle } from '@/hooks/useIssueDocumentTitle';
import { Loader2 } from 'lucide-react';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter')
);

interface ResolvedIssue {
  id: string;
  issue_type: string;
  project_key: string;
  summary: string | null;
}

export default function IssueFullPage() {
  const { issueKey } = useParams<{ issueKey: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<ResolvedIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorOccurred, setErrorOccurred] = useState(false);

  // Dynamic document.title
  useIssueDocumentTitle({
    issueKey,
    summary: issue?.summary,
    isLoading: loading,
    isError: errorOccurred,
    isNotFound: notFound,
  });

  useEffect(() => {
    if (!issueKey) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;
    setIssue(null);
    setLoading(true);
    setNotFound(false);
    setErrorOccurred(false);

    async function resolve() {
      try {
        const { data, error } = await (supabase as any)
          .from('ph_issues')
          .select('id, issue_type, project_key, summary')
          .eq('issue_key', issueKey)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error('[IssueFullPage] Supabase error:', error);
          setErrorOccurred(true);
          setLoading(false);
          return;
        }

        if (data) {
          setIssue({
            id: data.id,
            issue_type: data.issue_type,
            project_key: data.project_key,
            summary: data.summary,
          });
          setLoading(false);
          return;
        }

        // Fallback: catalyst_issues (in-app created items)
        const catRes = await (supabase as any)
          .from('catalyst_issues')
          .select('id, issue_type, issue_key, title, project_id, projects(key)')
          .eq('issue_key', issueKey)
          .maybeSingle();
        if (cancelled) return;
        const catRow = catRes.data;
        if (catRow) {
          setIssue({
            id: catRow.id,
            issue_type: catRow.issue_type,
            project_key: catRow.projects?.key ?? '',
            summary: catRow.title,
          });
          setLoading(false);
          return;
        }

        setNotFound(true);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          console.error('[IssueFullPage] Exception:', err);
          setErrorOccurred(true);
          setLoading(false);
        }
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [issueKey]);

  const handleClose = () => {
    // Try closing the tab first (works when opened via target="_blank")
    window.close();
    // Fallback: navigate to home if window.close() doesn't work
    setTimeout(() => navigate('/for-you', { replace: true }), 100);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: 400, fontFamily: 'var(--cp-font-body)', color: '#5E6C84',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' }} />
          <span style={{ fontSize: 14 }}>Loading {issueKey}…</span>
        </div>
      </div>
    );
  }

  if (notFound || errorOccurred || !issue) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: 400, fontFamily: 'var(--cp-font-body)', gap: 12,
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#344054' }}>
          {notFound ? 'Issue not found' : 'Error loading issue'}
        </span>
        <span style={{ fontSize: 13, color: '#5E6C84' }}>
          {issueKey} could not be found or has been deleted.
        </span>
        <button
          onClick={handleClose}
          style={{
            marginTop: 8, padding: '8px 16px', background: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
            border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Suspense fallback={null}>
        <CatalystDetailRouter
          isOpen={true}
          onClose={handleClose}
          itemId={issue.id}
          projectKey={issue.project_key}
          itemType={issue.issue_type}
          fullPageMode={true}
        />
      </Suspense>
    </div>
  );
}
