/**
 * StoryDetailPage — Canonical full-page route for any work item by UUID.
 *
 * Route: /project-hub/:key/story/:itemId
 *
 * Part of the Story View unification (2026-04-19). This page was previously
 * a `<Navigate>` redirect back to the story backlog, which left the URL as
 * dead weight. It is now a thin resolver that looks up the issue by UUID
 * in ph_issues and defers to CatalystDetailRouter in fullPageMode — the same
 * canonical structure used by /project-hub/:key/issue/:issueKey. This
 * collapses the legacy full-page "StoryDetailView" hand-roll onto the
 * canonical CatalystViewBase tree.
 *
 * Why UUID (itemId) here vs. issue_key in IssueDetailPage:
 *   - Subtask rows and linked-issue rows already emit /story/:id by UUID
 *     (see StoryDetailView legacy + SubtasksPanel navigation).
 *   - IssueDetailPage owns the human-readable /issue/:issueKey slug.
 *   - Both pages land on CatalystDetailRouter with fullPageMode=true.
 */
import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

interface ResolvedIssue {
  id: string;
  issue_type: string;
  project_key: string;
  issue_key: string;
}

export default function StoryDetailPage() {
  const { key: projectKey, itemId } = useParams<{ key: string; itemId: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<ResolvedIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    if (!itemId) {
      setDebugInfo('No itemId from URL params');
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
          .select('id, issue_type, project_key, issue_key')
          .eq('id', itemId)
          .is('deleted_at', null)
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
          setLoading(false);
          return;
        }

        // Fallback: catalyst_issues (in-app created items like BAU-1)
        const catRes = await (supabase as any)
          .from('catalyst_issues')
          .select('id, issue_type, issue_key, project_id, projects(key)')
          .eq('id', itemId)
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
          setLoading(false);
          return;
        }

        setDebugInfo(`Query returned null. itemId="${itemId}" not found in ph_issues or catalyst_issues.`);
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
  }, [itemId]);

  const openDetail = useGlobalSearchStore((s) => s.openDetail);
  const handleOpenItem = (newItemId: string) => {
    openDetail({ id: newItemId, projectKey });
  };

  const handleClose = () => {
    if (projectKey) {
      navigate(`/project-hub/${projectKey}/story-backlog`);
    } else {
      navigate(-1);
    }
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
        <span style={{ fontSize: 16, fontWeight: 600, color: '#344054' }}>Work item not found</span>
        <span style={{ fontSize: 13, color: '#5E6C84' }}>itemId {itemId} could not be found or has been deleted.</span>
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
      <CatalystPageHeader title="Story Backlog" />
      <div style={{ flex: 1, minHeight: 0 }}>
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
    </div>
  );
}
