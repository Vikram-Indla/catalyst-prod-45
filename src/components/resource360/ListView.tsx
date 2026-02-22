import React, { useMemo } from 'react';
import { HUB_COLORS, HUB_SHORT, STATUS_CATEGORY_COLORS, WIT_STYLES, PRIORITY_ICONS } from '@/constants/resource360';
import type { RoleFilter } from './Toolbar';

interface ListViewProps {
  items: any[];
  roleFilter: RoleFilter;
  onItemClick: (item: any) => void;
}

const ListView: React.FC<ListViewProps> = ({ items, roleFilter, onItemClick }) => {
  const filtered = useMemo(() => {
    if (roleFilter === 'all') return items;
    return items.filter(i => i.resource_role === roleFilter);
  }, [items, roleFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = { todo: [], progress: [], done: [] };
    filtered.forEach(it => {
      const cat = it.status_category || 'todo';
      (groups[cat] = groups[cat] || []).push(it);
    });
    return groups;
  }, [filtered]);

  const cols = ['Key', 'Title', 'Type', 'Hub', 'Status', 'Priority', 'Project', 'Age', 'Role'];

  const headerStyle: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748B',
    padding: '8px 10px',
    background: '#F1F5F9',
    borderBottom: '2px solid #E2E8F0',
    whiteSpace: 'nowrap',
  };

  const groupLabel: Record<string, string> = {
    todo: 'To Do',
    progress: 'In Progress',
    done: 'Done',
  };

  return (
    <div style={{ padding: '0 20px 20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {cols.map(c => <th key={c} style={headerStyle}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {(['todo', 'progress', 'done'] as const).map(cat => {
              const catItems = grouped[cat] || [];
              if (!catItems.length) return null;
              const sc = STATUS_CATEGORY_COLORS[cat];
              return (
                <React.Fragment key={cat}>
                  <tr>
                    <td colSpan={9} style={{
                      padding: '8px 10px',
                      background: sc.bg,
                      fontSize: 11,
                      fontWeight: 700,
                      color: sc.text,
                    }}>
                      {groupLabel[cat]} <span style={{ fontWeight: 400, marginLeft: 4 }}>({catItems.length})</span>
                    </td>
                  </tr>
                  {catItems.map(it => {
                    const witStyle = WIT_STYLES[it.work_item_type] || { bg: '#F1F5F9', color: '#334155' };
                    const hubColor = HUB_COLORS[it.source_hub] || '#64748B';
                    const isReported = it.resource_role === 'reported';
                    return (
                      <tr
                        key={it.id}
                        onClick={() => onItemClick(it)}
                        style={{
                          height: 44, maxHeight: 44,
                          cursor: 'pointer',
                          borderBottom: '1px solid #F1F5F9',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                      >
                        <td style={{ padding: '0 10px', fontSize: 11, fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                          {it.item_key}
                        </td>
                        <td style={{ padding: '0 10px', fontSize: 12, color: '#0F172A', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {it.title}
                        </td>
                        <td style={{ padding: '0 10px' }}>
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: witStyle.bg, color: witStyle.color }}>
                            {it.work_item_type}
                          </span>
                        </td>
                        <td style={{ padding: '0 10px' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: hubColor, color: '#FFFFFF' }}>
                            {HUB_SHORT[it.source_hub] || it.source_hub}
                          </span>
                        </td>
                        <td style={{ padding: '0 10px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                            background: sc.bg, color: sc.text,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                            {it.status}
                          </span>
                        </td>
                        <td style={{ padding: '0 10px', fontSize: 11 }}>
                          {PRIORITY_ICONS[it.priority] || ''} {it.priority}
                        </td>
                        <td style={{ padding: '0 10px', fontSize: 11, color: '#475569' }}>
                          {it.project_name || '—'}
                        </td>
                        <td style={{
                          padding: '0 10px', fontSize: 11, fontWeight: 600,
                          color: it.age_days > 14 ? '#DC2626' : it.age_days > 7 ? '#D97706' : '#059669',
                        }}>
                          {it.age_days}d
                        </td>
                        <td style={{ padding: '0 10px' }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: '50%',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 700,
                            background: isReported ? 'transparent' : sc.dot,
                            color: isReported ? sc.dot : '#FFFFFF',
                            border: isReported ? `1.5px solid ${sc.dot}` : 'none',
                          }}>
                            {isReported ? 'R' : 'A'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListView;
