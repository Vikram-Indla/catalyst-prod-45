/**
 * CapacityTable — Individual resource capacity table
 * Phase 11
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AvatarChip } from '@/components/workhub/shared/AvatarChip';
import { DepartmentBadge } from '@/components/workhub/shared/DepartmentBadge';
import { UtilizationBar } from '@/components/workhub/shared/UtilizationBar';
import type { ResourceUtilization } from '@/types/workhub.types';

interface Props {
  resources: ResourceUtilization[];
}

type SortKey = 'name' | 'department' | 'utilization_percent' | 'active_items' | 'total_estimated_hours' | 'total_actual_hours' | 'blocked_items';
type SortDir = 'asc' | 'desc';

const COLUMNS = [
  { key: '#', label: '#', sortable: false, hideOnMobile: false, hideOnTablet: false },
  { key: 'name', label: 'NAME', sortable: true, hideOnMobile: false, hideOnTablet: false },
  { key: 'department', label: 'DEPT', sortable: true, hideOnMobile: true, hideOnTablet: false },
  { key: 'role', label: 'ROLE', sortable: false, hideOnMobile: true, hideOnTablet: true },
  { key: 'capacity', label: 'CAP.', sortable: false, hideOnMobile: true, hideOnTablet: false },
  { key: 'estimated', label: 'EST.', sortable: true, hideOnMobile: true, hideOnTablet: false },
  { key: 'actual', label: 'ACT.', sortable: true, hideOnMobile: true, hideOnTablet: true },
  { key: 'util', label: 'UTIL %', sortable: true, hideOnMobile: false, hideOnTablet: false },
  { key: 'active', label: 'ACTIVE', sortable: true, hideOnMobile: false, hideOnTablet: false },
  { key: 'done', label: 'DONE', sortable: false, hideOnMobile: true, hideOnTablet: false },
  { key: 'blocked', label: 'BLOCKED', sortable: true, hideOnMobile: false, hideOnTablet: false },
];

export function CapacityTable({ resources }: Props) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('utilization_percent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    if (!resources) return [];
    return [...resources].sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'name': va = a.name; vb = b.name; break;
        case 'department': va = a.department; vb = b.department; break;
        case 'utilization_percent': va = a.utilization_percent; vb = b.utilization_percent; break;
        case 'active_items': va = a.active_items; vb = b.active_items; break;
        case 'total_estimated_hours': va = a.total_estimated_hours; vb = b.total_estimated_hours; break;
        case 'total_actual_hours': va = a.total_actual_hours; vb = b.total_actual_hours; break;
        case 'blocked_items': va = a.blocked_items; vb = b.blocked_items; break;
        default: return 0;
      }
      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [resources, sortKey, sortDir]);

  const handleSort = (key: string) => {
    const sortableMap: Record<string, SortKey> = {
      name: 'name', department: 'department', util: 'utilization_percent',
      active: 'active_items', estimated: 'total_estimated_hours',
      actual: 'total_actual_hours', blocked: 'blocked_items',
    };
    const sk = sortableMap[key];
    if (!sk) return;
    if (sortKey === sk) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(sk);
      setSortDir('desc');
    }
  };

  const sortableMap: Record<string, SortKey> = {
    name: 'name', department: 'department', util: 'utilization_percent',
    active: 'active_items', estimated: 'total_estimated_hours',
    actual: 'total_actual_hours', blocked: 'blocked_items',
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--wh-surface)',
        border: '1px solid var(--wh-border)',
        borderRadius: 'var(--wh-radius-xl, 16px)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '20px 24px 12px' }}>
        <h3 style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 16, fontWeight: 600,
          color: 'var(--wh-text-primary)',
        }}>
          Individual Capacity
        </h3>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--wh-border)' }}>
              {COLUMNS.map(col => {
                const isSorted = sortableMap[col.key] === sortKey;
                return (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    style={{
                      padding: '10px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      textAlign: 'left',
                      color: isSorted ? 'var(--wh-primary)' : 'var(--wh-text-tertiary)',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: 'var(--wh-surface)',
                    }}
                    className={`${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.hideOnTablet ? 'hidden lg:table-cell' : ''}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {isSorted && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => {
              const variance = r.total_actual_hours - r.total_estimated_hours;
              return (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/project-hub/resource360/${r.id}`)}
                  style={{
                    height: 44,
                    cursor: 'pointer',
                    backgroundColor: idx % 2 === 1 ? '#fafbfc' : 'transparent',
                    borderBottom: '1px solid var(--wh-border-light, #f1f5f9)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f1f5f9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = idx % 2 === 1 ? '#fafbfc' : 'transparent'; }}
                >
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--wh-text-tertiary)' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AvatarChip name={r.name} color={r.color} size={28} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--wh-text-primary)' }}>
                        {r.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }} className="hidden md:table-cell">
                    <DepartmentBadge department={r.department || 'Unassigned'} />
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--wh-text-secondary)' }} className="hidden lg:table-cell">
                    <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {r.role || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }} className="hidden md:table-cell">
                    {r.capacity_hours_per_week}h/wk
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }} className="hidden md:table-cell">
                    {r.total_estimated_hours}h
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }} className="hidden lg:table-cell">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {r.total_actual_hours}h
                      {variance > 0 && <TrendingUp size={12} style={{ color: '#ef4444' }} />}
                      {variance < 0 && <TrendingDown size={12} style={{ color: '#16a34a' }} />}
                      {variance === 0 && <span style={{ color: 'var(--wh-text-tertiary)' }}>—</span>}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', minWidth: 120 }}>
                    <UtilizationBar percent={r.utilization_percent} height={6} compact />
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600 }}>
                    {r.active_items}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--wh-text-secondary)' }} className="hidden md:table-cell">
                    {r.completed_items}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600 }} className="">
                    <span style={{ color: r.blocked_items > 0 ? '#ef4444' : 'var(--wh-text-tertiary)' }}>
                      {r.blocked_items}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
