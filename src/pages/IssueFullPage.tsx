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
import { useDynamicFavicon } from '@/hooks/useDynamicFavicon';
import { Loader2 } from '@/lib/atlaskit-icons';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter')
);

interface ResolvedIssue {
  id: string;
  issue_key: string;
  issue_type: string;
  project_key: string;
  project_id: string | null;
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

  useDynamicFavicon(issue?.issue_type);

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
          .select('id, issue_key, issue_type, project_key, summary')
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
          // 2026-06-23 — resolve project UUID from project_key so child
          // surfaces (SubtasksPanel → EditableAssignee) can query
          // project_members. ph_issues stores project_key but not project_id;
          // we look it up in `projects` (Catalyst master) by key.
          let projectIdResolved: string | null = null;
          if (data.project_key) {
            const { data: projRow } = await (supabase as any)
              .from('projects')
              .select('id')
              .eq('key', data.project_key)
              .maybeSingle();
            if (!cancelled && projRow?.id) projectIdResolved = projRow.id;
          }
          setIssue({
            id: data.id,
            issue_key: data.issue_key,
            issue_type: data.issue_type,
            project_key: data.project_key,
            project_id: projectIdResolved,
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
            issue_key: catRow.issue_key,
            issue_type: catRow.issue_type,
            project_key: catRow.projects?.key ?? '',
            project_id: catRow.project_id ?? null,
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
        height: '100%', minHeight: 400, fontFamily: 'var(--cp-font-body)', color: 'var(--ds-text-subtle, #44546F)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' }} />
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
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #344054)' }}>
          {notFound ? 'Issue not found' : 'Error loading issue'}
        </span>
        <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #44546F)' }}>
          {issueKey} could not be found or has been deleted.
        </span>
        <button
          onClick={handleClose}
          style={{
            marginTop: 8, padding: '8px 16px', background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
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
          /* F-iter9 PK contract: useCatalystIssue queries ph_issues by
             .eq('issue_key', itemId). itemId MUST be the issue key string
             (e.g. "BAU-5824"), NOT the UUID `id` column. Sibling
             IssueDetailPage.tsx already follows this contract. */
          itemId={issue.issue_key}
          projectKey={issue.project_key}
          /* 2026-06-23 — pass resolved project UUID so child surfaces
             (SubtasksPanel → EditableAssignee) can scope project_members
             to this project. Without it, the assignee picker had no
             members and rendered as a disabled, non-opening trigger. */
          projectId={issue.project_id ?? undefined}
          itemType={issue.issue_type}
          fullPageMode={true}
          /* 2026-06-23 — wire child-item navigation: clicking a subtask /
             child key / summary in the SubtasksPanel routes through
             onOpenItem → /browse/<key>. Without this, SubtasksPanel's
             onSubtaskClick is undefined and clicks become no-ops. */
          onOpenItem={(key) => navigate(`/browse/${key}`)}
        />
      </Suspense>
    </div>
  );
}
