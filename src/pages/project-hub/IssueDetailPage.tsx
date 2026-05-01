/**
 * IssueDetailPage — Full-page view for any work item type.
 *
 * Route: /project-hub/:key/issue/:issueKey
 *
 * This page is a thin resolver. It looks up the issue by key, then defers to
 * CatalystDetailRouter in fullPageMode, which composes CatalystViewBase and
 * the type-specific view. The canonical breadcrumb is rendered inside
 * CatalystViewBase's top bar — we don't render one here. See
 * TicketBreadcrumbs.tsx for the breadcrumb contract.
 */
import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

interface ResolvedIssue {
  id: string;
  issue_type: string;
  project_key: string;
  issue_key: string;
}

export default function IssueDetailPage() {
  const { key: projectKey, issueKey } = useParams<{ key: string; issueKey: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<ResolvedIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

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

  const openDetail = useGlobalSearchStore((s) => s.openDetail);
  const handleOpenItem = (itemId: string) => {
    openDetail({ id: itemId, projectKey });
  };

  const handleClose = () => {
    if (projectKey) {
      navigate(`/project-hub/${projectKey}/list`);
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
          Back to list
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
