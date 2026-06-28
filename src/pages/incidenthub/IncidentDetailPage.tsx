/**
 * IncidentDetailPage — /incident-hub/view/:id
 *
 * 2026-06-16: rewritten to mount the canonical CatalystDetailRouter in
 * fullPageMode — same pattern as IssueFullPage (/browse/:key) and
 * BacklogDetailPage. Per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". Future improvements to project / product detail views
 * automatically propagate here.
 *
 * URL contract: :id is the ph_issues.id UUID (legacy — earlier links use
 * this). We resolve it to issue_key + issue_type, then pass itemId=key
 * to the canonical router because useCatalystIssue queries by issue_key.
 *
 * The bespoke chrome (stat cards, bespoke comment editor, custom Activity
 * tabs, "Resolve" button) is gone — those affordances live inside
 * CatalystViewIncident (the side-panel view we already wired) which now
 * also serves the full page via the same router.
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIssueDocumentTitle } from '@/hooks/useIssueDocumentTitle';
import { useDynamicFavicon } from '@/hooks/useDynamicFavicon';
import { Loader2 } from '@/lib/atlaskit-icons';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

interface ResolvedIncident {
  issueKey: string;
  issueType: string;
  projectKey: string;
  summary: string | null;
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<ResolvedIncident | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useIssueDocumentTitle({
    issueKey: incident?.issueKey,
    summary: incident?.summary,
    isLoading: loading,
    isError: false,
    isNotFound: notFound,
  });
  useDynamicFavicon(incident?.issueType);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let cancelled = false;
    setIncident(null);
    setLoading(true);
    setNotFound(false);
    (async () => {
      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select('id, issue_key, issue_type, project_key, summary')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setIncident({
        issueKey: data.issue_key,
        issueType: data.issue_type,
        projectKey: data.project_key,
        summary: data.summary,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleClose = () => {
    /* Try closing the tab first (works when opened via target="_blank"
       from a kebab menu / breadcrumb). Otherwise go back to the list. */
    window.close();
    setTimeout(() => navigate('/incident-hub', { replace: true }), 100);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: 400, fontFamily: 'var(--cp-font-body)',
        color: 'var(--ds-text-subtle)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--ds-text-brand)' }} />
          <span style={{ fontSize: 'var(--ds-font-size-400)' }}>Loading incident…</span>
        </div>
      </div>
    );
  }

  if (notFound || !incident) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: 400, fontFamily: 'var(--cp-font-body)', gap: 12,
      }}>
        <span style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text)' }}>
          Incident not found
        </span>
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
          The incident could not be found or has been deleted.
        </span>
        <button
          onClick={() => navigate('/incident-hub')}
          style={{
            marginTop: 8, padding: '8px 16px',
            background: 'var(--ds-text-brand)',
            color: 'var(--cp-bg-elevated)',
            border: 'none', borderRadius: 6, fontSize: 'var(--ds-font-size-300)', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
          }}
        >
          Back to incidents
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
          /* useCatalystIssue queries ph_issues by issue_key. Pass the key,
             not the UUID — same contract IssueFullPage / BacklogDetailPage use. */
          itemId={incident.issueKey}
          projectKey={incident.projectKey}
          itemType={incident.issueType}
          fullPageMode={true}
        />
      </Suspense>
    </div>
  );
}
