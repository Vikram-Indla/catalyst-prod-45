/**
 * FilterDashboardPage — filter-backed Executive Summary dashboard.
 *
 * Route: /project-hub/:key/dashboards/:id
 *   :key — project key (BAU etc.), breadcrumb + back navigation only
 *   :id  — filter_derived_views.id (UUID)
 *
 * Data flow:
 *   1. Load filter_derived_views row  → title + source_filter_id
 *   2. Load ph_saved_filters row      → jql_query
 *   3. useFilterDashboard(jql)        → DashboardMetrics via jqlRowsToDashboardMetrics
 *   4. Render 6 MetricCards + 2 WidgetShell proportion-bar breakdowns
 *
 * Flag gate: ENABLE_FILTER_TO_DASHBOARD (belt-and-suspenders; kebab is also gated).
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Button from '@atlaskit/button/new';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { WidgetShell } from '@/components/product-dashboard/WidgetShell';
import { ENABLE_FILTER_TO_DASHBOARD } from '@/lib/featureFlags';
import { supabase } from '@/integrations/supabase/client';
import { useFilterDashboard } from '@/components/dashboard/adapters/filterDashboardSource';

// ── Derived-view loader ───────────────────────────────────────────────────────

interface DerivedViewRow {
  id: string;
  title: string;
  source_filter_id: string;
}

function useDerivedView(id: string | undefined) {
  return useQuery({
    queryKey: ['filter-derived-view', id],
    queryFn: async (): Promise<DerivedViewRow> => {
      const { data, error } = await (supabase as any)
        .from('filter_derived_views')
        .select('id, title, source_filter_id')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as DerivedViewRow;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

interface FilterRow {
  id: string;
  jql_query: string;
}

function useSourceFilter(filterId: string | undefined) {
  return useQuery({
    queryKey: ['source-filter-jql', filterId],
    queryFn: async (): Promise<FilterRow> => {
      const { data, error } = await (supabase as any)
        .from('ph_saved_filters')
        .select('id, jql_query')
        .eq('id', filterId)
        .single();
      if (error) throw new Error(error.message);
      return data as FilterRow;
    },
    enabled: !!filterId,
    staleTime: 60_000,
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FilterDashboardPage() {
  const { key, id } = useParams<{ key: string; id: string }>();
  const navigate = useNavigate();

  if (!ENABLE_FILTER_TO_DASHBOARD) {
    return (
      <div style={{ padding: 32 }}>
        <SectionMessage appearance="warning" title="Feature unavailable">
          <p>This dashboard view is not available in your current environment.</p>
        </SectionMessage>
      </div>
    );
  }

  return <FilterDashboardPageInner projectKey={key ?? ''} viewId={id ?? ''} navigate={navigate} />;
}

// ── Inner (rendered after feature gate passes) ────────────────────────────────

interface InnerProps {
  projectKey: string;
  viewId: string;
  navigate: ReturnType<typeof useNavigate>;
}

function FilterDashboardPageInner({ projectKey, viewId, navigate }: InnerProps) {
  const viewQuery   = useDerivedView(viewId);
  const filterQuery = useSourceFilter(viewQuery.data?.source_filter_id);
  const jql         = filterQuery.data?.jql_query;
  const dashboard   = useFilterDashboard(jql);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (viewQuery.isLoading || filterQuery.isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
        <Spinner size="medium" />
        <span style={{ color: 'var(--ds-text-subtle, #42526E)', fontSize: 14 }}>Loading dashboard…</span>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (viewQuery.isError || filterQuery.isError || dashboard.isError) {
    const msg = (viewQuery.error ?? filterQuery.error ?? dashboard.error) as Error | null;
    return (
      <div style={{ padding: 24 }}>
        <SectionMessage appearance="error" title="Could not load dashboard">
          <p>{msg?.message ?? 'An unexpected error occurred. Please try refreshing the page.'}</p>
        </SectionMessage>
      </div>
    );
  }

  const title = viewQuery.data?.title ?? 'Dashboard';
  const m = dashboard.metrics;
  const maxStatus = Math.max(1, ...Object.values(m.byStatus));
  const maxOwner  = Math.max(1, ...m.byOwner.map(o => o.count));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <ProjectHeaderChip projectKey={projectKey} />
      <CatalystPageHeader
        title={title}
        actions={
          <Button
            appearance="subtle"
            onClick={() => navigate(`/project-hub/${projectKey}/filters`)}
          >
            ← Back to filters
          </Button>
        }
      />

      <div style={{ padding: '0 24px 24px' }}>
        {/* Truncation banner */}
        {dashboard.isTruncated && (
          <div style={{ marginBottom: 16 }}>
            <SectionMessage appearance="warning" title="Showing first 100 results">
              <p>
                Your filter matched {dashboard.totalCount} issues. Only the first 100 are included in these metrics.
                Refine your filter for a more focused view.
              </p>
            </SectionMessage>
          </div>
        )}

        {/* Metrics loading */}
        {dashboard.isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
            <Spinner size="small" />
            <span style={{ color: 'var(--ds-text-subtle, #42526E)', fontSize: 13 }}>Fetching metrics…</span>
          </div>
        )}

        {!dashboard.isLoading && (
          <>
            {/* 6 KPI cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <MetricCard label="Total issues"  value={m.total}       icon="package"      iconVariant="primary" animationDelay={0}   />
              <MetricCard label="Open"          value={m.open}        icon="play"         iconVariant="primary" animationDelay={50}  />
              <MetricCard label="Overdue"       value={m.overdue}     icon="bug"          iconVariant="danger"  animationDelay={100} />
              <MetricCard label="High risk"     value={m.highRisk}    icon="target"       iconVariant="warning" animationDelay={150} />
              <MetricCard label="Due this week" value={m.dueThisWeek} icon="check-circle" iconVariant="warning" animationDelay={200} />
              <MetricCard label="No owner"      value={m.noOwner}     icon="package"      iconVariant="teal"    animationDelay={250} />
            </div>

            {/* Breakdown widgets — only shown when there is data */}
            {m.total > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* By status */}
                <WidgetShell title="By status" aria-label="Issues by status">
                  <div style={{ padding: '8px 0' }}>
                    {Object.entries(m.byStatus).map(([status, count]) => (
                      <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{
                          minWidth: 120, maxWidth: 120, fontSize: 13,
                          color: 'var(--ds-text-subtle, #42526E)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {status}
                        </span>
                        <div style={{ flex: 1, background: 'var(--ds-background-neutral, #F1F2F4)', borderRadius: 3, height: 8 }}>
                          <div style={{
                            width: `${(count / maxStatus) * 100}%`,
                            background: 'var(--ds-background-information-bold, #0052CC)',
                            borderRadius: 3,
                            height: '100%',
                          }} />
                        </div>
                        <span style={{ minWidth: 28, fontSize: 13, textAlign: 'right', color: 'var(--ds-text, #172B4D)', fontWeight: 500 }}>
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </WidgetShell>

                {/* By owner — top 10 */}
                <WidgetShell title="By owner" aria-label="Issues by owner">
                  <div style={{ padding: '8px 0' }}>
                    {m.byOwner.slice(0, 10).map(({ name, count }) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{
                          minWidth: 120, maxWidth: 120, fontSize: 13,
                          color: 'var(--ds-text-subtle, #42526E)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {name}
                        </span>
                        <div style={{ flex: 1, background: 'var(--ds-background-neutral, #F1F2F4)', borderRadius: 3, height: 8 }}>
                          <div style={{
                            width: `${(count / maxOwner) * 100}%`,
                            background: 'var(--ds-background-success-bold, #1F845A)',
                            borderRadius: 3,
                            height: '100%',
                          }} />
                        </div>
                        <span style={{ minWidth: 28, fontSize: 13, textAlign: 'right', color: 'var(--ds-text, #172B4D)', fontWeight: 500 }}>
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </WidgetShell>
              </div>
            )}

            {/* Empty state */}
            {m.total === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '48px 0', gap: 8,
                color: 'var(--ds-text-subtle, #42526E)',
              }}>
                <span style={{ fontSize: 16, fontWeight: 500 }}>No issues to display</span>
                <span style={{ fontSize: 14 }}>The filter returned no results.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
