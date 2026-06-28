/**
 * BacklogDetailPage — Full-page detail view for backlog items.
 *
 * Route: /project-hub/:key/backlog/:issueKey
 *
 * Differs from IssueDetailPage in:
 * - Preserves scroll position on BacklogPage when user returns (via sessionStorage)
 * - Back-button navigates to /project-hub/:key/backlog (not /list)
 * - Restores scroll position before rendering detail
 *
 * Reference: IssueDetailPage.tsx (same structure, different scroll logic)
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

export default function BacklogDetailPage() {
  const { key: projectKey, issueKey } = useParams<{ key: string; issueKey: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<ResolvedIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  // jira-compare 2026-05-16: dynamic document.title parity with Jira
  // ("[BAU-5922] Server error... · Catalyst" instead of "Backlog · Catalyst")
  useIssueDocumentTitle({
    issueKey,
    summary: issue?.summary,
    isLoading: loading,
    isError: false,
    isNotFound: !loading && !issue,
  });

  // Store scroll position before navigating away
  useEffect(() => {
    return () => {
      // Save scroll position when component unmounts (user navigated away)
      const container = document.querySelector('[data-backlog-scroll-container]');
      if (container && projectKey) {
        sessionStorage.setItem(`backlog-scroll-${projectKey}`, Math.max(0, container.scrollTop).toString());
      }
    };
  }, [projectKey]);

  useEffect(() => {
    if (!issueKey) {
      setDebugInfo('No issueKey from URL params');
      setLoading(false);
      return;
    }

    setIssue(null);
    setLoading(true);
    setDebugInfo('');

    let cancelled = false;

    async function resolve() {
      try {
        const result = await (supabase as any)
          .from('ph_issues')
          .select('*')
          .eq('issue_key', issueKey)
          .maybeSingle();

        if (cancelled) return;

        const { data, error } = result;

        if (error) {
          setDebugInfo(`Supabase error: ${JSON.stringify(error)}`);
          setLoading(false);
          return;
        }

        if (data) {
          setIssue({
            id: data.id,
            issue_type: data.issue_type,
            project_key: data.project_key,
            issue_key: data.issue_key,
            summary: data.summary ?? null,
          });
          setDebugInfo('');
          setLoading(false);
          return;
        }

        // Fallback: catalyst_issues (in-app created items)
        const catRes = await (supabase as any)
          .from('catalyst_issues')
          .select('id, issue_type, issue_key, project_id, summary, projects(key)')
          .eq('issue_key', issueKey)
          .maybeSingle();
        if (cancelled) return;
        const catRow = catRes.data;
        if (catRow) {
          setIssue({
            id: catRow.id,
            issue_type: catRow.issue_type,
            project_key: catRow.projects?.key ?? projectKey ?? '',
            issue_key: catRow.issue_key,
            summary: catRow.summary ?? null,
          });
          setDebugInfo('');
          setLoading(false);
          return;
        }

        setDebugInfo(`Query returned null. issue_key="${issueKey}" not found in ph_issues or catalyst_issues.`);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setDebugInfo(`Exception: ${err?.message || String(err)}`);
          setLoading(false);
        }
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [issueKey]);

  const handleOpenItem = (itemId: string) => {
    navigate(`/project-hub/${projectKey}/backlog/${itemId}`);
  };

  const handleClose = () => {
    // Back to backlog list (not /list)
    navigate(`/project-hub/${projectKey}/backlog`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--cp-font-body)', color: 'var(--ds-text-subtle, #44546F)' }}>
        Loading…
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--cp-font-body)', gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#344054' }}>Issue not found</span> // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
        <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #5E6C84)' }}>{issueKey} could not be found or has been deleted.</span>
        {debugInfo && (
          <span style={{ fontSize: 11, color: 'var(--ds-text-danger, #DE350B)', fontFamily: 'var(--cp-font-mono)', maxWidth: 600, textAlign: 'center', padding: '8px 12px', background: 'var(--ds-background-danger, #FFF5F5)', border: '1px solid var(--ds-border-danger, #FFCDD2)', borderRadius: 4 }}>
            {debugInfo}
          </span>
        )}
        <button
          onClick={handleClose}
          style={{ marginTop: 8, padding: '8px 16px', background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--cp-font-body)' }}
        >
          Back to backlog
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
