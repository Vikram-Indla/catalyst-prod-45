/**
 * ResourceDetail — Individual resource view with real Jira data
 * Phase 6: Resource 360 — Updated to use real data
 */
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, BarChart3, CheckCircle2, Clock,
  AlertTriangle, FileStack, Zap, AlertCircle, Mail,
} from 'lucide-react';
import { AvatarChip } from '@/components/workhub/shared/AvatarChip';
import { DepartmentBadge } from '@/components/workhub/shared/DepartmentBadge';
import { UtilizationBar } from '@/components/workhub/shared/UtilizationBar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ResourceUtilization } from '@/types/workhub.types';

interface JiraIssueRow {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  issue_type: string;
  priority: string;
  due_date: string | null;
  project_key: string;
  story_points: number | null;
  sprint_name: string | null;
}

function useResourceByJiraAccount(jiraAccountId: string | undefined) {
  return useQuery({
    queryKey: ['workhub', 'resource-issues', jiraAccountId],
    queryFn: async () => {
      if (!jiraAccountId) return [];
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category, issue_type, priority, due_date, project_key, story_points, sprint_name')
        .eq('assignee_account_id', jiraAccountId)
        .order('due_date', { nullsFirst: false })
        .order('issue_key');
      if (error) throw error;
      return (data ?? []) as JiraIssueRow[];
    },
    enabled: !!jiraAccountId,
    staleTime: 30_000,
  });
}

function useResourceUtilById(id: string) {
  return useQuery({
    queryKey: ['workhub', 'resource-detail', id],
    queryFn: async () => {
      // 1. Look up resource_inventory by id (this is the id from the URL)
      const { data: ri, error: riErr } = await supabase
        .from('resource_inventory')
        .select('id, name, role_name, profile_id, department_id, department_name, assignment_id')
        .eq('id', id)
        .maybeSingle();
      if (riErr) throw riErr;

      // 2. If we have a profile_id, look up utilization view for rich data
      let utilData: ResourceUtilization | null = null;
      if (ri?.profile_id) {
        const { data } = await supabase
          .from('vw_ph_resource_utilization')
          .select('*')
          .or(`id.eq.${ri.profile_id},user_id.eq.${ri.profile_id}`)
          .maybeSingle();
        utilData = data as unknown as ResourceUtilization | null;
      }

      // 3. If no utilization data found, also try by the id directly (legacy ph_resources match)
      if (!utilData) {
        const { data } = await supabase
          .from('vw_ph_resource_utilization')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        utilData = data as unknown as ResourceUtilization | null;
      }

      // 4. Merge: prefer utilization view data but fall back to resource_inventory
      if (utilData) {
        // Enrich with resource_inventory fields if missing
        if (!utilData.name && ri?.name) utilData.name = ri.name;
        if ((!utilData.role || utilData.role === 'Team Member') && ri?.role_name) utilData.role = ri.role_name;
        if (!utilData.department && ri?.department_name) utilData.department = ri.department_name;
        return utilData;
      }

      // 5. No utilization view record at all — build a minimal one from resource_inventory
      if (ri) {
        return {
          id: ri.id,
          name: ri.name,
          role: ri.role_name || 'Team Member',
          department: ri.department_name || 'Unassigned',
          email: null,
          avatar_url: null,
          color: 'var(--fg-3)',
          capacity_hours_per_week: 40,
          total_items: 0,
          active_items: 0,
          completed_items: 0,
          in_progress_items: 0,
          blocked_items: 0,
          total_estimated_hours: 0,
          total_actual_hours: 0,
          utilization_percent: 0,
          jira_account_id: null,
          release_count: 0,
          theme_count: 0,
          next_due_date: null,
        } as unknown as ResourceUtilization;
      }

      return null;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

const STATUS_COLORS: Record<string, string> = {
  'To Do': '#94a3b8',
  'In Progress': '#2563eb',
  'In Review': '#7c3aed',
  'Done': '#16a34a',
  'Blocked': '#ef4444',
  'Cancelled': '#6b7280',
};

const TYPE_COLORS: Record<string, string> = {
  'Epic': '#1e40af',
  'Story': '#065f46',
  'Sub-task': '#312e81',
  'Bug': '#dc2626',
  'Task': '#0d9488',
};

export function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: utilData, isLoading: loadingUtil } = useResourceUtilById(id || '');
  const { data: issues = [], isLoading: loadingItems } = useResourceByJiraAccount(utilData?.jira_account_id);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return issues;
    return issues.filter(i => i.status_category === statusFilter);
  }, [issues, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: issues.length };
    issues.forEach(i => {
      counts[i.status_category] = (counts[i.status_category] || 0) + 1;
    });
    return counts;
  }, [issues]);

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: 9999,
    border: 'none',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    background: active ? 'var(--cp-blue)' : 'var(--bg-1)',
    color: active ? 'var(--bg-app)' : 'var(--fg-3)',
    transition: 'background 150ms, color 150ms',
    fontFamily: 'var(--ds-font-family-body)',
  });

  if (loadingUtil || !utilData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: 'var(--fg-4)', fontSize: 14 }}>Loading resource...</div>
      </div>
    );
  }

  const r = utilData;
  const isOverdue = (d: string | null, status: string) => d && status !== 'Done' && new Date(d) < new Date();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'var(--ds-font-family-body)' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/project-hub/resource360')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--cp-blue)',
            fontFamily: 'var(--ds-font-family-body)', marginBottom: 16,
            padding: 0,
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to Resource 360
        </button>

        <div style={{ fontSize: 11, color: 'var(--fg-4)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
          ProjectHub &gt; Resource 360 &gt; {r.name}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
          <AvatarChip name={r.name} color={r.color} size={48} avatarUrl={r.avatar_url} />
          <div>
            <h1 style={{
              fontFamily: 'var(--ds-font-family-heading)', fontSize: 24, fontWeight: 700,
              color: 'var(--fg-1)', margin: 0,
            }}>
              {r.name}
            </h1>
            <div style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 2 }}>
              {r.role || 'Team Member'} · {r.department || 'Unassigned'} · {r.capacity_hours_per_week}h/wk
            </div>
            {r.email && (
              <a
                href={`mailto:${r.email}`}
                style={{ fontSize: 13, color: 'var(--cp-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}
              >
                <Mail style={{ width: 12, height: 12 }} />
                {r.email}
              </a>
            )}
          </div>
        </div>

        {/* Status Filter Pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          padding: '16px 0',
          borderBottom: '1px solid var(--divider)',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-4)', alignSelf: 'center', marginRight: 4 }}>
            FILTER:
          </span>
          <button onClick={() => setStatusFilter('all')} style={pillStyle(statusFilter === 'all')}>
            All ({statusCounts.all || 0})
          </button>
          {['To Do', 'In Progress', 'Done'].map(cat => (
            <button key={cat} onClick={() => setStatusFilter(cat)} style={pillStyle(statusFilter === cat)}>
              {cat} ({statusCounts[cat] || 0})
            </button>
          ))}
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Completion', value: `${r.utilization_percent}%`, icon: BarChart3, color: r.utilization_percent > 80 ? 'var(--sem-success)' : r.utilization_percent >= 40 ? 'var(--sem-warning)' : 'var(--sem-danger)' },
            { label: 'Total Items', value: r.total_items, icon: FileStack, color: 'var(--fg-1)' },
            { label: 'Active', value: r.active_items, icon: Clock, color: 'var(--fg-1)' },
            { label: 'Done', value: r.completed_items, icon: CheckCircle2, color: 'var(--sem-success)' },
            { label: 'Blocked', value: r.blocked_items, icon: AlertTriangle, color: r.blocked_items > 0 ? 'var(--sem-danger)' : 'var(--fg-1)' },
            { label: 'Story Points', value: r.total_estimated_hours + r.total_actual_hours, icon: Zap, color: 'var(--fg-1)' },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: 'var(--cp-float)',
              border: '1px solid var(--divider)',
              borderRadius: 'var(--wh-radius-lg, 8px)',
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <kpi.icon style={{ width: 13, height: 13, color: 'var(--fg-4)' }} />
                <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{kpi.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Utilization Bar */}
        <div style={{ marginBottom: 24 }}>
          <UtilizationBar percent={r.utilization_percent} height={12} />
        </div>

        {/* Work Items Table */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600,
            color: 'var(--fg-1)', marginBottom: 12,
          }}>
            Jira Issues ({filtered.length})
          </h2>

          {loadingItems ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>
              Loading issues...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              padding: 48, textAlign: 'center',
              background: 'var(--cp-float)',
              border: '1px solid var(--divider)',
              borderRadius: 'var(--wh-radius-lg, 8px)',
              color: 'var(--fg-4)', fontSize: 14,
            }}>
              No issues found for this filter.
            </div>
          ) : (
            <div style={{
              border: '1px solid var(--divider)',
              borderRadius: 'var(--wh-radius-lg, 8px)',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--divider)', background: 'var(--bg-1)' }}>
                    {['KEY', 'TYPE', 'SUMMARY', 'STATUS', 'PRIORITY', 'DUE DATE', 'PROJECT', 'SPRINT'].map(h => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left',
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                        color: 'var(--fg-4)', letterSpacing: '0.04em',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((item) => {
                    const overdue = isOverdue(item.due_date, item.status_category);
                    return (
                      <tr
                        key={item.issue_key}
                        style={{
                          height: 44,
                          borderBottom: '1px solid var(--bg-1)',
                          background: overdue ? '#fef2f2' : 'var(--cp-float)',
                          transition: 'background 100ms',
                        }}
                        className="wh-detail-row"
                      >
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--cp-blue)', whiteSpace: 'nowrap' }}>
                          {item.issue_key}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                            fontSize: 11, fontWeight: 600,
                            backgroundColor: (TYPE_COLORS[item.issue_type] || 'var(--fg-4)') + '18',
                            color: TYPE_COLORS[item.issue_type] || 'var(--fg-4)',
                          }}>
                            {item.issue_type}
                          </span>
                        </td>
                        <td style={{
                          padding: '8px 12px', maxWidth: 300, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: 'var(--fg-1)',
                        }}>
                          {item.summary}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                            fontSize: 11, fontWeight: 600,
                            backgroundColor: (STATUS_COLORS[item.status] || 'var(--fg-4)') + '18',
                            color: STATUS_COLORS[item.status] || 'var(--fg-4)',
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--fg-3)' }}>
                          {item.priority || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          {item.due_date ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              color: overdue ? 'var(--sem-danger)' : 'var(--fg-3)',
                              fontWeight: overdue ? 600 : 400,
                            }}>
                              {overdue && <AlertCircle style={{ width: 14, height: 14 }} />}
                              {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--fg-4)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--fg-3)' }}>
                          {item.project_key || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--fg-3)' }}>
                          {item.sprint_name || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length > 100 && (
                <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--fg-4)', textAlign: 'center', borderTop: '1px solid var(--bg-1)' }}>
                  Showing first 100 of {filtered.length} issues
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .wh-detail-row:hover {
          background: var(--bg-1) !important;
        }
      `}</style>
    </div>
  );
}
