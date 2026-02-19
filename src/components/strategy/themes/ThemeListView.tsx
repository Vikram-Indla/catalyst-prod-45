/**
 * ThemeListView — Enterprise data table with Linear-style badges
 */
import { useState, useMemo } from 'react';
import type { StrategicTheme } from '@/types/strategic-themes';
import {
  STATUS_CONFIG, BSC_CONFIG, deriveHealthStatus,
  formatBudget, getInitials, getAvatarColor, formatThemeId, getProgressColor,
} from './theme-utils';

interface Props {
  themes: StrategicTheme[];
  onSelect: (theme: StrategicTheme) => void;
}

type SortField = 'title' | 'progress_pct' | 'goal_count' | 'planned_budget';
type SortDir = 'asc' | 'desc';

export function ThemeListView({ themes, onSelect }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    if (!sortField) return themes;
    return [...themes].sort((a, b) => {
      const av = (a as any)[sortField] ?? 0;
      const bv = (b as any)[sortField] ?? 0;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [themes, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  const toggleCheck = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(t => t.id)));
  };

  const sortIndicator = (field: SortField) => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const colHeaderStyle: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 600, color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: '0.6px',
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
      {/* Header */}
      <div
        className="grid items-center gap-0"
        style={{
          gridTemplateColumns: '36px 2.4fr 100px 100px 80px 80px 110px 120px 100px',
          height: 36, background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 12px',
        }}
      >
        <div><input type="checkbox" checked={selected.size === paged.length && paged.length > 0} onChange={toggleAll} style={{ width: 14, height: 14, accentColor: '#2563EB' }} /></div>
        <div onClick={() => toggleSort('title')} className="cursor-pointer select-none" style={colHeaderStyle}>Theme{sortIndicator('title')}</div>
        <div style={colHeaderStyle}>Status</div>
        <div onClick={() => toggleSort('progress_pct')} className="cursor-pointer select-none" style={colHeaderStyle}>Progress{sortIndicator('progress_pct')}</div>
        <div onClick={() => toggleSort('goal_count')} className="cursor-pointer select-none" style={colHeaderStyle}>Goals{sortIndicator('goal_count')}</div>
        <div style={colHeaderStyle}>KRs</div>
        <div onClick={() => toggleSort('planned_budget')} className="cursor-pointer select-none" style={colHeaderStyle}>Budget (SAR){sortIndicator('planned_budget')}</div>
        <div style={colHeaderStyle}>Owner</div>
        <div style={colHeaderStyle}>BSC</div>
      </div>

      {/* Rows */}
      {paged.map(theme => {
        const health = deriveHealthStatus(theme);
        const sc = STATUS_CONFIG[health];
        const bsc = theme.bsc_perspective ? BSC_CONFIG[theme.bsc_perspective] : null;
        const progressColor = getProgressColor(theme.progress_pct);

        return (
          <div
            key={theme.id}
            onClick={() => onSelect(theme)}
            className="grid items-center gap-0 cursor-pointer transition-colors"
            style={{
              gridTemplateColumns: '36px 2.4fr 100px 100px 80px 80px 110px 120px 100px',
              height: 44,
              borderBottom: '1px solid #F1F5F9',
              padding: '0 12px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Checkbox */}
            <div onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={selected.has(theme.id)} onChange={() => toggleCheck(theme.id)} style={{ width: 14, height: 14, accentColor: '#2563EB' }} />
            </div>

            {/* Theme */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 rounded-full" style={{ width: 10, height: 10, background: theme.color }} />
              <span className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>{theme.title}</span>
              <span className="shrink-0" style={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>{formatThemeId(theme.sort_order)}</span>
            </div>

            {/* Status pill — dot + label (Linear style) */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, background: sc.bg, color: sc.text }}>
                <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: sc.dot }} />
                {sc.label}
              </span>
            </div>

            {/* Progress — threshold colors */}
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: '#E2E8F0' }}>
                <div className="rounded-full h-full transition-all" style={{ width: `${Math.min(theme.progress_pct, 100)}%`, background: progressColor }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#334155', minWidth: 28, textAlign: 'right' }}>{theme.progress_pct}%</span>
            </div>

            {/* Goals */}
            <div style={{ fontSize: 12, color: '#334155', textAlign: 'center' }}>{theme.goal_count}</div>

            {/* KRs */}
            <div style={{ fontSize: 12, color: '#334155', textAlign: 'center' }}>{theme.kr_count}</div>

            {/* Budget */}
            <div style={{ fontSize: 12, fontWeight: 500, color: '#334155' }}>{formatBudget(theme.planned_budget)}</div>

            {/* Owner */}
            <div className="flex items-center gap-1.5">
              {theme.owner_name ? (
                <>
                  <div className="shrink-0 rounded-full flex items-center justify-center" style={{
                    width: 22, height: 22, background: getAvatarColor(theme.owner_name),
                    fontSize: 9, fontWeight: 700, color: '#FFFFFF',
                  }}>
                    {getInitials(theme.owner_name)}
                  </div>
                  <span className="truncate" style={{ fontSize: 12, color: '#334155' }}>{theme.owner_name?.split(' ')[0]}</span>
                </>
              ) : (
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Unassigned</span>
              )}
            </div>

            {/* BSC — outlined ghost style */}
            <div>
              {bsc ? (
                <span className="inline-flex rounded-full px-2 py-0.5" style={{
                  fontSize: 10, fontWeight: 500,
                  background: bsc.bg, color: bsc.text,
                  border: `1px solid ${bsc.border}`,
                }}>
                  {bsc.label}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: '#94A3B8' }}>—</span>
              )}
            </div>
          </div>
        );
      })}

      {themes.length === 0 && (
        <div className="flex items-center justify-center" style={{ height: 120, color: '#94A3B8', fontSize: 13 }}>
          No themes match the current filters.
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#E2E8F0' }}>
        <span style={{ fontSize: 12, color: '#64748B' }}>
          Showing {Math.min((page - 1) * perPage + 1, sorted.length)}–{Math.min(page * perPage, sorted.length)} of {sorted.length} themes
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, border: '1px solid #E2E8F0', background: '#FFF', color: page === 1 ? '#CBD5E1' : '#334155', cursor: page === 1 ? 'default' : 'pointer' }}
          >←</button>
          <span style={{ fontSize: 12, color: '#64748B' }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, border: '1px solid #E2E8F0', background: '#FFF', color: page === totalPages ? '#CBD5E1' : '#334155', cursor: page === totalPages ? 'default' : 'pointer' }}
          >→</button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#0F172A', color: '#FFFFFF', borderRadius: 10,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 50,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{selected.size} selected</span>
          <button style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 4, border: 'none', color: '#FFF', cursor: 'pointer' }}>Change Status</button>
          <button style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 4, border: 'none', color: '#FFF', cursor: 'pointer' }}>Assign Owner</button>
          <button style={{ fontSize: 11, background: 'rgba(239,68,68,0.7)', padding: '4px 12px', borderRadius: 4, border: 'none', color: '#FFF', cursor: 'pointer' }}>Delete</button>
        </div>
      )}
    </div>
  );
}
