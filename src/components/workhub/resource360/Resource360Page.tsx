/**
 * Resource360Page — Team capacity & utilization list
 * Phase 6: Resource 360
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { useResourceUtilization } from '@/hooks/workhub/useResources';
import { ResourceCard } from './ResourceCard';
import type { ResourceUtilization } from '@/types/workhub.types';

type SortMode = 'utilization' | 'name' | 'department';

export function Resource360Page() {
  const navigate = useNavigate();
  const { data: resources = [], isLoading } = useResourceUtilization();
  const [activeDept, setActiveDept] = useState('All');
  const [sortBy, setSortBy] = useState<SortMode>('utilization');

  // Department tabs
  const departments = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.forEach(r => {
      const d = r.department || 'Other';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [resources]);

  // Filter
  const filtered = useMemo(() => {
    if (activeDept === 'All') return resources;
    return resources.filter(r => r.department === activeDept);
  }, [resources, activeDept]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'name':
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case 'department':
        return arr.sort((a, b) =>
          (a.department || '').localeCompare(b.department || '') || a.name.localeCompare(b.name)
        );
      case 'utilization':
      default:
        return arr.sort((a, b) => b.utilization_percent - a.utilization_percent);
    }
  }, [filtered, sortBy]);

  // Department-grouped rendering
  const groupedByDept = useMemo(() => {
    if (sortBy !== 'department') return null;
    const map = new Map<string, ResourceUtilization[]>();
    sorted.forEach(r => {
      const d = r.department || 'Other';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
    });
    return Array.from(map.entries());
  }, [sorted, sortBy]);

  // KPIs
  const kpis = useMemo(() => {
    const total = resources.length;
    const overUtil = resources.filter(r => r.utilization_percent > 80).length;
    const blockedSum = resources.reduce((s, r) => s + r.blocked_items, 0);
    const avgUtil = total > 0 ? Math.round(resources.reduce((s, r) => s + r.utilization_percent, 0) / total) : 0;
    return { total, overUtil, blockedSum, avgUtil };
  }, [resources]);

  const avgUtilColor = kpis.avgUtil > 80 ? '#ef4444' : kpis.avgUtil >= 60 ? '#d97706' : '#16a34a';

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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: 'var(--wh-text-tertiary)', fontSize: 14 }}>Loading resources...</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
        <div style={{ marginBottom: 4, paddingBottom: 16, borderBottom: '1px solid var(--wh-border, #e2e8f0)' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--wh-text-primary, #0f172a)', margin: 0 }}>
            Resource 360
          </h1>
          <p style={{ fontSize: 14, color: 'var(--wh-text-secondary, #64748b)', margin: '2px 0 0' }}>
            Team capacity &amp; utilization — {resources.length} members
          </p>
        </div>
      </div>

      {/* Department Tabs */}
      <div style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
        <button onClick={() => setActiveDept('All')} style={pillStyle(activeDept === 'All')}>
          All ({resources.length})
        </button>
        {departments.map(([dept, count]) => (
          <button key={dept} onClick={() => setActiveDept(dept)} style={pillStyle(activeDept === dept)}>
            {dept} ({count})
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div style={{ padding: '0 24px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flexShrink: 0 }}>
        {[
          { label: 'Team Size', value: kpis.total, icon: Users, color: 'var(--wh-text-primary, #0f172a)' },
          { label: 'Over 80%', value: kpis.overUtil, icon: TrendingUp, color: kpis.overUtil > 0 ? '#ef4444' : 'var(--wh-text-primary)' },
          { label: 'Blocked Items', value: kpis.blockedSum, icon: AlertTriangle, color: kpis.blockedSum > 0 ? '#ef4444' : 'var(--wh-text-primary)' },
          { label: 'Avg Utilization', value: `${kpis.avgUtil}%`, icon: BarChart3, color: avgUtilColor },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: 'var(--wh-surface, #fff)',
            border: '1px solid var(--wh-border, #e2e8f0)',
            borderRadius: 'var(--wh-radius-lg, 8px)',
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <kpi.icon style={{ width: 14, height: 14, color: 'var(--wh-text-tertiary, #94a3b8)' }} />
              <span style={{ fontSize: 12, color: 'var(--wh-text-tertiary, #94a3b8)' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Sort Bar */}
      <div style={{ padding: '0 24px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--wh-text-tertiary, #94a3b8)', fontWeight: 500 }}>Sort by:</span>
        {(['utilization', 'name', 'department'] as SortMode[]).map(mode => (
          <button key={mode} onClick={() => setSortBy(mode)} style={pillStyle(sortBy === mode)}>
            {mode === 'utilization' ? 'Utilization' : mode === 'name' ? 'Name' : 'Department'}
          </button>
        ))}
      </div>

      {/* Resource Cards */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
        <div style={{ maxWidth: 800 }}>
          {groupedByDept ? (
            groupedByDept.map(([dept, items]) => (
              <div key={dept}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 0', margin: '8px 0',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--wh-text-tertiary, #94a3b8)', whiteSpace: 'nowrap' }}>
                    {dept} ({items.length})
                  </span>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--wh-border, #e2e8f0)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {items.map(r => (
                    <ResourceCard key={r.id} resource={r} onClick={() => navigate(`/projecthub/resource360/${r.id}`)} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sorted.map(r => (
                <ResourceCard key={r.id} resource={r} onClick={() => navigate(`/projecthub/resource360/${r.id}`)} />
              ))}
            </div>
          )}
          {sorted.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              color: 'var(--wh-text-tertiary, #94a3b8)', fontSize: 14,
            }}>
              No resources found in this department.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
