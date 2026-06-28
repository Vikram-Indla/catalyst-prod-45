/**
 * FilterDashboardPage — filter-backed Jira-summary-parity dashboard.
 *
 * Route: /project-hub/:key/dashboards/:id
 *   :key — project key, breadcrumb + back navigation only
 *   :id  — filter_derived_views.id (UUID)
 *
 * Data flow:
 *   1. Load filter_derived_views row  → title + source_filter_id
 *   2. Load ph_saved_filters row      → jql_query
 *   3. useFilterDashboard(jql)        → DashboardMetrics via jqlRowsToDashboardMetrics
 *   4. Render Jira project-summary layout:
 *        4 KPI cards → Status overview → Priority breakdown + Types of work →
 *        Team workload → Recent activity
 *
 * Flag gate: ENABLE_FILTER_TO_DASHBOARD (belt-and-suspenders; kebab is also gated).
 */
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Button from '@atlaskit/button/new';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { WidgetShell } from '@/components/product-dashboard/WidgetShell';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ENABLE_FILTER_TO_DASHBOARD } from '@/lib/featureFlags';
import { supabase } from '@/integrations/supabase/client';
import {
  useFilterDashboard,
  PRIORITY_ORDER,
  type DashboardMetrics,
} from '@/components/dashboard/adapters/filterDashboardSource';

// ── DB loaders ────────────────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ value, label, subtitle }: { value: number; label: string; subtitle: string }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: 'var(--ds-surface)',
      border: '1px solid var(--ds-border)',
      borderRadius: 8,
      padding: '16px 24px',
    }}>
      <div style={{
        fontSize: 36,
        fontWeight: 700,
        color: 'var(--ds-text)',
        lineHeight: 1,
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        {value}
      </div>
      <div style={{
        marginTop: 8,
        fontSize: 'var(--ds-font-size-400)',
        fontWeight: 500,
        color: 'var(--ds-text)',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        {label}
      </div>
      <div style={{
        marginTop: 4,
        fontSize: 'var(--ds-font-size-200)',
        color: 'var(--ds-text-subtle)',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        {subtitle}
      </div>
    </div>
  );
}

const BAR_FILL = 'var(--ds-background-information-bold)';

function ProportionBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{
        minWidth: 140,
        maxWidth: 140,
        fontSize: 'var(--ds-font-size-300)',
        color: 'var(--ds-text-subtle)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        background: 'var(--ds-background-neutral)',
        borderRadius: 3,
        height: 8,
      }}>
        <div style={{
          width: `${pct}%`,
          background: BAR_FILL,
          borderRadius: 3,
          height: '100%',
        }} />
      </div>
      <span style={{
        minWidth: 32,
        fontSize: 'var(--ds-font-size-300)',
        textAlign: 'right',
        color: 'var(--ds-text)',
        fontWeight: 500,
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        {count}
      </span>
    </div>
  );
}

// Groups recentActivity items into date-labelled buckets for display.
function groupByDate(items: DashboardMetrics['recentActivity']) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groupMap = new Map<string, DashboardMetrics['recentActivity']>();

  for (const item of items) {
    let label: string;
    if (!item.updated) {
      label = 'Unknown date';
    } else {
      const d = new Date(item.updated);
      const mid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (mid === today.getTime()) label = 'Today';
      else if (mid === yesterday.getTime()) label = 'Yesterday';
      else label = d.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    }

    if (!groupMap.has(label)) groupMap.set(label, []);
    groupMap.get(label)!.push(item);
  }

  return Array.from(groupMap.entries()).map(([label, items]) => ({ label, items }));
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

// ── Inner (rendered after feature gate) ──────────────────────────────────────

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

  // Loading
  if (viewQuery.isLoading || filterQuery.isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
        <Spinner size="medium" />
        <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-400)' }}>Loading dashboard…</span>
      </div>
    );
  }

  // Error
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
  const maxType   = Math.max(1, ...Object.values(m.byType));
  const maxOwner  = Math.max(1, ...(m.byOwner.map(o => o.count)));

  // Status entries sorted desc by count (Jira shows most common first)
  const statusEntries = Object.entries(m.byStatus).sort(([, a], [, b]) => b - a);

  // Types sorted desc by count
  const typeEntries = Object.entries(m.byType).sort(([, a], [, b]) => b - a);

  // Priority in canonical order, omit buckets with 0
  const priorityEntries = PRIORITY_ORDER
    .map(pk => [pk, m.byPriority[pk] ?? 0] as [string, number])
    .filter(([, count]) => count > 0);
  const maxPriority = Math.max(1, ...priorityEntries.map(([, c]) => c));

  // Recent activity date groups
  const activityGroups = groupByDate(m.recentActivity);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <ProjectPageHeader projectKey={projectKey} />
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

      <div style={{ padding: '0 24px 32px' }}>
        {/* Truncation banner */}
        {dashboard.isTruncated && (
          <div style={{ marginBottom: 16 }}>
            <SectionMessage appearance="warning" title="Showing first 100 results">
              <p>
                Your filter matched {dashboard.totalCount} issues. Only the first 100 are included in these
                metrics. Refine your filter for a more focused view.
              </p>
            </SectionMessage>
          </div>
        )}

        {/* Metrics loading */}
        {dashboard.isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
            <Spinner size="small" />
            <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>Fetching metrics…</span>
          </div>
        )}

        {!dashboard.isLoading && (
          <>
            {/* 4 KPI cards — Jira summary parity */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <KpiCard value={m.completedLast7} label="completed"  subtitle="in the last 7 days" />
              <KpiCard value={m.updatedLast7}   label="updated"    subtitle="in the last 7 days" />
              <KpiCard value={m.createdLast7}   label="created"    subtitle="in the last 7 days" />
              <KpiCard value={m.dueSoon}        label="due soon"   subtitle="in the next 7 days" />
            </div>

            {/* Empty state */}
            {m.total === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '48px 0', gap: 8,
                color: 'var(--ds-text-subtle)',
              }}>
                <span style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 500 }}>No issues to display</span>
                <span style={{ fontSize: 'var(--ds-font-size-400)' }}>The filter returned no results.</span>
              </div>
            )}

            {m.total > 0 && (
              <>
                {/* Status overview — full width */}
                <WidgetShell title="Status overview" aria-label="Issues by status">
                  <div style={{ padding: '8px 0' }}>
                    {statusEntries.map(([status, count]) => (
                      <ProportionBar key={status} label={status} count={count} max={maxStatus} />
                    ))}
                  </div>
                </WidgetShell>

                {/* Priority breakdown + Types of work — 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <WidgetShell title="Priority breakdown" aria-label="Issues by priority">
                    <div style={{ padding: '8px 0' }}>
                      {priorityEntries.map(([pk, count]) => (
                        <ProportionBar key={pk} label={pk} count={count} max={maxPriority} />
                      ))}
                    </div>
                  </WidgetShell>

                  <WidgetShell title="Types of work" aria-label="Issues by type">
                    <div style={{ padding: '8px 0' }}>
                      {typeEntries.map(([type, count]) => (
                        <ProportionBar key={type} label={type} count={count} max={maxType} />
                      ))}
                    </div>
                  </WidgetShell>
                </div>

                {/* Team workload — full width */}
                <div style={{ marginTop: 16 }}>
                  <WidgetShell title="Team workload" aria-label="Issues by assignee">
                    <div style={{ padding: '8px 0' }}>
                      {m.byOwner.slice(0, 15).map(({ name, count }) => (
                        <ProportionBar key={name} label={name} count={count} max={maxOwner} />
                      ))}
                    </div>
                  </WidgetShell>
                </div>

                {/* Recent activity — full width, date-grouped */}
                {activityGroups.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <WidgetShell title="Recent activity" aria-label="Recently updated issues">
                      <div style={{ padding: '8px 0' }}>
                        {activityGroups.map(({ label, items }) => (
                          <div key={label}>
                            {/* Date group header */}
                            <div style={{
                              fontSize: 'var(--ds-font-size-200)',
                              fontWeight: 600,
                              color: 'var(--ds-text-subtlest)',
                              padding: '8px 0 4px',
                              fontFamily: 'var(--ds-font-family-body)',
                            }}>
                              {label}
                            </div>

                            {items.map(item => (
                              <div
                                key={item.key}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '4px 0',
                                  borderBottom: '1px solid var(--ds-border-subtle)',
                                }}
                              >
                                {/* Type icon — zero-assumption: null issueType → no icon */}
                                <span style={{ flexShrink: 0, lineHeight: 0 }}>
                                  {item.issueType
                                    ? <JiraIssueTypeIcon type={item.issueType} size={14} />
                                    : <span style={{ display: 'inline-block', width: 14 }} />
                                  }
                                </span>

                                {/* KEY */}
                                <span style={{
                                  flexShrink: 0,
                                  fontSize: 'var(--ds-font-size-200)',
                                  fontWeight: 500,
                                  color: 'var(--ds-text-subtlest)',
                                  fontFamily: 'var(--ds-font-family-body)',
                                  letterSpacing: '0.01em',
                                }}>
                                  {item.key}
                                </span>

                                {/* Summary */}
                                <span style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: 'var(--ds-font-size-300)',
                                  color: 'var(--ds-text)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontFamily: 'var(--ds-font-family-body)',
                                }}>
                                  {item.summary}
                                </span>

                                {/* Status — plain text badge */}
                                <span style={{
                                  flexShrink: 0,
                                  fontSize: 'var(--ds-font-size-100)',
                                  fontWeight: 500,
                                  color: 'var(--ds-text-subtle)',
                                  background: 'var(--ds-background-neutral)',
                                  padding: '0px 8px',
                                  borderRadius: 3,
                                  fontFamily: 'var(--ds-font-family-body)',
                                  maxWidth: 160,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {item.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </WidgetShell>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
