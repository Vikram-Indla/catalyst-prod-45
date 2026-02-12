/**
 * Resource360Page — Team resource view based on profiles + subtasks
 * Departments from admin/users, work from subtasks of active stories
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { useResource360People, useResource360Departments } from '@/hooks/workhub/useResource360Data';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { ResourceCard } from './ResourceCard';

type SortMode = 'name' | 'department' | 'active';

export function Resource360Page() {
  const navigate = useNavigate();
  const { data: people = [], isLoading: loadingPeople } = useResource360People();
  const { data: departments = [], isLoading: loadingDepts } = useResource360Departments();

  // Default department to Delivery
  const deliveryDept = departments.find(d => d.name === 'Delivery');
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>('name');

  // Use Delivery as default once loaded
  const effectiveDeptId = activeDeptId === null && deliveryDept ? deliveryDept.id : activeDeptId;
  const isAll = effectiveDeptId === 'all';

  // Department counts
  const deptCounts = useMemo(() => {
    const map = new Map<string, number>();
    people.forEach(p => {
      if (p.department_id) {
        map.set(p.department_id, (map.get(p.department_id) || 0) + 1);
      }
    });
    return map;
  }, [people]);

  // Filter by department
  const filtered = useMemo(() => {
    if (isAll) return people;
    return people.filter(p => p.department_id === effectiveDeptId);
  }, [people, effectiveDeptId, isAll]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'name':
        return arr.sort((a, b) => a.full_name.localeCompare(b.full_name));
      case 'department':
        return arr.sort((a, b) =>
          (a.department_name || '').localeCompare(b.department_name || '') || a.full_name.localeCompare(b.full_name)
        );
      case 'active':
        return arr.sort((a, b) => b.active_subtasks - a.active_subtasks);
      default:
        return arr;
    }
  }, [filtered, sortBy]);

  // Department-grouped
  const groupedByDept = useMemo(() => {
    if (sortBy !== 'department') return null;
    const map = new Map<string, typeof sorted>();
    sorted.forEach(r => {
      const d = r.department_name || 'Other';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
    });
    return Array.from(map.entries());
  }, [sorted, sortBy]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const activeItems = filtered.reduce((s, r) => s + r.active_subtasks, 0);
    const doneItems = filtered.reduce((s, r) => s + r.done_subtasks, 0);
    const blockedSum = filtered.reduce((s, r) => s + r.blocked_items, 0);
    return { total, activeItems, doneItems, blockedSum };
  }, [filtered]);

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

  const isLoading = loadingPeople || loadingDepts;

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
      <CommandCenterHeader
        title="Resource 360"
        subtitle={`Team assignments & subtask scope — ${filtered.length} members`}
      />

      {/* Department Tabs */}
      <div style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
        <button onClick={() => setActiveDeptId('all')} style={pillStyle(isAll)}>
          All ({people.length})
        </button>
        {departments.map(dept => (
          <button
            key={dept.id}
            onClick={() => setActiveDeptId(dept.id)}
            style={pillStyle(effectiveDeptId === dept.id)}
          >
            {dept.name} ({deptCounts.get(dept.id) || 0})
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div style={{ padding: '0 24px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flexShrink: 0 }}>
        {[
          { label: 'Team Size', value: kpis.total, icon: Users, color: 'var(--wh-text-primary, #0f172a)' },
          { label: 'Active Subtasks', value: kpis.activeItems, icon: TrendingUp, color: kpis.activeItems > 0 ? '#2563eb' : 'var(--wh-text-primary)' },
          { label: 'Done Subtasks', value: kpis.doneItems, icon: BarChart3, color: kpis.doneItems > 0 ? '#16a34a' : 'var(--wh-text-primary)' },
          { label: 'Blocked Items', value: kpis.blockedSum, icon: AlertTriangle, color: kpis.blockedSum > 0 ? '#ef4444' : 'var(--wh-text-primary)' },
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
        {(['name', 'active', 'department'] as SortMode[]).map(mode => (
          <button key={mode} onClick={() => setSortBy(mode)} style={pillStyle(sortBy === mode)}>
            {mode === 'name' ? 'Name' : mode === 'active' ? 'Active Tasks' : 'Department'}
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
