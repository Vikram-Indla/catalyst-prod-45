/**
 * GoalsListView — ECLIPSE D8: Dark mode parity
 */
import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { Goal } from '@/types/goals';

interface Theme { id: string; title: string; color: string; }
interface GoalsListViewProps { goals: Goal[]; themes: Theme[]; onGoalClick: (id: string) => void; isDark?: boolean; }

const DK = {
  t1: 'var(--cp-t1)',
  t2: 'var(--cp-t2)',
  t3: 'var(--cp-t3)',
  t4: 'var(--cp-t4)',
  border: 'rgba(255,255,255,0.10)',
  borderSubtle: 'rgba(255,255,255,0.08)',
};

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  'Nada Alfassam':      { bg: '#DBEAFE', text: '#7DB8FC' },
  'Sitah Alqahtani':    { bg: '#E0E7FF', text: '#3730A3' },
  'Sulaiman Alessa':    { bg: '#D1FAE5', text: '#4ADE80' },
  'ibrahim alqusiyer':  { bg: 'rgba(251,191,36,0.10)', text: '#FBBF24' },
  'Khaled Alghithy':    { bg: '#CFFAFE', text: '#155E75' },
  'Izza Ali':           { bg: '#EDE9FE', text: '#A78BFA' },
};
function getAvatarColors(name: string) {
  if (AVATAR_COLORS[name]) return AVATAR_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const palettes = [{ bg: '#DBEAFE', text: '#7DB8FC' }, { bg: '#D1FAE5', text: '#4ADE80' }, { bg: '#E0E7FF', text: '#3730A3' }, { bg: 'rgba(251,191,36,0.10)', text: '#FBBF24' }, { bg: '#CFFAFE', text: '#155E75' }, { bg: '#EDE9FE', text: '#A78BFA' }];
  return palettes[Math.abs(hash) % palettes.length];
}

function statusBadge(status: string, isDark = false) {
  const map: Record<string, { dot: string; bg: string; text: string; bgDk: string; txtDk: string; label: string }> = {
    active:      { dot: '#16A34A', bg: 'rgba(22,163,74,0.08)',  text: '#15803D', bgDk: '#182820', txtDk: '#86EFAC', label: 'Active' },
    on_track:    { dot: '#16A34A', bg: 'rgba(22,163,74,0.08)',  text: '#15803D', bgDk: '#182820', txtDk: '#86EFAC', label: 'On Track' },
    completed:   { dot: '#4F46E5', bg: 'rgba(79,70,229,0.08)',  text: '#4338CA', bgDk: '#1A2030', txtDk: '#93C5FD', label: 'Completed' },
    at_risk:     { dot: '#D97706', bg: 'rgba(217,119,6,0.08)',  text: '#B45309', bgDk: '#2A2418', txtDk: '#FBBF24', label: 'At Risk' },
    off_track:   { dot: '#EF4444', bg: 'rgba(239,68,68,0.08)',  text: '#DC2626', bgDk: '#2A1C1E', txtDk: '#FCA5A5', label: 'Off Track' },
    draft:       { dot: 'rgba(237,237,237,0.40)', bg: '#1A1A1A',               text: 'rgba(237,237,237,0.40)', bgDk: '#1A1A1A', txtDk: '#A1A1A1', label: 'Draft' },
    not_started: { dot: 'rgba(237,237,237,0.40)', bg: '#1A1A1A',               text: 'rgba(237,237,237,0.40)', bgDk: '#1A1A1A', txtDk: '#A1A1A1', label: 'Not Started' },
    cancelled:   { dot: 'rgba(237,237,237,0.40)', bg: '#1A1A1A',               text: 'rgba(237,237,237,0.40)', bgDk: '#1A1A1A', txtDk: '#A1A1A1', label: 'Cancelled' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: isDark ? s.txtDk : s.text, background: isDark ? s.bgDk : s.bg, borderRadius: 99 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  );
}

type SortKey = 'goal_key' | 'title' | 'progress_pct' | 'kr_count' | 'fiscal_quarter';
type SortDir = 'asc' | 'desc' | null;

const COLS: { key: SortKey | 'theme' | 'status' | 'owner'; label: string; width: string; sortable?: boolean }[] = [
  { key: 'goal_key', label: 'ID', width: '80px', sortable: true },
  { key: 'title', label: 'Goal', width: '1fr', sortable: true },
  { key: 'theme', label: 'Theme', width: '160px' },
  { key: 'status', label: 'Status', width: '110px' },
  { key: 'owner', label: 'Owner', width: '140px' },
  { key: 'progress_pct', label: 'Progress', width: '120px', sortable: true },
  { key: 'kr_count', label: 'KRs', width: '60px', sortable: true },
  { key: 'fiscal_quarter', label: 'Quarter', width: '90px', sortable: true },
];

export function GoalsListView({ goals, themes, onGoalClick, isDark = false }: GoalsListViewProps) {
  const themeMap = new Map(themes.map(t => [t.id, t]));
  const gridCols = COLS.map(c => c.width).join(' ');

  const [sortKey, setSortKey] = useState<SortKey>('goal_key');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: string) => {
    const k = key as SortKey;
    if (sortKey === k) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortDir(null); setSortKey('goal_key'); }
      else setSortDir('asc');
    } else { setSortKey(k); setSortDir('asc'); }
  };

  const sortedGoals = [...goals].sort((a, b) => {
    if (!sortDir) return 0;
    const dir = sortDir === 'asc' ? 1 : -1;
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  const tableBorder = isDark ? DK.border : 'var(--divider)';
  const rowBorder = isDark ? DK.borderSubtle : 'var(--cp-bd-zone)';
  const rowBg = isDark ? 'transparent' : 'transparent';
  const rowHover = isDark ? 'rgba(255,255,255,0.03)' : 'var(--bg-1)';

  return (
    <div style={{ border: `1px solid ${tableBorder}`, borderRadius: 12, overflow: 'hidden', background: isDark ? 'transparent' : 'var(--bg-app)' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, height: 50, alignItems: 'center', padding: '0 16px', background: isDark ? 'transparent' : 'var(--bg-app)', borderBottom: `2px solid ${tableBorder}`, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? DK.t3 : 'var(--fg-3)' }}>
        {COLS.map(c => (
          <span
            key={c.key}
            onClick={() => c.sortable && handleSort(c.key)}
            style={{ cursor: c.sortable ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 3, userSelect: 'none' }}
          >
            {c.label}
            {c.sortable && sortKey === c.key && sortDir === 'asc' && <ChevronUp size={10} />}
            {c.sortable && sortKey === c.key && sortDir === 'desc' && <ChevronDown size={10} />}
          </span>
        ))}
      </div>
      {sortedGoals.map(goal => {
        const theme = themeMap.get(goal.theme_id);
        const pct = Math.round(goal.progress_pct || 0);
        const barColor = pct >= 60 ? '#16A34A' : pct >= 40 ? '#D97706' : '#EF4444';
        const initials = goal.owner_name ? goal.owner_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '';
        const ownerColors = goal.owner_name ? getAvatarColors(goal.owner_name) : null;
        return (
          <div
            key={goal.id}
            role="button" tabIndex={0}
            onClick={() => onGoalClick(goal.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoalClick(goal.id); } }}
            style={{ display: 'grid', gridTemplateColumns: gridCols, height: 44, alignItems: 'center', padding: '0 16px', borderBottom: `1px solid ${rowBorder}`, cursor: 'pointer', transition: 'background 150ms' }}
            onMouseEnter={e => (e.currentTarget.style.background = rowHover)}
            onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? DK.t2 : 'var(--fg-2)', background: isDark ? 'rgba(255,255,255,0.04)' : 'var(--cp-bd-zone)', padding: '2px 8px', borderRadius: 4, justifySelf: 'start', fontFamily: 'ui-monospace, monospace' }}>{goal.goal_key}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: isDark ? DK.t1 : 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {theme && (<><span style={{ width: 8, height: 8, borderRadius: 4, background: theme.color, flexShrink: 0 }} /><span style={{ fontSize: 12, color: isDark ? DK.t2 : 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theme.title}</span></>)}
            </div>
            <div>{statusBadge(goal.status, isDark)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {goal.owner_name && ownerColors ? (
                <>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: ownerColors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: ownerColors.text, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: isDark ? DK.t1 : 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.owner_name}</span>
                </>
              ) : (
                <span style={{ fontSize: 11, color: isDark ? DK.t4 : 'rgba(237,237,237,0.53)' }}>—</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ width: 60, height: 5, background: isDark ? 'rgba(255,255,255,0.08)' : 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: barColor }}>{pct}%</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? DK.t2 : 'var(--fg-2)' }}>{goal.kr_count || 0}</span>
            <span style={{ fontSize: 11, color: isDark ? DK.t3 : 'var(--fg-3)' }}>{goal.fiscal_quarter || '—'}</span>
          </div>
        );
      })}
    </div>
  );
}
