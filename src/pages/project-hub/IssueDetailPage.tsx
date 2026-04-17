/**
 * IssueDetailPage — Full-page view for any work item type.
 *
 * Route: /project-hub/:key/issue/:issueKey
 *
 * Layout (padding-based, full-viewport below top nav):
 *   ┌─ [TicketBreadcrumbs row]           padding: 16px 24px
 *   ├─ [CatalystDetailRouter fullPage]   fills remaining height
 *   └─
 *
 * Breadcrumbs are source-aware — they reflect the backlog the user came from
 * (story/epic/feature) via router state, with sessionStorage fallback for
 * refresh survival. Deep links render a minimal breadcrumb.
 */
import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { useTheme } from '@/hooks/useTheme';
import { TicketBreadcrumbs } from '@/modules/project-work-hub/components/TicketBreadcrumbs';

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
  const { isDark } = useTheme();

  const [issue, setIssue] = useState<ResolvedIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  // Resolve project name for the breadcrumb. Non-blocking — falls back to key.
  const { data: project } = useQuery({
    queryKey: ['project-by-key-breadcrumb', projectKey],
    enabled: !!projectKey,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('name, key')
        .eq('key', projectKey!)
        .maybeSingle();
      return data as { name: string | null; key: string } | null;
    },
  });

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

        if (!data) {
          setDebugInfo(`Query returned null. issue_key="${issueKey}" not found in ph_issues.`);
          setLoading(false);
          return;
        }

        setIssue({
          id: data.id,
          issue_type: data.issue_type,
          project_key: data.project_key,
          issue_key: data.issue_key,
        });
        setDebugInfo('');
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

  const pageBg = isDark ? '#0A0A0A' : '#FFFFFF';
  const breadcrumbBorder = isDark ? '1px solid #2E2E2E' : '1px solid #EBECF0';

  // Outer page container — padding-based full-screen.
  const pageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: pageBg,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const breadcrumbRowStyle: React.CSSProperties = {
    flexShrink: 0,
    padding: '12px 24px',
    borderBottom: breadcrumbBorder,
    background: pageBg,
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  };

  // Resolve the best-available key/name for the breadcrumb, even before the
  // issue row loads — prevents layout flash on slow queries.
  const resolvedProjectKey = issue?.project_key || projectKey || '';
  const resolvedIssueKey = issue?.issue_key || issueKey || '';
  const showBreadcrumb = Boolean(resolvedProjectKey && resolvedIssueKey);

  if (loading) {
    return (
      <div style={pageStyle}>
        {showBreadcrumb && (
          <div style={breadcrumbRowStyle}>
            <TicketBreadcrumbs
              projectKey={resolvedProjectKey}
              projectName={project?.name || undefined}
              issueKey={resolvedIssueKey}
            />
          </div>
        )}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, sans-serif',
            color: isDark ? '#A1A1A1' : '#5E6C84',
            fontSize: 13,
          }}
        >
          Loading…
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={pageStyle}>
        {showBreadcrumb && (
          <div style={breadcrumbRowStyle}>
            <TicketBreadcrumbs
              projectKey={resolvedProjectKey}
              projectName={project?.name || undefined}
              issueKey={resolvedIssueKey}
            />
          </div>
        )}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, sans-serif',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#EDEDED' : '#344054' }}>Issue not found</span>
          <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#5E6C84' }}>
            {issueKey} could not be found or has been deleted.
          </span>
          {debugInfo && (
            <span
              style={{
                fontSize: 11,
                color: '#DE350B',
                fontFamily: "'JetBrains Mono', monospace",
                maxWidth: 600,
                textAlign: 'center',
                padding: '8px 12px',
                background: isDark ? '#2E1515' : '#FFF5F5',
                border: '1px solid #FFCDD2',
                borderRadius: 4,
              }}
            >
              {debugInfo}
            </span>
          )}
          <button
            onClick={handleClose}
            style={{
              marginTop: 8,
              padding: '8px 16px',
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Back to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={breadcrumbRowStyle}>
        <TicketBreadcrumbs
          projectKey={resolvedProjectKey}
          projectName={project?.name || undefined}
          issueKey={resolvedIssueKey}
        />
      </div>
      <div style={bodyStyle}>
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
