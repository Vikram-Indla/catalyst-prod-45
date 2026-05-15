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

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

interface ResolvedIssue {
  id: string;
  issue_type: string;
  project_key: string;
  issue_key: string;
}

export default function BacklogDetailPage() {
  const { key: projectKey, issueKey } = useParams<{ key: string; issueKey: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<ResolvedIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

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
          });
          setDebugInfo('');
          setLoading(false);
          return;
        }

        // Fallback: catalyst_issues (in-app created items)
        const catRes = await (supabase as any)
          .from('catalyst_issues')
          .select('id, issue_type, issue_key, project_id, projects(key)')
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
        {debugInfo && (
          <span style={{ fontSize: 11, color: '#DE350B', fontFamily: 'var(--cp-font-mono)', maxWidth: 600, textAlign: 'center', padding: '8px 12px', background: '#FFF5F5', border: '1px solid #FFCDD2', borderRadius: 4 }}>
            {debugInfo}
          </span>
        )}
        <button
          onClick={handleClose}
          style={{ marginTop: 8, padding: '8px 16px', background: 'var(--ds-text-brand, #2563EB)', color: 'var(--ds-surface, #FFFFFF)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--cp-font-body)' }}
        >
          Back to backlog
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Jira-parity: plain "← Back" link above the detail view, navigates back to backlog list */}
      <div style={{ flexShrink: 0, padding: '8px 24px', background: 'var(--ds-surface, #FFFFFF)' }}>
        <button
          onClick={handleClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--ds-text-subtle, #505258)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      </div>
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
