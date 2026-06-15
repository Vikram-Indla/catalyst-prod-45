/**
 * HubItemDetailPage — canonical full-page detail wrapper for any hub.
 *
 * Resolves a `:issueKey` URL param against, in order:
 *   1. ph_issues          (project-style items — used by both hubs)
 *   2. business_requests  (canonical product-hub store, keyed by request_key)
 *   3. catalyst_issues    (legacy fallback)
 *
 * Then renders the matching `CatalystDetailRouter` view in full-page mode.
 *
 * Used by:
 *   - /project-hub/:key/timeline/:issueKey   (project timeline)
 *   - /product-hub/:key/backlog/:issueKey    (product backlog)
 *   - /product-hub/:key/timeline/:issueKey   (product timeline)
 *
 * Pages pass `buildBackHref` and `buildItemHref` so the back button + related
 * item navigation route to the correct surface.
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

export interface HubItemDetailPageProps {
  /** Builds the back-button URL from the `:key` URL param. */
  buildBackHref: (key: string) => string;
  /** Builds the route to open a related item (clicking inside the detail view). */
  buildItemHref: (key: string, issueKey: string) => string;
  /** Label shown on the back button (default: "Back"). */
  backLabel?: string;
}

export default function HubItemDetailPage({
  buildBackHref,
  buildItemHref,
  backLabel = 'Back',
}: HubItemDetailPageProps) {
  const { key: ownerKey, issueKey } = useParams<{ key: string; issueKey: string }>();
  const navigate = useNavigate();

  const backHref = buildBackHref(ownerKey ?? '');

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

      /* 1) ph_issues — covers project items + any project-style items a product carries. */
      const { data: phRow } = await (supabase as any)
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

      /* 2) business_requests — canonical product-hub store, keyed by request_key.
            business_requests has no `project_key` column; the URL owner-key fills it. */
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
          project_key: ownerKey ?? '',
          summary: brRow.title ?? null,
        });
        setLoading(false);
        return;
      }

      /* 3) catalyst_issues — legacy fallback. */
      const { data: catRow } = await (supabase as any)
        .from('catalyst_issues')
        .select('id, issue_type, issue_key, project_id, summary, projects(key)')
        .eq('issue_key', issueKey)
        .maybeSingle();
      if (cancelled) return;
      if (catRow) {
        setIssue({
          id: catRow.id,
          issue_type: catRow.issue_type,
          project_key: catRow.projects?.key ?? ownerKey ?? '',
          issue_key: catRow.issue_key,
          summary: catRow.summary ?? null,
        });
        setLoading(false);
        return;
      }

      setDebugInfo(`"${issueKey}" not found in ph_issues, business_requests or catalyst_issues`);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [issueKey, ownerKey]);

  const handleOpenItem = (itemId: string) => navigate(buildItemHref(ownerKey ?? '', itemId));
  const handleClose = () => navigate(backHref);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ds-text-subtle, #42526E)', fontFamily: 'var(--ds-font-family-body)' }}>
        Loading…
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--ds-font-family-body)', gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>Issue not found</span>
        <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)' }}>{issueKey} could not be found.</span>
        {debugInfo && (
          <span style={{ fontSize: 11, color: 'var(--ds-text-danger, #AE2A19)', fontFamily: 'var(--ds-font-family-code, monospace)', maxWidth: 600, textAlign: 'center', padding: '8px 12px', background: 'var(--ds-background-danger, #FFECEB)', border: `1px solid var(--ds-border-danger, #FF8F73)`, borderRadius: 4 }}>
            {debugInfo}
          </span>
        )}
        <button onClick={handleClose} style={{ marginTop: 8, padding: '8px 16px', background: 'var(--ds-background-brand-bold, #0052CC)', color: 'var(--ds-text-inverse, #FFFFFF)', border: 'none', borderRadius: 3, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          {backLabel}
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
          {backLabel}
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
