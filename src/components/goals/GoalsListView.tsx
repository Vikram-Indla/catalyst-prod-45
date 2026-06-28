/**
 * GoalsListView — ECLIPSE D8: Dark mode parity
 */
import { useState } from 'react';
import { ChevronUp, ChevronDown } from '@/lib/atlaskit-icons';
import type { Goal } from '@/types/goals';

interface Theme { id: string; title: string; color: string; }
interface GoalsListViewProps { goals: Goal[]; themes: Theme[]; onGoalClick: (id: string) => void; isDark?: boolean; }

const DK = {
  t1: 'var(--cp-t1)',
  t2: 'var(--cp-t2)',
  t3: 'var(--cp-t3)',
  t4: 'var(--cp-t4)',
  border: 'var(--ds-border, var(--cp-ink-1))',
  borderSubtle: 'var(--ds-border, var(--cp-ink-1))',
};

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  'Nada Alfassam':      { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)' },
  'Sitah Alqahtani':    { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)' },
  'Sulaiman Alessa':    { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)' },
  'ibrahim alqusiyer':  { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)' },
  'Khaled Alghithy':    { bg: '#CFFAFE', text: '#155E75' }, // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  'Izza Ali':           { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)' },
};
function getAvatarColors(name: string) {
  if (AVATAR_COLORS[name]) return AVATAR_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const palettes = [{ bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)' }, { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)' }, { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)' }, { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)' }, { bg: '#CFFAFE', text: '#155E75' }, { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)' }];
  return palettes[Math.abs(hash) % palettes.length];
}

function statusBadge(status: string, isDark = false) {
  const map: Record<string, { dot: string; bg: string; text: string; bgDk: string; txtDk: string; label: string }> = {
    active:      { dot: 'var(--ds-text-success, var(--cp-success))', bg: 'var(--ds-background-success-bold, rgba(22,163,74,0.08))',  text: 'var(--ds-background-success-bold, var(--ds-background-success-bold))', bgDk: 'var(--ds-text, var(--ds-text))', txtDk: 'var(--ds-background-success)', label: 'Active' },
    on_track:    { dot: 'var(--ds-text-success, var(--cp-success))', bg: 'var(--ds-background-success-bold, rgba(22,163,74,0.08))',  text: 'var(--ds-background-success-bold, var(--ds-background-success-bold))', bgDk: 'var(--ds-text, var(--ds-text))', txtDk: 'var(--ds-background-success)', label: 'On Track' },
    completed:   { dot: 'var(--ds-background-discovery-bold)', bg: 'rgba(79,70,229,0.08)',  text: 'var(--ds-background-discovery-bold, var(--ds-background-discovery-bold))', bgDk: 'var(--ds-text, var(--ds-text))', txtDk: 'var(--ds-background-information-bold, var(--ds-link))', label: 'Completed' },
    at_risk:     { dot: 'var(--ds-text-warning, var(--cp-warning))', bg: 'var(--ds-background-warning, rgba(217,119,6,0.08))',  text: 'var(--ds-background-warning-bold, var(--ds-background-warning-bold))', bgDk: '#2A2418', txtDk: 'var(--ds-background-warning-bold, var(--ds-background-warning-bold))', label: 'At Risk' },
    off_track:   { dot: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger, rgba(239,68,68,0.08))',  text: 'var(--ds-text-danger, var(--cp-danger))', bgDk: 'var(--ds-text, var(--ds-text))', txtDk: 'var(--ds-border-danger)', label: 'Off Track' },
    draft:       { dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',               text: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', bgDk: 'var(--ds-surface-raised, var(--cp-ink-1))', txtDk: 'var(--ds-text-subtlest)', label: 'Draft' },
    not_started: { dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',               text: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', bgDk: 'var(--ds-surface-raised, var(--cp-ink-1))', txtDk: 'var(--ds-text-subtlest)', label: 'Not Started' },
    cancelled:   { dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',               text: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', bgDk: 'var(--ds-surface-raised, var(--cp-ink-1))', txtDk: 'var(--ds-text-subtlest)', label: 'Cancelled' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: isDark ? s.txtDk : s.text, background: isDark ? s.bgDk : s.bg, borderRadius: 99 }}>
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
  const rowHover = isDark ? 'var(--ds-surface-overlay)' : 'var(--bg-1)';

  return (
    <div style={{ border: `1px solid ${tableBorder}`, borderRadius: 12, overflow: 'hidden', background: isDark ? 'transparent' : 'var(--bg-app)' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, height: 50, alignItems: 'center', padding: '0 16px', background: isDark ? 'transparent' : 'var(--bg-app)', borderBottom: `2px solid ${tableBorder}`, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? DK.t3 : 'var(--fg-3)' }}>
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
        const barColor = pct >= 60 ? 'var(--ds-text-success, var(--cp-success))' : pct >= 40 ? 'var(--ds-text-warning, var(--cp-warning))' : 'var(--ds-text-danger)';
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
            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: isDark ? DK.t2 : 'var(--fg-2)', background: isDark ? 'var(--ds-surface-overlay)' : 'var(--cp-bd-zone)', padding: '2px 8px', borderRadius: 4, justifySelf: 'start', fontFamily: 'ui-monospace, monospace' }}>{goal.goal_key}</span>
            <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: isDark ? DK.t1 : 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {theme && (<><span style={{ width: 8, height: 8, borderRadius: 4, background: theme.color, flexShrink: 0 }} /><span style={{ fontSize: 'var(--ds-font-size-200)', color: isDark ? DK.t2 : 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theme.title}</span></>)}
            </div>
            <div>{statusBadge(goal.status, isDark)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {goal.owner_name && ownerColors ? (
                <>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: ownerColors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: ownerColors.text, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: isDark ? DK.t1 : 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.owner_name}</span>
                </>
              ) : (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? DK.t4 : 'var(--ds-text-disabled)' }}>—</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ width: 60, height: 5, background: isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: barColor }}>{pct}%</span>
            </div>
            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: isDark ? DK.t2 : 'var(--fg-2)' }}>{goal.kr_count || 0}</span>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? DK.t3 : 'var(--fg-3)' }}>{goal.fiscal_quarter || '—'}</span>
          </div>
        );
      })}
    </div>
  );
}
