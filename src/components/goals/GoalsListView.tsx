/**
 * GoalsListView — Flat table of all goals
 * FIX 1: Darker text on status badges, FIX 7: ARIA, FIX 8: hover transitions
 */
import type { Goal } from '@/types/goals';

interface Theme { id: string; title: string; color: string; }
interface GoalsListViewProps { goals: Goal[]; themes: Theme[]; onGoalClick: (id: string) => void; }

function statusBadge(status: string) {
  const map: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    active:      { dot: '#16A34A', bg: 'rgba(22,163,74,0.08)',  text: '#15803D', label: 'Active' },
    on_track:    { dot: '#16A34A', bg: 'rgba(22,163,74,0.08)',  text: '#15803D', label: 'On Track' },
    in_progress: { dot: '#2563EB', bg: 'rgba(37,99,235,0.08)',  text: '#1D4ED8', label: 'In Progress' },
    completed:   { dot: '#2563EB', bg: 'rgba(37,99,235,0.08)',  text: '#1D4ED8', label: 'Completed' },
    achieved:    { dot: '#2563EB', bg: 'rgba(37,99,235,0.08)',  text: '#1D4ED8', label: 'Achieved' },
    at_risk:     { dot: '#D97706', bg: 'rgba(217,119,6,0.08)',  text: '#B45309', label: 'At Risk' },
    off_track:   { dot: '#EF4444', bg: 'rgba(239,68,68,0.08)',  text: '#DC2626', label: 'Off Track' },
    draft:       { dot: '#94A3B8', bg: '#F1F5F9',               text: '#64748B', label: 'Draft' },
    not_started: { dot: '#94A3B8', bg: '#F1F5F9',               text: '#64748B', label: 'Not Started' },
    cancelled:   { dot: '#94A3B8', bg: '#F1F5F9',               text: '#64748B', label: 'Cancelled' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: s.text, background: s.bg, borderRadius: 99 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  );
}

const COLS = [
  { key: 'id', label: 'ID', width: '80px' },
  { key: 'title', label: 'Goal', width: '1fr' },
  { key: 'theme', label: 'Theme', width: '180px' },
  { key: 'status', label: 'Status', width: '110px' },
  { key: 'progress', label: 'Progress', width: '120px' },
  { key: 'krs', label: 'KRs', width: '60px' },
  { key: 'quarter', label: 'Quarter', width: '90px' },
];

export function GoalsListView({ goals, themes, onGoalClick }: GoalsListViewProps) {
  const themeMap = new Map(themes.map(t => [t.id, t]));
  const gridCols = COLS.map(c => c.width).join(' ');

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#FFFFFF' }}>
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, height: 36, alignItems: 'center', padding: '0 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}>
        {COLS.map(c => <span key={c.key}>{c.label}</span>)}
      </div>
      {goals.map(goal => {
        const theme = themeMap.get(goal.theme_id);
        const pct = Math.round(goal.progress_pct || 0);
        const barColor = pct >= 60 ? '#16A34A' : pct >= 40 ? '#D97706' : '#EF4444';
        return (
          <div
            key={goal.id}
            role="button"
            tabIndex={0}
            onClick={() => onGoalClick(goal.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoalClick(goal.id); } }}
            style={{ display: 'grid', gridTemplateColumns: gridCols, height: 44, alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background 100ms' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: 4, justifySelf: 'start', fontFamily: 'ui-monospace, monospace' }}>{goal.goal_key}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {theme && (<><span style={{ width: 8, height: 8, borderRadius: 2, background: theme.color, flexShrink: 0 }} /><span style={{ fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theme.title}</span></>)}
            </div>
            <div>{statusBadge(goal.status)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ width: 60, height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{pct}%</span>
            </div>
            <span style={{ fontSize: 12, color: '#64748B' }}>{goal.kr_count || 0}</span>
            <span style={{ fontSize: 11, color: '#64748B' }}>{goal.fiscal_quarter || '—'}</span>
          </div>
        );
      })}
    </div>
  );
}
