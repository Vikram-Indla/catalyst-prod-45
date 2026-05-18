/**
 * InvestorJourneyDetailPage — /product-hub/INV/backlog/:issueKey
 *
 * Full-page detail view for INV backlog items. Mirrors BacklogDetailPage
 * exactly but scopes back/open navigation to /product-hub/INV/backlog
 * instead of /project-hub/:key/backlog.
 */
import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIssueDocumentTitle } from '@/hooks/useIssueDocumentTitle';

const CatalystDetailRouter = lazy(() =>
  import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

const BACKLOG_URL = '/product-hub/INV/backlog';

interface ResolvedIssue {
  id: string;
  issue_type: string;
  project_key: string;
  issue_key: string;
  summary: string | null;
}

export default function InvestorJourneyDetailPage() {
  const { issueKey } = useParams<{ issueKey: string }>();
  const navigate = useNavigate();

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
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, issue_type, project_key, summary')
        .eq('issue_key', issueKey)
        .maybeSingle();
      if (cancelled) return;
      setIssue((data as ResolvedIssue | null) ?? null);
      if (!data) setDebugInfo(`issue_key "${issueKey}" not found in ph_issues`);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [issueKey]);

  const handleOpenItem = (itemId: string) => navigate(`${BACKLOG_URL}/${itemId}`);
  const handleClose = () => navigate(BACKLOG_URL);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5E6C84', fontFamily: 'var(--cp-font-body)' }}>
        Loading…
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--cp-font-body)', gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#344054' }}>Issue not found</span>
        <span style={{ fontSize: 13, color: '#5E6C84' }}>{issueKey} could not be found.</span>
        {debugInfo && (
          <span style={{ fontSize: 11, color: '#DE350B', fontFamily: 'var(--cp-font-mono)', maxWidth: 600, textAlign: 'center', padding: '8px 12px', background: '#FFF5F5', border: '1px solid #FFCDD2', borderRadius: 4 }}>
            {debugInfo}
          </span>
        )}
        <button onClick={handleClose} style={{ marginTop: 8, padding: '8px 16px', background: 'var(--ds-text-brand, #2563EB)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Back to backlog
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, padding: '8px 24px', background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' }}>
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
