/**
 * GoalsTreeView — 3-level expandable tree: Theme → Goal → Key Result
 * Fixes: 1 (contrast/depth), 4 (circular avatars), 5 (single progress %),
 *        6 (split CONFIDENCE/KRs), 9 (confidence dots), 11 (connector lines),
 *        15 (footer)
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

function progressBar(pct: number, height = 6) {
  const color = pct >= 60 ? '#16A34A' : pct >= 40 ? '#D97706' : '#EF4444';
  return (
    <div style={{ width: 80, height, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 300ms ease' }} />
    </div>
  );
}

// Fix 9: Confidence dot indicator
function ConfidenceDots({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: i <= level
              ? (level >= 4 ? '#16A34A' : level >= 3 ? '#D97706' : '#EF4444')
              : '#E2E8F0',
          }}
        />
      ))}
    </div>
  );
}

function getConfidenceLevel(val: number | string | undefined): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'string') {
    const map: Record<string, number> = { high: 4, medium: 3, low: 1 };
    return map[val] ?? 0;
  }
  // Convert 0-1 or 0-100 to 1-5
  const pct = val <= 1 ? val * 100 : val;
  if (pct >= 80) return 5;
  if (pct >= 60) return 4;
  if (pct >= 40) return 3;
  if (pct >= 20) return 2;
  return 1;
}

// Theme status from child goals
function computeThemeStatus(goals: Goal[]): string {
  if (goals.some(g => g.status === 'off_track')) return 'off_track';
  if (goals.some(g => g.status === 'at_risk')) return 'at_risk';
  if (goals.every(g => g.status === 'completed')) return 'completed';
  if (goals.every(g => g.status === 'draft')) return 'draft';
  return 'active';
}

// Fix 4: Circular avatar with per-owner colors
const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  'Nada Alfassam':      { bg: '#DBEAFE', text: '#1E40AF' },
  'Sitah Alqahtani':    { bg: '#E0E7FF', text: '#3730A3' },
  'Sulaiman Alessa':    { bg: '#D1FAE5', text: '#065F46' },
  'ibrahim alqusiyer':  { bg: '#FEF3C7', text: '#92400E' },
  'Khaled Alghithy':    { bg: '#CFFAFE', text: '#155E75' },
  'Izza Ali':           { bg: '#EDE9FE', text: '#5B21B6' },
};

function getAvatarColors(name: string) {
  if (AVATAR_COLORS[name]) return AVATAR_COLORS[name];
  // Hash fallback
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const palettes = [
    { bg: '#DBEAFE', text: '#1E40AF' }, { bg: '#D1FAE5', text: '#065F46' },
    { bg: '#E0E7FF', text: '#3730A3' }, { bg: '#FEF3C7', text: '#92400E' },
    { bg: '#CFFAFE', text: '#155E75' }, { bg: '#EDE9FE', text: '#5B21B6' },
  ];
  return palettes[Math.abs(hash) % palettes.length];
}

function OwnerAvatar({ name, size = 28, showName = false }: { name?: string; size?: number; showName?: boolean }) {
  if (!name) return <span style={{ fontSize: 11, color: '#CBD5E1' }}>—</span>;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = getAvatarColors(name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={name}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.39, fontWeight: 600, color: colors.text, flexShrink: 0,
      }}>
        {initials}
      </div>
      {showName && <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>}
    </div>
  );
}

// Columns: GOAL | STATUS | PROGRESS | CONFIDENCE | KRs | OWNER | AI
const GRID_COLS = 'minmax(340px, 1fr) 96px 150px 90px 50px 100px 60px';

/* Skeleton for loading */
export function GoalsTreeSkeleton() {
  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ height: 36, background: '#FFFFFF', borderBottom: '2px solid #E2E8F0' }} />
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
function GoalsNoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
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

  return (
    <div className="goals-tree-container" style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#FFFFFF' }}>
      {/* Header — Fix 6: separate CONFIDENCE + KRs columns */}
      <div style={{
        display: 'grid', gridTemplateColumns: GRID_COLS,
        height: 36, alignItems: 'center',
        background: '#FFFFFF', borderBottom: '2px solid #E2E8F0',
        padding: '0 16px',
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: '#64748B',
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
        const themeStatus = computeThemeStatus(themeGoals);
        const themeKRCount = themeGoals.reduce((s, g) => s + (krsByGoal.get(g.id)?.length || 0), 0);
        const avgConf = themeGoals.length > 0
          ? Math.round(themeGoals.reduce((s, g) => s + getConfidenceLevel(g.confidence_level), 0) / themeGoals.length) : 0;
        const progressColor = avgProgress >= 60 ? '#16A34A' : avgProgress >= 40 ? '#D97706' : '#EF4444';

        return (
          <div key={theme.id}>
            {/* Theme Row — Fix 1: left border + #F1F5F9 bg */}
            <div
              role="button" tabIndex={0}
              onClick={() => onToggleTheme(theme.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleTheme(theme.id); } }}
              style={{
                display: 'grid', gridTemplateColumns: GRID_COLS,
                height: 44, alignItems: 'center', padding: '0 16px',
                background: '#F1F5F9', borderBottom: '1px solid #E2E8F0',
                borderLeft: `3px solid ${theme.color}`,
                cursor: 'pointer', userSelect: 'none', transition: 'background 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E2E8F0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F1F5F9')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={14} color="#64748B" style={{ transform: themeExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{theme.title}</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>({themeGoals.length} goal{themeGoals.length !== 1 ? 's' : ''})</span>
              </div>
              <div>{statusBadge(themeStatus)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {progressBar(avgProgress)}
                <span style={{ fontSize: 13, fontWeight: 600, color: progressColor, minWidth: 32, textAlign: 'right' }}>{avgProgress}%</span>
              </div>
              <div><ConfidenceDots level={avgConf} /></div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{themeKRCount}</div>
              <div />
              <div />
            </div>

            {/* Goal Rows */}
            {themeExpanded && themeGoals.map((goal, gi) => {
              const goalExpanded = expandedGoals.has(goal.id) || !!query;
              const goalKRs = krsByGoal.get(goal.id) || [];
              const confLevel = getConfidenceLevel(goal.confidence_level);
              const goalPct = Math.round(goal.progress_pct || 0);
              const goalProgressColor = goalPct >= 60 ? '#16A34A' : goalPct >= 40 ? '#D97706' : '#EF4444';
              const isLastGoal = gi === themeGoals.length - 1;

              return (
                <div key={goal.id}>
                  <div
                    role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoalClick(goal.id); } }}
                    className="goal-tree-row"
                    style={{
                      display: 'grid', gridTemplateColumns: GRID_COLS,
                      height: 44, alignItems: 'center', padding: '0 16px 0 36px',
                      background: '#FFFFFF',
                      borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                      transition: 'background 150ms', position: 'relative',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                  >
                    {/* Fix 11: Connector lines */}
                    <div style={{ position: 'absolute', left: 28, top: 0, bottom: isLastGoal && !goalExpanded ? '50%' : 0, width: 1, background: '#E2E8F0' }} />
                    <div style={{ position: 'absolute', left: 28, top: '50%', width: 12, height: 1, background: '#E2E8F0' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <ChevronRight
                        size={13} color="#94A3B8"
                        onClick={e => { e.stopPropagation(); onToggleGoal(goal.id); }}
                        style={{ transform: goalExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, flexShrink: 0, fontFamily: 'ui-monospace, monospace' }}>
                        {goal.goal_key}
                      </span>
                      <span onClick={e => { e.stopPropagation(); onGoalClick(goal.id); }} style={{ fontSize: 14, fontWeight: 500, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {goal.title}
                      </span>
                    </div>
                    <div onClick={e => e.stopPropagation()}>{statusBadge(goal.status)}</div>
                    {/* Fix 5: Single progress value */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {progressBar(goalPct)}
                      <span style={{ fontSize: 13, fontWeight: 600, color: goalProgressColor, minWidth: 32, textAlign: 'right' }}>{goalPct}%</span>
                    </div>
                    {/* Fix 6+9: Confidence as dots */}
                    <div><ConfidenceDots level={confLevel} /></div>
                    {/* Fix 6: KRs as count */}
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{goalKRs.length}</div>
                    {/* Fix 4: Circular avatar, no name in tree */}
                    <div><OwnerAvatar name={goal.owner_name} size={28} /></div>
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
                  {goalExpanded && goalKRs.map((kr, ki) => {
                    const krProgress = kr.target === kr.baseline ? 0
                      : kr.target < kr.baseline
                        ? Math.min(100, Math.max(0, Math.round(((kr.baseline - kr.current_value) / (kr.baseline - kr.target)) * 100)))
                        : Math.min(100, Math.max(0, Math.round(((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100)));
                    const krProgressColor = krProgress >= 60 ? '#16A34A' : krProgress >= 40 ? '#D97706' : '#EF4444';
                    const isLastKR = ki === goalKRs.length - 1;

                    return (
                      <div
                        key={kr.id}
                        className="kr-row-hover"
                        role="button" tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCheckinClick(kr.id); } }}
                        style={{
                          display: 'grid', gridTemplateColumns: GRID_COLS,
                          height: 40, alignItems: 'center', padding: '0 16px 0 58px',
                          background: '#FAFBFC',
                          borderBottom: '1px solid #F8FAFC', fontSize: 13, position: 'relative',
                          transition: 'background 150ms',
                          color: '#334155',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#FAFBFC')}
                      >
                        {/* Fix 11: KR connector lines */}
                        <div style={{ position: 'absolute', left: 52, top: 0, bottom: isLastKR ? '50%' : 0, width: 1, background: '#E2E8F0' }} />
                        <div style={{ position: 'absolute', left: 52, top: '50%', width: 12, height: 1, background: '#E2E8F0' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', background: '#F1F5F9', padding: '1px 5px', borderRadius: 3, flexShrink: 0, fontFamily: 'ui-monospace, monospace' }}>
                            {kr.kr_key}
                          </span>
                          <span style={{ fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {kr.title}
                          </span>
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
                          {progressBar(krProgress, 5)}
                          <span style={{ fontSize: 13, fontWeight: 600, color: krProgressColor, minWidth: 32, textAlign: 'right' }}>{krProgress}%</span>
                        </div>
                        <div><ConfidenceDots level={getConfidenceLevel(kr.confidence_level)} /></div>
                        <div style={{ color: '#64748B', fontSize: 11 }}>
                          {kr.current_value}/{kr.target}
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

      {/* Fix 15: Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 36, background: '#F8FAFC', borderTop: '1px solid #E2E8F0',
      }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>
          Showing {totalFilteredGoals} goals, {totalFilteredKRs} key results across {filteredThemes.length} themes
        </span>
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
