/**
 * GoalsTreeView — 3-level expandable tree: Theme → Goal → Key Result
 */
import { ChevronRight, Sparkles, ClipboardCheck } from 'lucide-react';
import type { Goal, KeyResult } from '@/types/goals';

interface Theme {
  id: string;
  title: string;
  color: string;
  status: string;
}

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
}

// ── Helpers ──

function statusBadge(status: string) {
  const map: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    active:      { dot: '#16A34A', bg: 'rgba(22,163,74,0.08)',  text: '#16A34A', label: 'Active' },
    on_track:    { dot: '#16A34A', bg: 'rgba(22,163,74,0.08)',  text: '#16A34A', label: 'On Track' },
    in_progress: { dot: '#2563EB', bg: 'rgba(37,99,235,0.08)',  text: '#2563EB', label: 'In Progress' },
    completed:   { dot: '#2563EB', bg: 'rgba(37,99,235,0.08)',  text: '#2563EB', label: 'Completed' },
    achieved:    { dot: '#2563EB', bg: 'rgba(37,99,235,0.08)',  text: '#2563EB', label: 'Achieved' },
    at_risk:     { dot: '#D97706', bg: 'rgba(217,119,6,0.08)',  text: '#D97706', label: 'At Risk' },
    off_track:   { dot: '#EF4444', bg: 'rgba(239,68,68,0.08)',  text: '#EF4444', label: 'Off Track' },
    draft:       { dot: '#94A3B8', bg: 'rgba(148,163,184,0.08)', text: '#64748B', label: 'Draft' },
    not_started: { dot: '#94A3B8', bg: 'rgba(148,163,184,0.08)', text: '#64748B', label: 'Not Started' },
    cancelled:   { dot: '#94A3B8', bg: 'rgba(148,163,184,0.08)', text: '#64748B', label: 'Cancelled' },
  };
  const s = map[status] || map.draft;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
        color: s.text,
        background: s.bg,
        borderRadius: 99,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function progressBar(pct: number, height = 6) {
  const color = pct >= 60 ? '#16A34A' : pct >= 40 ? '#D97706' : '#EF4444';
  return (
    <div style={{ width: '100%', height, background: '#F1F5F9', borderRadius: height / 2, overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: '100%',
          background: color,
          borderRadius: height / 2,
          transition: 'width 300ms ease',
        }}
      />
    </div>
  );
}

function confidenceLabel(val: number | string | undefined) {
  if (val === undefined || val === null) return '—';
  // Handle text values like 'high', 'medium', 'low'
  if (typeof val === 'string') {
    const map: Record<string, string> = { high: '80%', medium: '50%', low: '25%' };
    return map[val] ?? val;
  }
  // Numeric: if ≤1 treat as fraction
  const pct = typeof val === 'number' && val <= 1 ? Math.round(val * 100) : Math.round(val as number);
  return `${pct}%`;
}

const GRID_COLS = 'minmax(360px, 1fr) 96px 72px 110px 72px 72px 60px';

export function GoalsTreeView({
  goals, keyResults, themes, searchQuery,
  expandedThemes, expandedGoals,
  onToggleTheme, onToggleGoal, onGoalClick, onCheckinClick,
}: GoalsTreeViewProps) {
  const query = searchQuery.toLowerCase().trim();

  // Group goals by theme
  const goalsByTheme = new Map<string, Goal[]>();
  goals.forEach(g => {
    const list = goalsByTheme.get(g.theme_id) || [];
    list.push(g);
    goalsByTheme.set(g.theme_id, list);
  });

  // Group KRs by goal
  const krsByGoal = new Map<string, KeyResult[]>();
  keyResults.forEach(kr => {
    const list = krsByGoal.get(kr.goal_id) || [];
    list.push(kr);
    krsByGoal.set(kr.goal_id, list);
  });

  // Filter by search
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

  const totalFilteredGoals = filteredThemes.reduce((s, t) => s + filterGoals(goalsByTheme.get(t.id) || []).length, 0);
  const totalFilteredKRs = filteredThemes.reduce((s, t) => {
    const fg = filterGoals(goalsByTheme.get(t.id) || []);
    return s + fg.reduce((ks, g) => ks + (krsByGoal.get(g.id)?.length || 0), 0);
  }, 0);

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#FFFFFF' }}>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID_COLS,
          height: 36,
          alignItems: 'center',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 16px',
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#94A3B8',
        }}
      >
        <span>Goal / Key Result</span>
        <span>Status</span>
        <span>Progress</span>
        <span>Progress</span>
        <span>Conf.</span>
        <span>KRs</span>
        <span>AI</span>
      </div>

      {/* Body */}
      {filteredThemes.map(theme => {
        const themeGoals = filterGoals(goalsByTheme.get(theme.id) || []);
        const themeExpanded = expandedThemes.has(theme.id) || !!query;
        const avgProgress = themeGoals.length > 0
          ? Math.round(themeGoals.reduce((s, g) => s + (g.progress_pct || 0), 0) / themeGoals.length)
          : 0;
        const themeStatus = avgProgress >= 60 ? 'on_track' : avgProgress >= 40 ? 'at_risk' : 'off_track';

        return (
          <div key={theme.id}>
            {/* Theme Row */}
            <div
              onClick={() => onToggleTheme(theme.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                height: 44,
                alignItems: 'center',
                padding: '0 16px',
                background: '#FAFBFD',
                borderBottom: '1px solid #F1F5F9',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight
                  size={14}
                  color="#94A3B8"
                  style={{
                    transform: themeExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: theme.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                  {theme.title}
                </span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  ({themeGoals.length} goal{themeGoals.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div>{statusBadge(themeStatus)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{avgProgress}%</div>
              <div>{progressBar(avgProgress)}</div>
              <div />
              <div style={{ fontSize: 12, color: '#64748B' }}>
                {themeGoals.reduce((s, g) => s + (g.kr_count || 0), 0)}
              </div>
              <div />
            </div>

            {/* Goal Rows */}
            {themeExpanded && themeGoals.map(goal => {
              const goalExpanded = expandedGoals.has(goal.id) || !!query;
              const goalKRs = krsByGoal.get(goal.id) || [];
              const confPct = typeof goal.confidence_level === 'number'
                ? (goal.confidence_level <= 1 ? Math.round(goal.confidence_level * 100) : Math.round(goal.confidence_level))
                : 0;

              return (
                <div key={goal.id}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: GRID_COLS,
                      height: 44,
                      alignItems: 'center',
                      padding: '0 16px 0 36px',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <ChevronRight
                        size={13}
                        color="#94A3B8"
                        onClick={e => { e.stopPropagation(); onToggleGoal(goal.id); }}
                        style={{
                          transform: goalExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 200ms',
                          flexShrink: 0,
                          cursor: 'pointer',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: '#64748B',
                          background: '#F1F5F9',
                          padding: '1px 6px',
                          borderRadius: 4,
                          flexShrink: 0,
                        }}
                      >
                        {goal.goal_key}
                      </span>
                      <span
                        onClick={e => { e.stopPropagation(); onGoalClick(goal.id); }}
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#0F172A',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {goal.title}
                      </span>
                    </div>
                    <div onClick={e => e.stopPropagation()}>{statusBadge(goal.status)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
                      {Math.round(goal.progress_pct || 0)}%
                    </div>
                    <div>{progressBar(goal.progress_pct || 0)}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{confPct}%</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{goalKRs.length}</div>
                    <div>
                      {goal.ai_health_score != null ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: '#7C3AED',
                            background: '#F5F3FF',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
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
                    const krProgress = kr.target === kr.baseline
                      ? 0
                      : kr.target < kr.baseline
                        ? Math.min(100, Math.max(0, Math.round(((kr.baseline - kr.current_value) / (kr.baseline - kr.target)) * 100)))
                        : Math.min(100, Math.max(0, Math.round(((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100)));

                    return (
                      <div
                        key={kr.id}
                        className="kr-row-hover"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: GRID_COLS,
                          height: 40,
                          alignItems: 'center',
                          padding: '0 16px 0 58px',
                          borderBottom: '1px solid #F8FAFC',
                          fontSize: 12,
                          position: 'relative',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#94A3B8',
                              background: '#F8FAFC',
                              padding: '1px 5px',
                              borderRadius: 3,
                              flexShrink: 0,
                            }}
                          >
                            {kr.kr_key}
                          </span>
                          <span
                            style={{
                              color: '#334155',
                              fontWeight: 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {kr.title}
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); onCheckinClick(kr.id); }}
                            className="kr-checkin-btn"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: '2px 8px',
                              fontSize: 10.5,
                              fontWeight: 500,
                              color: '#2563EB',
                              background: 'transparent',
                              border: '1px solid #2563EB',
                              borderRadius: 99,
                              cursor: 'pointer',
                              opacity: 0,
                              transition: 'opacity 150ms',
                              flexShrink: 0,
                            }}
                          >
                            <ClipboardCheck size={10} />
                            Check-in
                          </button>
                        </div>
                        <div>{statusBadge(kr.status)}</div>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{krProgress}%</div>
                        <div>{progressBar(krProgress, 5)}</div>
                        <div style={{ color: '#64748B' }}>{confidenceLabel(kr.confidence_level)}</div>
                        <div style={{ color: '#64748B', fontSize: 11 }}>
                          {kr.current_value}{kr.metric_unit ? ` ${kr.metric_unit}` : ''}/{kr.target}
                        </div>
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

      {/* Footer */}
      <div
        style={{
          padding: '10px 16px',
          fontSize: 11,
          color: '#94A3B8',
          borderTop: '1px solid #E2E8F0',
          background: '#FAFBFD',
        }}
      >
        Showing {totalFilteredGoals} goals, {totalFilteredKRs} key results across {filteredThemes.length} themes
      </div>

      {/* Hover CSS for check-in button */}
      <style>{`
        .kr-row-hover:hover .kr-checkin-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
