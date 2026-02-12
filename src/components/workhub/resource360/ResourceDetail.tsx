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
    queryKey: ['workhub', 'resource-utilization', id],
    queryFn: async () => {
      // Try by profile id first, then by jira_account_id
      const { data, error } = await supabase
        .from('vw_ph_resource_utilization')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as ResourceUtilization;
      
      // Fallback: try matching by jira_account_id
      const { data: d2, error: e2 } = await supabase
        .from('vw_ph_resource_utilization')
        .select('*')
        .eq('jira_account_id', id)
        .maybeSingle();
      if (e2) throw e2;
      return d2 as unknown as ResourceUtilization | null;
    },
    enabled: !!id,
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
    background: active ? 'var(--wh-primary, #2563eb)' : 'var(--wh-border-light, #f1f5f9)',
    color: active ? '#fff' : 'var(--wh-text-secondary, #64748b)',
    transition: 'background 150ms, color 150ms',
    fontFamily: 'Inter, system-ui, sans-serif',
  });

  if (loadingUtil || !utilData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: 'var(--wh-text-tertiary)', fontSize: 14 }}>Loading resource...</div>
      </div>
    );
  }

  const r = utilData;
  const isOverdue = (d: string | null, status: string) => d && status !== 'Done' && new Date(d) < new Date();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/projecthub/resource360')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--wh-primary, #2563eb)',
            fontFamily: 'Inter, system-ui, sans-serif', marginBottom: 16,
            padding: 0,
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to Resource 360
        </button>

        <div style={{ fontSize: 11, color: 'var(--wh-text-tertiary, #94a3b8)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
          ProjectHub &gt; Resource 360 &gt; {r.name}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
          <AvatarChip name={r.name} color={r.color} size={48} avatarUrl={r.avatar_url} />
          <div>
            <h1 style={{
              fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700,
              color: 'var(--wh-text-primary, #0f172a)', margin: 0,
            }}>
              {r.name}
            </h1>
            <div style={{ fontSize: 14, color: 'var(--wh-text-secondary, #64748b)', marginTop: 2 }}>
              {r.role || 'Team Member'} · {r.department || 'Unassigned'} · {r.capacity_hours_per_week}h/wk
            </div>
            {r.email && (
              <a
                href={`mailto:${r.email}`}
                style={{ fontSize: 13, color: 'var(--wh-primary, #2563eb)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}
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
          borderBottom: '1px solid var(--wh-border, #e2e8f0)',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--wh-text-tertiary, #94a3b8)', alignSelf: 'center', marginRight: 4 }}>
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
            { label: 'Completion', value: `${r.utilization_percent}%`, icon: BarChart3, color: r.utilization_percent > 80 ? '#16a34a' : r.utilization_percent >= 40 ? '#d97706' : '#ef4444' },
            { label: 'Total Items', value: r.total_items, icon: FileStack, color: 'var(--wh-text-primary, #0f172a)' },
            { label: 'Active', value: r.active_items, icon: Clock, color: 'var(--wh-text-primary, #0f172a)' },
            { label: 'Done', value: r.completed_items, icon: CheckCircle2, color: '#16a34a' },
            { label: 'Blocked', value: r.blocked_items, icon: AlertTriangle, color: r.blocked_items > 0 ? '#ef4444' : 'var(--wh-text-primary, #0f172a)' },
            { label: 'Story Points', value: r.total_estimated_hours + r.total_actual_hours, icon: Zap, color: 'var(--wh-text-primary, #0f172a)' },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: 'var(--wh-surface, #fff)',
              border: '1px solid var(--wh-border, #e2e8f0)',
              borderRadius: 'var(--wh-radius-lg, 8px)',
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <kpi.icon style={{ width: 13, height: 13, color: 'var(--wh-text-tertiary, #94a3b8)' }} />
                <span style={{ fontSize: 11, color: 'var(--wh-text-tertiary, #94a3b8)' }}>{kpi.label}</span>
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
            fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 600,
            color: 'var(--wh-text-primary, #0f172a)', marginBottom: 12,
          }}>
            Jira Issues ({filtered.length})
          </h2>

          {loadingItems ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--wh-text-tertiary)', fontSize: 13 }}>
              Loading issues...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              padding: 48, textAlign: 'center',
              background: 'var(--wh-surface, #fff)',
              border: '1px solid var(--wh-border, #e2e8f0)',
              borderRadius: 'var(--wh-radius-lg, 8px)',
              color: 'var(--wh-text-tertiary, #94a3b8)', fontSize: 14,
            }}>
              No issues found for this filter.
            </div>
          ) : (
            <div style={{
              border: '1px solid var(--wh-border, #e2e8f0)',
              borderRadius: 'var(--wh-radius-lg, 8px)',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--wh-border, #e2e8f0)', background: 'var(--wh-border-light, #f8fafc)' }}>
                    {['KEY', 'TYPE', 'SUMMARY', 'STATUS', 'PRIORITY', 'DUE DATE', 'PROJECT', 'SPRINT'].map(h => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left',
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                        color: 'var(--wh-text-tertiary, #94a3b8)', letterSpacing: '0.04em',
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
                          borderBottom: '1px solid var(--wh-border-light, #f1f5f9)',
                          background: overdue ? '#fef2f2' : 'var(--wh-surface, #fff)',
                          transition: 'background 100ms',
                        }}
                        className="wh-detail-row"
                      >
                        <td style={{ padding: '0 12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--wh-primary, #2563eb)', whiteSpace: 'nowrap' }}>
                          {item.issue_key}
                        </td>
                        <td style={{ padding: '0 12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                            fontSize: 11, fontWeight: 600,
                            backgroundColor: (TYPE_COLORS[item.issue_type] || '#94a3b8') + '18',
                            color: TYPE_COLORS[item.issue_type] || '#94a3b8',
                          }}>
                            {item.issue_type}
                          </span>
                        </td>
                        <td style={{
                          padding: '0 12px', maxWidth: 300, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: 'var(--wh-text-primary, #0f172a)',
                        }}>
                          {item.summary}
                        </td>
                        <td style={{ padding: '0 12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                            fontSize: 11, fontWeight: 600,
                            backgroundColor: (STATUS_COLORS[item.status] || '#94a3b8') + '18',
                            color: STATUS_COLORS[item.status] || '#94a3b8',
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '0 12px', fontSize: 12, color: 'var(--wh-text-secondary, #64748b)' }}>
                          {item.priority || '—'}
                        </td>
                        <td style={{ padding: '0 12px', whiteSpace: 'nowrap' }}>
                          {item.due_date ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              color: overdue ? '#ef4444' : 'var(--wh-text-secondary, #64748b)',
                              fontWeight: overdue ? 600 : 400,
                            }}>
                              {overdue && <AlertCircle style={{ width: 14, height: 14 }} />}
                              {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0 12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--wh-text-secondary, #64748b)' }}>
                          {item.project_key || '—'}
                        </td>
                        <td style={{ padding: '0 12px', fontSize: 12, color: 'var(--wh-text-secondary, #64748b)' }}>
                          {item.sprint_name || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length > 100 && (
                <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--wh-text-tertiary)', textAlign: 'center', borderTop: '1px solid var(--wh-border-light)' }}>
                  Showing first 100 of {filtered.length} issues
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .wh-detail-row:hover {
          background: var(--wh-border-light, #f8fafc) !important;
        }
      `}</style>
    </div>
  );
}
