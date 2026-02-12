/**
 * ResourceDetail — Individual resource view with time-based filtering
 * Phase 6: Resource 360
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
import { StatusBadge } from '@/components/workhub/shared/StatusBadge';
import { TypeBadge } from '@/components/workhub/shared/TypeBadge';
import {
  useResourceUtilizationById,
  useResourceWorkItems,
} from '@/hooks/workhub/useResources';
import { getTimeRanges, isOverdue, daysDifference } from '@/lib/workhub/timeRanges';
import type { WorkItemFull, WorkItemStatus, WorkItemType } from '@/types/workhub.types';

export function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeRange, setActiveRange] = useState(0); // index into getTimeRanges()
  const timeRanges = useMemo(() => getTimeRanges(), []);
  const currentRange = timeRanges[activeRange];

  const { data: utilData, isLoading: loadingUtil } = useResourceUtilizationById(id || '');

  const timeFilter = currentRange.start
    ? { start: currentRange.start, end: currentRange.end }
    : undefined;

  const { data: workItems = [], isLoading: loadingItems } = useResourceWorkItems(
    utilData?.user_id || utilData?.id || '',
    timeFilter
  );

  // Compute KPIs from filtered work items
  const kpis = useMemo(() => {
    if (activeRange === 0 && utilData) {
      return {
        utilization: utilData.utilization_percent,
        total: utilData.total_items,
        active: utilData.active_items,
        done: utilData.completed_items,
        blocked: utilData.blocked_items,
        estHours: utilData.total_estimated_hours,
      };
    }
    const total = workItems.length;
    const done = workItems.filter(w => w.status === 'Done').length;
    const blocked = workItems.filter(w => w.status === 'Blocked').length;
    const active = total - done - workItems.filter(w => w.status === 'Cancelled').length;
    const estHours = workItems.reduce((s, w) => s + (w.estimated_hours || 0), 0);
    const utilization = utilData ? Math.round((estHours / (utilData.capacity_hours_per_week * 4)) * 100) : 0;
    return { utilization, total, active, done, blocked, estHours };
  }, [workItems, utilData, activeRange]);

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Scrollable content */}
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
          WorkHub &gt; Resource 360 &gt; {r.name}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
          <AvatarChip name={r.name} color={r.color} size={48} />
          <div>
            <h1 style={{
              fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700,
              color: 'var(--wh-text-primary, #0f172a)', margin: 0,
            }}>
              {r.name}
            </h1>
            <div style={{ fontSize: 14, color: 'var(--wh-text-secondary, #64748b)', marginTop: 2 }}>
              {r.role || 'Team Member'} · {r.department || 'Engineering'} · {r.capacity_hours_per_week}h/wk
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

        {/* Time Range Pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          padding: '16px 0',
          borderBottom: '1px solid var(--wh-border, #e2e8f0)',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--wh-text-tertiary, #94a3b8)', alignSelf: 'center', marginRight: 4 }}>
            TIME RANGE:
          </span>
          {timeRanges.map((tr, i) => (
            <button key={tr.label} onClick={() => setActiveRange(i)} style={pillStyle(activeRange === i)}>
              {tr.label}
            </button>
          ))}
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Utilization', value: `${kpis.utilization}%`, icon: BarChart3, color: kpis.utilization > 80 ? '#ef4444' : kpis.utilization >= 60 ? '#d97706' : '#16a34a' },
            { label: 'Total Items', value: kpis.total, icon: FileStack, color: 'var(--wh-text-primary, #0f172a)' },
            { label: 'Active', value: kpis.active, icon: Clock, color: 'var(--wh-text-primary, #0f172a)' },
            { label: 'Done', value: kpis.done, icon: CheckCircle2, color: '#16a34a' },
            { label: 'Blocked', value: kpis.blocked, icon: AlertTriangle, color: kpis.blocked > 0 ? '#ef4444' : 'var(--wh-text-primary, #0f172a)' },
            { label: 'Est. Hours', value: `${kpis.estHours}h`, icon: Clock, color: 'var(--wh-text-primary, #0f172a)' },
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
          <UtilizationBar percent={kpis.utilization} height={12} />
        </div>

        {/* Work Items Table */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 600,
            color: 'var(--wh-text-primary, #0f172a)', marginBottom: 12,
          }}>
            Work Items ({workItems.length})
          </h2>

          {loadingItems ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--wh-text-tertiary)', fontSize: 13 }}>
              Loading work items...
            </div>
          ) : workItems.length === 0 ? (
            <div style={{
              padding: 48, textAlign: 'center',
              background: 'var(--wh-surface, #fff)',
              border: '1px solid var(--wh-border, #e2e8f0)',
              borderRadius: 'var(--wh-radius-lg, 8px)',
              color: 'var(--wh-text-tertiary, #94a3b8)', fontSize: 14,
            }}>
              No work items in this time range.
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
                    {['KEY', 'TYPE', 'SUMMARY', 'STATUS', 'DUE DATE', 'RELEASE', 'THEME'].map(h => (
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
                  {workItems.map((item: WorkItemFull) => {
                    const overdue = isOverdue(item.due_date, item.status);
                    return (
                      <tr
                        key={item.id}
                        style={{
                          height: 44,
                          borderBottom: '1px solid var(--wh-border-light, #f1f5f9)',
                          background: overdue ? '#fef2f2' : 'var(--wh-surface, #fff)',
                          transition: 'background 100ms',
                        }}
                        className="wh-detail-row"
                      >
                        <td style={{ padding: '0 12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--wh-primary, #2563eb)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          onClick={() => navigate(`/projecthub/workitems?view=${item.id}`)}
                        >
                          {item.item_key}
                        </td>
                        <td style={{ padding: '0 12px' }}>
                          <TypeBadge type={item.item_type as WorkItemType} size="sm" />
                        </td>
                        <td style={{
                          padding: '0 12px', maxWidth: 240, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: 'var(--wh-text-primary, #0f172a)',
                          fontWeight: item.item_type === 'Epic' ? 600 : 400,
                        }}>
                          {item.summary}
                        </td>
                        <td style={{ padding: '0 12px' }}>
                          <StatusBadge status={item.status as WorkItemStatus} size="sm" />
                        </td>
                        <td style={{ padding: '0 12px', whiteSpace: 'nowrap' }}>
                          {item.due_date ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              color: overdue ? '#ef4444' : 'var(--wh-text-secondary, #64748b)',
                              fontWeight: overdue ? 600 : 400,
                            }}
                              title={overdue ? `Overdue by ${daysDifference(item.due_date)} days` : undefined}
                            >
                              {overdue && <AlertCircle style={{ width: 14, height: 14 }} />}
                              {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0 12px', color: 'var(--wh-text-secondary, #64748b)', fontSize: 12 }}>
                          {item.release_name || '—'}
                        </td>
                        <td style={{ padding: '0 12px' }}>
                          {item.theme_name ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                              <span style={{
                                width: 8, height: 8, borderRadius: 4,
                                backgroundColor: item.theme_color || '#94a3b8',
                                flexShrink: 0,
                              }} />
                              <span style={{ color: 'var(--wh-text-secondary, #64748b)' }}>{item.theme_name}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--wh-text-tertiary, #94a3b8)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Skills Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Zap style={{ width: 14, height: 14, color: 'var(--wh-text-tertiary, #94a3b8)' }} />
            <h2 style={{
              fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 600,
              color: 'var(--wh-text-primary, #0f172a)', margin: 0,
            }}>
              Skills
            </h2>
          </div>
          {r.skills && r.skills.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {r.skills.map(skill => (
                <span key={skill} style={{
                  backgroundColor: 'var(--wh-border-light, #f1f5f9)',
                  color: 'var(--wh-text-secondary, #64748b)',
                  borderRadius: 9999,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                }}>
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontStyle: 'italic', color: 'var(--wh-text-tertiary, #94a3b8)', fontSize: 13 }}>
              No skills listed
            </p>
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
