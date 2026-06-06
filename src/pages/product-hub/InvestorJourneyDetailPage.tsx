/**
 * ProductBacklogDetailPage — /product-hub/:key/backlog/:issueKey
 *
 * Full-page detail view for product-hub backlog items. Mirrors the project
 * hub's BacklogDetailPage but resolves the row against BOTH `ph_issues`
 * (for any project-style items a product may still carry) AND
 * `business_requests` by `request_key` — the canonical store for product
 * work. Back/open navigation is scoped to the current product code from
 * the URL, not a hardcoded value.
 *
 * Note: file is still named InvestorJourneyDetailPage.tsx for git history;
 * exported default has been generalised — the lazy import in
 * FullAppRoutes (`ProductBacklogDetailPage`) is the public name.
 */
import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIssueDocumentTitle } from '@/hooks/useIssueDocumentTitle';

const CatalystDetailRouter = lazy(() =>
  import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

interface ResolvedIssue {
  id: string;
  issue_type: string;
  project_key: string;
  issue_key: string;
  summary: string | null;
}

export default function InvestorJourneyDetailPage() {
  const { key: productKey, issueKey } = useParams<{ key: string; issueKey: string }>();
  const navigate = useNavigate();

  const backlogUrl = `/product-hub/${productKey ?? ''}/backlog`;

  const [issue, setIssue] = useState<ResolvedIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  useIssueDocumentTitle({
    issueKey,
    summary: issue?.summary,
    isLoading: loading,
    isError: false,
    isNotFound: !loading && !issue,
  });

  useEffect(() => {
    if (!issueKey) { setDebugInfo('No issueKey in URL'); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setIssue(null);
      setDebugInfo('');

      // 1) Try ph_issues (project-style items a product may carry).
      const { data: phRow } = await supabase
        .from('ph_issues')
        .select('id, issue_key, issue_type, project_key, summary')
        .eq('issue_key', issueKey)
        .maybeSingle();
      if (cancelled) return;
      if (phRow) {
        setIssue(phRow as ResolvedIssue);
        setLoading(false);
        return;
      }

      // 2) Fallback to business_requests (the canonical product-hub store).
      //    `:issueKey` from the URL is the BR's request_key (e.g. "MIM-001").
      //    `business_requests` has no `project_key` column — the product code
      //    from the URL fills that slot for CatalystDetailRouter / v3.
      const { data: brRow } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, title')
        .eq('request_key', issueKey)
        .maybeSingle();
      if (cancelled) return;
      if (brRow) {
        setIssue({
          id: brRow.id,
          issue_key: brRow.request_key,
          issue_type: 'Business Request',
          project_key: productKey ?? '',
          summary: brRow.title ?? null,
        });
        setLoading(false);
        return;
      }

      setDebugInfo(
        `"${issueKey}" not found in ph_issues or business_requests`,
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [issueKey, productKey]);

  const handleOpenItem = (itemId: string) => navigate(`${backlogUrl}/${itemId}`);
  const handleClose = () => navigate(backlogUrl);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ds-text-subtle, #42526E)', fontFamily: 'var(--cp-font-body)' }}>
        Loading…
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--cp-font-body)', gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>Issue not found</span>
        <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)' }}>{issueKey} could not be found.</span>
        {debugInfo && (
          <span style={{ fontSize: 11, color: 'var(--ds-text-danger, #AE2A19)', fontFamily: 'var(--cp-font-mono)', maxWidth: 600, textAlign: 'center', padding: '8px 12px', background: 'var(--ds-background-danger, #FFECEB)', border: `1px solid var(--ds-border-danger, #FF8F73)`, borderRadius: 4 }}>
            {debugInfo}
          </span>
        )}
        <button onClick={handleClose} style={{ marginTop: 8, padding: '8px 16px', background: 'var(--ds-background-brand-bold, #0052CC)', color: 'var(--ds-text-inverse, #FFFFFF)', border: 'none', borderRadius: 3, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          Back to backlog
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, padding: '8px 24px', background: 'var(--ds-elevation-surface, #FFFFFF)' }}>
        <button
          onClick={handleClose}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, fontSize: 14, color: 'var(--ds-text-subtle, #505258)', cursor: 'pointer', fontFamily: 'inherit' }}
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
            projectKey={issue.project_key}
            itemType={issue.issue_type}
            fullPageMode={true}
            onOpenItem={handleOpenItem}
          />
        </Suspense>
      </div>
    </div>
  );
}
