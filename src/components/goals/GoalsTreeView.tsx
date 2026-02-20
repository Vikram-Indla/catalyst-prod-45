/**
 * GoalsTreeView — 3-level expandable tree: Theme → Goal → Key Result
 * Fixes: 1 (status), 2 (AI badge), 7 (columns), 8 (KR status), 9 (theme aggregation),
 *        14 (expand state), 16 (footer), 18 (KR check-in hover)
 */
import { ChevronRight, Sparkles, ClipboardCheck, Target, X } from 'lucide-react';
import type { Goal, KeyResult } from '@/types/goals';

interface Theme { id: string; title: string; color: string; status: string; }

interface GoalsTreeViewProps {
  goals: Goal[];
  keyResults: KeyResult[];
  themes: Theme[];
  searchQuery: string;
  expandedThemes: Set<string>;
  expandedGoals: Set<string>;
  onToggleTheme: (id: string) => void;
  onToggleGoal: (id: string) => void;
  onGoalClick: (goalId: string) => void;
  onCheckinClick: (krId: string) => void;
  onClearSearch?: () => void;
}

// ── Status badge (Linear-style) ──
function statusBadge(status: string) {
  const map: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    active:      { dot: '#16A34A', bg: 'rgba(22,163,74,0.08)',  text: '#15803D', label: 'Active' },
    on_track:    { dot: '#16A34A', bg: 'rgba(22,163,74,0.08)',  text: '#15803D', label: 'On Track' },
    completed:   { dot: '#4F46E5', bg: 'rgba(79,70,229,0.08)',  text: '#4338CA', label: 'Completed' },
    achieved:    { dot: '#4F46E5', bg: 'rgba(79,70,229,0.08)',  text: '#4338CA', label: 'Achieved' },
    at_risk:     { dot: '#D97706', bg: 'rgba(217,119,6,0.08)',  text: '#B45309', label: 'At Risk' },
    off_track:   { dot: '#EF4444', bg: 'rgba(239,68,68,0.08)',  text: '#DC2626', label: 'Off Track' },
    draft:       { dot: '#94A3B8', bg: '#F1F5F9',               text: '#64748B', label: 'Draft' },
    not_started: { dot: '#94A3B8', bg: '#F1F5F9',               text: '#64748B', label: 'Not Started' },
    cancelled:   { dot: '#94A3B8', bg: '#F1F5F9',               text: '#64748B', label: 'Cancelled' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: s.text, background: s.bg, borderRadius: 99, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function progressBar(pct: number, height = 6, label?: string) {
  const color = pct >= 60 ? '#16A34A' : pct >= 40 ? '#D97706' : '#EF4444';
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label || `Progress: ${Math.round(pct)}%`} style={{ width: '100%', height, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 300ms ease' }} />
    </div>
  );
}

function confidenceLabel(val: number | string | undefined) {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'string') {
    const map: Record<string, string> = { high: '80%', medium: '50%', low: '25%' };
    return map[val] ?? val;
  }
  const pct = typeof val === 'number' && val <= 1 ? Math.round(val * 100) : Math.round(val as number);
  return `${pct}%`;
}

function confidenceColor(val: number | string | undefined): string {
  if (val === undefined || val === null) return '#94A3B8';
  let pct: number;
  if (typeof val === 'string') {
    const map: Record<string, number> = { high: 80, medium: 50, low: 25 };
    pct = map[val] ?? 50;
  } else {
    pct = val <= 1 ? Math.round(val * 100) : Math.round(val);
  }
  return pct >= 70 ? '#16A34A' : pct >= 40 ? '#D97706' : '#EF4444';
}

// Fix 9: Theme status from child goals
function computeThemeStatus(goals: Goal[]): string {
  if (goals.some(g => g.status === 'off_track')) return 'off_track';
  if (goals.some(g => g.status === 'at_risk')) return 'at_risk';
  if (goals.every(g => g.status === 'completed')) return 'completed';
  if (goals.every(g => g.status === 'draft')) return 'draft';
  return 'active';
}

// Fix 7: merged progress columns — "STATUS | PROGRESS | CONF. | KRS | OWNER | AI"
const GRID_COLS = 'minmax(340px, 1fr) 96px 140px 72px 72px 100px 60px';

/* Skeleton for loading */
export function GoalsTreeSkeleton() {
  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ height: 36, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="ph-shimmer" style={{ height: 44, borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }} />
      ))}
      <style>{`
        @keyframes phShimmer { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        .ph-shimmer { animation: phShimmer 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* Empty state for no goals */
export function GoalsEmptyState({ onCreateGoal }: { onCreateGoal: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', border: '1px solid #E2E8F0', borderRadius: 10, background: '#FFFFFF' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Target size={24} color="#94A3B8" />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No goals yet</div>
      <div style={{ fontSize: 12.5, color: '#94A3B8', marginBottom: 20, textAlign: 'center', maxWidth: 320 }}>Create your first goal to start tracking progress.</div>
      <button onClick={onCreateGoal} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: '#2563EB', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
        + Create Goal
      </button>
    </div>
  );
}

/* Empty state for no search results */
export function GoalsNoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', border: '1px solid #E2E8F0', borderRadius: 10, background: '#FFFFFF' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 4 }}>No goals matching "{query}"</div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>Try a different search term.</div>
      <button onClick={onClear} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer' }}>
        <X size={12} /> Clear search
      </button>
    </div>
  );
}

function ownerAvatar(name?: string, avatar?: string) {
  if (!name) return <span style={{ fontSize: 11, color: '#CBD5E1' }}>—</span>;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#4338CA', flexShrink: 0 }}>
        {initials}
      </div>
      <span style={{ fontSize: 11, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name.split(' ')[0]}</span>
    </div>
  );
}

export function GoalsTreeView({
  goals, keyResults, themes, searchQuery,
  expandedThemes, expandedGoals,
  onToggleTheme, onToggleGoal, onGoalClick, onCheckinClick, onClearSearch,
}: GoalsTreeViewProps) {
  const query = searchQuery.toLowerCase().trim();

  const goalsByTheme = new Map<string, Goal[]>();
  goals.forEach(g => {
    const list = goalsByTheme.get(g.theme_id) || [];
    list.push(g);
    goalsByTheme.set(g.theme_id, list);
  });

  const krsByGoal = new Map<string, KeyResult[]>();
  keyResults.forEach(kr => {
    const list = krsByGoal.get(kr.goal_id) || [];
    list.push(kr);
    krsByGoal.set(kr.goal_id, list);
  });

  const filteredThemes = themes.filter(theme => {
    const themeGoals = goalsByTheme.get(theme.id) || [];
    if (!query) return themeGoals.length > 0;
    return themeGoals.some(g => {
      const goalMatch = g.title.toLowerCase().includes(query) || g.goal_key.toLowerCase().includes(query);
      const krs = krsByGoal.get(g.id) || [];
      const krMatch = krs.some(kr => kr.title.toLowerCase().includes(query) || kr.kr_key.toLowerCase().includes(query));
      return goalMatch || krMatch;
    });
  });

  const filterGoals = (themeGoals: Goal[]) => {
    if (!query) return themeGoals;
    return themeGoals.filter(g => {
      const goalMatch = g.title.toLowerCase().includes(query) || g.goal_key.toLowerCase().includes(query);
      const krs = krsByGoal.get(g.id) || [];
      const krMatch = krs.some(kr => kr.title.toLowerCase().includes(query) || kr.kr_key.toLowerCase().includes(query));
      return goalMatch || krMatch;
    });
  };

  if (query && filteredThemes.length === 0) {
    return <GoalsNoSearchResults query={searchQuery} onClear={() => onClearSearch?.()} />;
  }

  const totalFilteredGoals = filteredThemes.reduce((s, t) => s + filterGoals(goalsByTheme.get(t.id) || []).length, 0);
  const totalFilteredKRs = filteredThemes.reduce((s, t) => {
    const fg = filterGoals(goalsByTheme.get(t.id) || []);
    return s + fg.reduce((ks, g) => ks + (krsByGoal.get(g.id)?.length || 0), 0);
  }, 0);

  const lastUpdated = goals.length > 0
    ? new Date(Math.max(...goals.map(g => new Date(g.updated_at).getTime()))).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="goals-tree-container" style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#FFFFFF' }}>
      {/* Header — Fix 7: merged columns */}
      <div style={{
        display: 'grid', gridTemplateColumns: GRID_COLS,
        height: 36, alignItems: 'center',
        background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
        padding: '0 16px',
        fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: '#94A3B8',
      }}>
        <span>Goal / Key Result</span>
        <span>Status</span>
        <span>Progress</span>
        <span>Confidence</span>
        <span>KRs</span>
        <span>Owner</span>
        <span>AI</span>
      </div>

      {/* Body */}
      {filteredThemes.map(theme => {
        const themeGoals = filterGoals(goalsByTheme.get(theme.id) || []);
        const themeExpanded = expandedThemes.has(theme.id) || !!query;
        const avgProgress = themeGoals.length > 0
          ? Math.round(themeGoals.reduce((s, g) => s + (g.progress_pct || 0), 0) / themeGoals.length) : 0;
        // Fix 9: compute from child goal statuses
        const themeStatus = computeThemeStatus(themeGoals);

        return (
          <div key={theme.id}>
            {/* Theme Row */}
            <div
              role="button" tabIndex={0}
              onClick={() => onToggleTheme(theme.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleTheme(theme.id); } }}
              style={{
                display: 'grid', gridTemplateColumns: GRID_COLS,
                height: 44, alignItems: 'center', padding: '0 16px',
                background: '#FAFBFD', borderBottom: '1px solid #F1F5F9',
                cursor: 'pointer', userSelect: 'none', transition: 'background 100ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FAFBFD')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={14} color="#94A3B8" style={{ transform: themeExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0 }} />
                <span style={{ width: 10, height: 10, borderRadius: 3, background: theme.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{theme.title}</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>({themeGoals.length} goal{themeGoals.length !== 1 ? 's' : ''})</span>
              </div>
              <div>{statusBadge(themeStatus)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>{progressBar(avgProgress, 6, `${theme.title} progress`)}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', minWidth: 32, textAlign: 'right' }}>{avgProgress}%</span>
              </div>
              <div />
              <div style={{ fontSize: 12, color: '#64748B' }}>{themeGoals.reduce((s, g) => s + (g.kr_count || 0), 0)}</div>
              <div />
              <div />
            </div>

            {/* Goal Rows */}
            {themeExpanded && themeGoals.map(goal => {
              const goalExpanded = expandedGoals.has(goal.id) || !!query;
              const goalKRs = krsByGoal.get(goal.id) || [];
              const confPct = typeof goal.confidence_level === 'number'
                ? (goal.confidence_level <= 1 ? Math.round(goal.confidence_level * 100) : Math.round(goal.confidence_level)) : 0;

              return (
                <div key={goal.id}>
                  <div
                    role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoalClick(goal.id); } }}
                    style={{
                      display: 'grid', gridTemplateColumns: GRID_COLS,
                      height: 44, alignItems: 'center', padding: '0 16px 0 36px',
                      borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <ChevronRight
                        size={13} color="#94A3B8"
                        onClick={e => { e.stopPropagation(); onToggleGoal(goal.id); }}
                        style={{ transform: goalExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: 3, flexShrink: 0, fontFamily: 'ui-monospace, monospace' }}>
                        {goal.goal_key}
                      </span>
                      <span onClick={e => { e.stopPropagation(); onGoalClick(goal.id); }} style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {goal.title}
                      </span>
                    </div>
                    <div onClick={e => e.stopPropagation()}>{statusBadge(goal.status)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>{progressBar(goal.progress_pct || 0, 5, `${goal.title} progress`)}</div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', minWidth: 32, textAlign: 'right' }}>{Math.round(goal.progress_pct || 0)}%</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: confidenceColor(goal.confidence_level) }}>{confPct}%</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{goalKRs.length}</div>
                    <div>{ownerAvatar(goal.owner_name)}</div>
                    <div>
                      {goal.ai_health_score != null ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', padding: '2px 6px', borderRadius: 4 }}>
                          <Sparkles size={10} />
                          {goal.ai_health_score}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#CBD5E1' }}>—</span>
                      )}
                    </div>
                  </div>

                  {/* KR Rows */}
                  {goalExpanded && goalKRs.map(kr => {
                    const krProgress = kr.target === kr.baseline ? 0
                      : kr.target < kr.baseline
                        ? Math.min(100, Math.max(0, Math.round(((kr.baseline - kr.current_value) / (kr.baseline - kr.target)) * 100)))
                        : Math.min(100, Math.max(0, Math.round(((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100)));

                    return (
                      <div
                        key={kr.id}
                        className="kr-row-hover"
                        role="button" tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCheckinClick(kr.id); } }}
                        style={{
                          display: 'grid', gridTemplateColumns: GRID_COLS,
                          height: 40, alignItems: 'center', padding: '0 16px 0 58px',
                          borderBottom: '1px solid #F8FAFC', fontSize: 12, position: 'relative',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FEFCE8')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', background: '#F8FAFC', padding: '1px 5px', borderRadius: 3, flexShrink: 0, fontFamily: 'ui-monospace, monospace' }}>
                            {kr.kr_key}
                          </span>
                          <span style={{ color: '#334155', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {kr.title}
                          </span>
                          {/* Fix 18: hover-reveal check-in button */}
                          <button
                            onClick={e => { e.stopPropagation(); onCheckinClick(kr.id); }}
                            className="kr-checkin-btn"
                            aria-label={`Check-in for ${kr.kr_key}`}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '2px 8px', fontSize: 10.5, fontWeight: 500,
                              color: '#2563EB', background: 'transparent',
                              border: '1px solid #2563EB', borderRadius: 99, cursor: 'pointer',
                              opacity: 0, transition: 'opacity 150ms', flexShrink: 0,
                            }}
                          >
                            <ClipboardCheck size={10} />
                            Check-in
                          </button>
                        </div>
                        <div>{statusBadge(kr.status)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1 }}>{progressBar(krProgress, 5, `${kr.title} progress`)}</div>
                          <span style={{ fontWeight: 600, color: '#0F172A', minWidth: 32, textAlign: 'right' }}>{krProgress}%</span>
                        </div>
                        <div style={{ color: confidenceColor(kr.confidence_level) }}>{confidenceLabel(kr.confidence_level)}</div>
                        <div style={{ color: '#64748B', fontSize: 11 }}>
                          {kr.current_value}{kr.metric_unit ? ` ${kr.metric_unit}` : ''}/{kr.target}
                        </div>
                        <div />
                        <div />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Fix 16: Footer */}
      <div style={{ padding: '10px 16px', fontSize: 11, color: '#94A3B8', borderTop: '1px solid #F1F5F9', background: '#FAFBFD', display: 'flex', justifyContent: 'space-between' }}>
        <span>Showing {totalFilteredGoals} goals, {totalFilteredKRs} key results across {filteredThemes.length} themes</span>
        {lastUpdated && <span>Last updated: {lastUpdated}</span>}
      </div>

      <style>{`
        .kr-row-hover:hover .kr-checkin-btn { opacity: 1 !important; }
        @media (max-width: 1023px) {
          .goals-tree-container { overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}
