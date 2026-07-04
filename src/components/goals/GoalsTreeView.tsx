/**
 * GoalsTreeView — 3-level expandable tree: Theme → Goal → Key Result
 * ECLIPSE D8: Dark mode parity
 */
import { ChevronRight, Sparkles, ClipboardCheck, Target, X } from '@/lib/atlaskit-icons';
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
  isDark?: boolean;
}

const DK = {
  t1: 'var(--cp-t1)',
  t2: 'var(--cp-t2)',
  t3: 'var(--cp-t3)',
  t4: 'var(--cp-t4)',
  border: 'var(--ds-border, var(--cp-ink-1))',
  borderSubtle: 'var(--ds-border, var(--cp-ink-1))',
  hover: 'var(--ds-surface-overlay)',
};

// ── Status badge ──
function statusBadge(status: string, isDark = false) {
  const map: Record<string, { dot: string; bg: string; text: string; bgDark: string; textDark: string; label: string }> = {
    active:      { dot: 'var(--ds-text-success, var(--cp-success))', bg: 'var(--ds-background-success-bold, rgba(22,163,74,0.08))',  text: 'var(--ds-background-success-bold, var(--ds-background-success-bold))', bgDark: 'var(--ds-text, var(--ds-text))', textDark: 'var(--ds-background-success)', label: 'Active' },
    on_track:    { dot: 'var(--ds-text-success, var(--cp-success))', bg: 'var(--ds-background-success-bold, rgba(22,163,74,0.08))',  text: 'var(--ds-background-success-bold, var(--ds-background-success-bold))', bgDark: 'var(--ds-text, var(--ds-text))', textDark: 'var(--ds-background-success)', label: 'On Track' },
    completed:   { dot: 'var(--ds-background-discovery-bold)', bg: 'rgba(79,70,229,0.08)',  text: 'var(--ds-background-discovery-bold, var(--ds-background-discovery-bold))', bgDark: 'var(--ds-text, var(--ds-text))', textDark: 'var(--ds-background-information-bold, var(--ds-link))', label: 'Completed' },
    achieved:    { dot: 'var(--ds-background-discovery-bold)', bg: 'rgba(79,70,229,0.08)',  text: 'var(--ds-background-discovery-bold, var(--ds-background-discovery-bold))', bgDark: 'var(--ds-text, var(--ds-text))', textDark: 'var(--ds-background-information-bold, var(--ds-link))', label: 'Achieved' },
    at_risk:     { dot: 'var(--ds-text-warning, var(--cp-warning))', bg: 'var(--ds-background-warning, rgba(217,119,6,0.08))',  text: 'var(--ds-background-warning-bold, var(--ds-background-warning-bold))', bgDark: '#2A2418', textDark: 'var(--ds-background-warning-bold, var(--ds-background-warning-bold))', label: 'At Risk' },
    off_track:   { dot: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger, rgba(239,68,68,0.08))',  text: 'var(--ds-text-danger, var(--cp-danger))', bgDark: 'var(--ds-text, var(--ds-text))', textDark: 'var(--ds-border-danger)', label: 'Off Track' },
    draft:       { dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',               text: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', bgDark: 'var(--ds-surface-raised, var(--cp-ink-1))', textDark: 'var(--ds-text-subtlest)', label: 'Draft' },
    not_started: { dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',               text: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', bgDark: 'var(--ds-surface-raised, var(--cp-ink-1))', textDark: 'var(--ds-text-subtlest)', label: 'Not Started' },
    cancelled:   { dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',               text: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', bgDark: 'var(--ds-surface-raised, var(--cp-ink-1))', textDark: 'var(--ds-text-subtlest)', label: 'Cancelled' },
    unknown:     { dot: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',               text: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', bgDark: 'var(--ds-surface-raised, var(--cp-ink-1))', textDark: 'var(--ds-text-subtlest)', label: 'Unknown' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0px 8px', fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: isDark ? s.textDark : s.text, background: isDark ? s.bgDark : s.bg, borderRadius: 99, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function progressBar(pct: number | null, height = 6, isDark = false) {
  if (pct === null) {
    return (
      <div style={{ width: 80, height, background: isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--divider)', borderRadius: 4, overflow: 'hidden' }} />
    );
  }
  const color = pct >= 60 ? 'var(--ds-text-success, var(--cp-success))' : pct >= 40 ? 'var(--ds-text-warning, var(--cp-warning))' : 'var(--ds-text-danger)';
  return (
    <div style={{ width: 80, height, background: isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 300ms ease' }} />
    </div>
  );
}

function ConfidenceDots({ level, isDark = false }: { level: number; isDark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: i <= level
              ? (level >= 4 ? 'var(--ds-text-success, var(--cp-success))' : level >= 3 ? 'var(--ds-text-warning, var(--cp-warning))' : 'var(--ds-text-danger)')
              : (isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--divider)'),
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
  const pct = val <= 1 ? val * 100 : val;
  if (pct >= 80) return 5;
  if (pct >= 60) return 4;
  if (pct >= 40) return 3;
  if (pct >= 20) return 2;
  return 1;
}

function computeThemeStatus(goals: Goal[]): string {
  if (goals.length === 0) return 'draft';
  if (goals.some(g => g.status === 'off_track')) return 'off_track';
  // Only goals with a real, measured progress value can trigger a numeric
  // off_track/at_risk verdict — a null/unmeasured progress must never be
  // treated as 0% (that would fabricate a health verdict from missing data).
  const measuredGoals = goals.filter(g => g.progress_pct != null && !['draft', 'completed', 'cancelled'].includes(g.status));
  if (measuredGoals.some(g => (g.progress_pct as number) < 40)) return 'off_track';
  if (goals.some(g => g.status === 'at_risk')) return 'at_risk';
  if (measuredGoals.length > 0) {
    const avgProgress = measuredGoals.reduce((s, g) => s + (g.progress_pct as number), 0) / measuredGoals.length;
    if (avgProgress < 60) return 'at_risk';
  }
  if (goals.every(g => g.status === 'completed')) return 'completed';
  if (goals.every(g => g.status === 'draft')) return 'draft';
  // Active/in-flight goals with no measured progress at all — don't default to on-track.
  if (measuredGoals.length === 0 && goals.some(g => !['draft', 'completed', 'cancelled'].includes(g.status))) return 'unknown';
  return 'active';
}

const AVATAR_COLORS: Record<string, { bg: string; text: string; bgDark: string; textDark: string }> = {
  'Nada Alfassam':      { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)', bgDark: 'var(--ds-background-information-bold, rgba(59,130,246,0.15))',  textDark: 'var(--ds-background-information-bold, var(--ds-link))' },
  'Sitah Alqahtani':    { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)', bgDark: 'rgba(99,102,241,0.15)',  textDark: 'var(--ds-background-discovery)' },
  'Sulaiman Alessa':    { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)', bgDark: 'rgba(52,211,153,0.15)',  textDark: 'var(--ds-background-success)' },
  'ibrahim alqusiyer':  { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', bgDark: 'var(--ds-background-warning-bold, rgba(251,191,36,0.15))',  textDark: 'var(--ds-background-warning, var(--ds-background-warning))' },
  'Khaled Alghithy':    { bg: '#CFFAFE', text: '#155E75', bgDark: 'rgba(34,211,238,0.15)',  textDark: 'var(--ds-background-information, var(--ds-background-information))' },
  'Izza Ali':           { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)', bgDark: 'var(--ds-background-discovery-bold, rgba(139,92,246,0.15))',  textDark: 'var(--ds-background-discovery)' },
};

function getAvatarColors(name: string, isDark = false) {
  const palettes = [
    { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)', bgDark: 'var(--ds-background-information-bold, rgba(59,130,246,0.15))',  textDark: 'var(--ds-background-information-bold, var(--ds-link))' },
    { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)', bgDark: 'rgba(52,211,153,0.15)',  textDark: 'var(--ds-background-success)' },
    { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)', bgDark: 'rgba(99,102,241,0.15)',  textDark: 'var(--ds-background-discovery)' },
    { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', bgDark: 'var(--ds-background-warning-bold, rgba(251,191,36,0.15))',  textDark: 'var(--ds-background-warning, var(--ds-background-warning))' },
    { bg: '#CFFAFE', text: '#155E75', bgDark: 'rgba(34,211,238,0.15)',  textDark: 'var(--ds-background-information, var(--ds-background-information))' },
    { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)', bgDark: 'var(--ds-background-discovery-bold, rgba(139,92,246,0.15))',  textDark: 'var(--ds-background-discovery)' },
  ];
  let entry;
  if (AVATAR_COLORS[name]) {
    entry = AVATAR_COLORS[name];
  } else {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    entry = palettes[Math.abs(hash) % palettes.length];
  }
  return isDark ? { bg: entry.bgDark, text: entry.textDark } : { bg: entry.bg, text: entry.text };
}

function OwnerAvatar({ name, size = 28, isDark = false }: { name?: string; size?: number; isDark?: boolean }) {
  if (!name) return <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? DK.t4 : 'var(--ds-text-disabled)' }}>—</span>;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = getAvatarColors(name, isDark);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={name}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.39, fontWeight: 600, color: colors.text, flexShrink: 0,
      }}>
        {initials}
      </div>
    </div>
  );
}

const GRID_COLS = 'minmax(340px, 1fr) 96px 150px 90px 50px 100px 60px';

export function GoalsTreeSkeleton({ isDark = false }: { isDark?: boolean }) {
  return (
    <div style={{ border: `1px solid ${isDark ? DK.border : 'var(--divider)'}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ height: 50, background: isDark ? 'transparent' : 'var(--bg-app)', borderBottom: `2px solid ${isDark ? DK.border : 'var(--divider)'}` }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="ph-shimmer" style={{ height: 44, borderBottom: `1px solid ${isDark ? DK.borderSubtle : 'var(--cp-bd-zone)'}`, background: isDark ? 'var(--ds-text)' : 'var(--bg-1)' }} />
      ))}
      <style>{`
        @keyframes phShimmer { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        .ph-shimmer { animation: phShimmer 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export function GoalsEmptyState({ onCreateGoal, isDark = false }: { onCreateGoal: () => void; isDark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', border: `1px solid ${isDark ? DK.border : 'var(--divider)'}`, borderRadius: 12, background: isDark ? 'transparent' : 'var(--bg-app)' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: isDark ? 'var(--ds-surface-overlay)' : 'var(--cp-bd-zone)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Target size={24} color="var(--fg-4)" />
      </div>
      <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: isDark ? DK.t1 : 'var(--fg-2)', marginBottom: 4 }}>No goals yet</div>
      <div style={{ fontSize: 12.5, color: isDark ? DK.t3 : 'var(--fg-4)', marginBottom: 16, textAlign: 'center', maxWidth: 320 }}>Create your first goal to start tracking progress.</div>
      <button onClick={onCreateGoal} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 18px', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', background: 'var(--cp-blue)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
        + Create Goal
      </button>
    </div>
  );
}

function GoalsNoSearchResults({ query, onClear, isDark = false }: { query: string; onClear: () => void; isDark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', border: `1px solid ${isDark ? DK.border : 'var(--divider)'}`, borderRadius: 12, background: isDark ? 'transparent' : 'var(--bg-app)' }}>
      <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: isDark ? DK.t1 : 'var(--fg-2)', marginBottom: 4 }}>No goals matching "{query}"</div>
      <div style={{ fontSize: 'var(--ds-font-size-200)', color: isDark ? DK.t3 : 'var(--fg-4)', marginBottom: 12 }}>Try a different search term.</div>
      <button onClick={onClear} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 14px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: isDark ? DK.t2 : 'var(--fg-3)', background: isDark ? 'var(--ds-surface-overlay)' : 'var(--cp-bd-zone)', border: `1px solid ${isDark ? DK.border : 'var(--divider)'}`, borderRadius: 6, cursor: 'pointer' }}>
        <X size={12} /> Clear search
      </button>
    </div>
  );
}

export function GoalsTreeView({
  goals, keyResults, themes, searchQuery,
  expandedThemes, expandedGoals,
  onToggleTheme, onToggleGoal, onGoalClick, onCheckinClick, onClearSearch,
  isDark = false,
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
    return <GoalsNoSearchResults query={searchQuery} onClear={() => onClearSearch?.()} isDark={isDark} />;
  }

  const totalFilteredGoals = filteredThemes.reduce((s, t) => s + filterGoals(goalsByTheme.get(t.id) || []).length, 0);
  const totalFilteredKRs = filteredThemes.reduce((s, t) => {
    const fg = filterGoals(goalsByTheme.get(t.id) || []);
    return s + fg.reduce((ks, g) => ks + (krsByGoal.get(g.id)?.length || 0), 0);
  }, 0);

  // Colors
  const tableBorder = isDark ? DK.border : 'var(--divider)';
  const rowBorder = isDark ? DK.borderSubtle : 'var(--cp-bd-zone)';
  const headerBg = isDark ? 'transparent' : 'var(--bg-app)';
  const headerText = isDark ? DK.t3 : 'var(--fg-3)';
  const containerBg = isDark ? 'transparent' : 'var(--bg-app)';
  const themeRowBg = isDark ? 'var(--ds-surface-overlay)' : 'var(--cp-bd-zone)';
  const themeRowHover = 'var(--cp-bg-sunken, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))';
  const goalRowBg = isDark ? 'transparent' : 'var(--bg-app)';
  const goalRowHover = isDark ? 'var(--ds-surface-overlay)' : 'var(--bg-1)';
  const krRowBg = isDark ? 'var(--ds-text)' : 'var(--bg-1)';
  const krRowHover = isDark ? 'var(--ds-surface-overlay)' : 'var(--cp-bd-zone)';
  const connectorColor = isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--divider)';
  const footerBg = isDark ? 'var(--ds-text)' : 'var(--bg-1)';

  return (
    <div className="goals-tree-container" style={{ border: `1px solid ${tableBorder}`, borderRadius: 12, overflow: 'hidden', background: containerBg }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: GRID_COLS,
        height: 50, alignItems: 'center',
        background: headerBg, borderBottom: `2px solid ${tableBorder}`,
        padding: '0 16px',
        fontSize: 'var(--ds-font-size-100)', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: headerText,
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
        const themeGoalsWithProgress = themeGoals.filter(g => g.progress_pct != null);
        const avgProgress = themeGoalsWithProgress.length > 0
          ? Math.round(themeGoalsWithProgress.reduce((s, g) => s + (g.progress_pct as number), 0) / themeGoalsWithProgress.length) : null;
        const themeStatus = computeThemeStatus(themeGoals);
        const themeKRCount = themeGoals.reduce((s, g) => s + (krsByGoal.get(g.id)?.length || 0), 0);
        const avgConf = themeGoals.length > 0
          ? Math.round(themeGoals.reduce((s, g) => s + getConfidenceLevel(g.confidence_level), 0) / themeGoals.length) : 0;
        const progressColor = avgProgress === null ? 'var(--ds-text-subtlest)' : avgProgress >= 60 ? 'var(--ds-text-success, var(--cp-success))' : avgProgress >= 40 ? 'var(--ds-text-warning, var(--cp-warning))' : 'var(--ds-text-danger)';

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
                background: themeRowBg, borderBottom: `1px solid ${tableBorder}`,
                borderLeft: `3px solid ${theme.color}`,
                cursor: 'pointer', userSelect: 'none', transition: 'background 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = themeRowHover)}
              onMouseLeave={e => (e.currentTarget.style.background = themeRowBg)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={14} color={'var(--cp-text-tertiary, var(--cp-ink-3, var(--cp-text-secondary, var(--ds-text-subtlest))))'} style={{ transform: themeExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: isDark ? DK.t1 : 'var(--fg-1)' }}>{theme.title}</span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? DK.t3 : 'var(--fg-3)' }}>({themeGoals.length} goal{themeGoals.length !== 1 ? 's' : ''})</span>
              </div>
              <div>{statusBadge(themeStatus, isDark)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {progressBar(avgProgress, 6, isDark)}
                <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: progressColor, minWidth: 32, textAlign: 'right' }}>{avgProgress !== null ? `${avgProgress}%` : '—'}</span>
              </div>
              <div><ConfidenceDots level={avgConf} isDark={isDark} /></div>
              <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: isDark ? DK.t2 : 'var(--fg-2)' }}>{themeKRCount}</div>
              <div />
              <div />
            </div>

            {/* Goal Rows */}
            {themeExpanded && themeGoals.map((goal, gi) => {
              const goalExpanded = expandedGoals.has(goal.id) || !!query;
              const goalKRs = krsByGoal.get(goal.id) || [];
              const confLevel = getConfidenceLevel(goal.confidence_level);
              const goalPct = goal.progress_pct != null ? Math.round(goal.progress_pct) : null;
              const goalProgressColor = goalPct === null ? 'var(--ds-text-subtlest)' : goalPct >= 60 ? 'var(--ds-text-success, var(--cp-success))' : goalPct >= 40 ? 'var(--ds-text-warning, var(--cp-warning))' : 'var(--ds-text-danger)';
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
                      background: goalRowBg,
                      borderBottom: `1px solid ${rowBorder}`, cursor: 'pointer',
                      transition: 'background 150ms', position: 'relative',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = goalRowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = goalRowBg)}
                  >
                    {/* Connector lines */}
                    <div style={{ position: 'absolute', left: 24, top: 0, bottom: isLastGoal && !goalExpanded ? '50%' : 0, width: 1, background: connectorColor }} />
                    <div style={{ position: 'absolute', left: 24, top: '48%', width: 12, height: 1, background: connectorColor }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <ChevronRight
                        size={13} color={'var(--cp-text-muted, var(--cp-ink-4, var(--cp-border-neutral-light, var(--ds-text-disabled))))'}
                        onClick={e => { e.stopPropagation(); onToggleGoal(goal.id); }}
                        style={{ transform: goalExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: isDark ? DK.t2 : 'var(--fg-2)', background: isDark ? 'var(--ds-surface-overlay)' : 'var(--cp-bd-zone)', padding: '0px 8px', borderRadius: 4, flexShrink: 0, fontFamily: 'ui-monospace, monospace' }}>
                        {goal.goal_key}
                      </span>
                      <span onClick={e => { e.stopPropagation(); onGoalClick(goal.id); }} style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: isDark ? DK.t1 : 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {goal.title}
                      </span>
                    </div>
                    <div onClick={e => e.stopPropagation()}>{statusBadge(goal.status, isDark)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {progressBar(goalPct, 6, isDark)}
                      <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: goalProgressColor, minWidth: 32, textAlign: 'right' }}>{goalPct !== null ? `${goalPct}%` : '—'}</span>
                    </div>
                    <div><ConfidenceDots level={confLevel} isDark={isDark} /></div>
                    <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: isDark ? DK.t2 : 'var(--fg-2)' }}>{goalKRs.length}</div>
                    <div><OwnerAvatar name={goal.owner_name} size={28} isDark={isDark} /></div>
                    <div>
                      {goal.ai_health_score != null ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600, color: isDark ? 'var(--ds-background-information-bold)' : 'var(--cp-blue)', background: isDark ? 'var(--ds-background-information-bold, rgba(59,130,246,0.12))' : 'var(--cp-blue-wash)', padding: '0px 6px', borderRadius: 4 }}>
                          <Sparkles size={10} />
                          {goal.ai_health_score}
                        </span>
                      ) : (
                        <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? DK.t4 : 'var(--ds-text-disabled)' }}>—</span>
                      )}
                    </div>
                  </div>

                  {/* KR Rows */}
                  {goalExpanded && goalKRs.map((kr, ki) => {
                    const krProgress = kr.target === kr.baseline ? 0
                      : kr.target < kr.baseline
                        ? Math.min(100, Math.max(0, Math.round(((kr.baseline - kr.current_value) / (kr.baseline - kr.target)) * 100)))
                        : Math.min(100, Math.max(0, Math.round(((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100)));
                    const krProgressColor = krProgress >= 60 ? 'var(--ds-text-success, var(--cp-success))' : krProgress >= 40 ? 'var(--ds-text-warning, var(--cp-warning))' : 'var(--ds-text-danger)';
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
                          background: krRowBg,
                          borderBottom: `1px solid ${isDark ? DK.borderSubtle : 'var(--bg-1)'}`, fontSize: 'var(--ds-font-size-300)', position: 'relative',
                          transition: 'background 150ms',
                          color: isDark ? DK.t2 : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = krRowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = krRowBg)}
                      >
                        {/* KR connector lines */}
                        <div style={{ position: 'absolute', left: 48, top: 0, bottom: isLastKR ? '50%' : 0, width: 1, background: connectorColor }} />
                        <div style={{ position: 'absolute', left: 48, top: '48%', width: 12, height: 1, background: connectorColor }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 600, color: isDark ? DK.t3 : 'var(--fg-4)', background: isDark ? 'var(--ds-surface-overlay)' : 'var(--cp-bd-zone)', padding: '0px 5px', borderRadius: 4, flexShrink: 0, fontFamily: 'ui-monospace, monospace' }}>
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
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '0px 8px', fontSize: 10.5, fontWeight: 500,
                              color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', background: 'transparent',
                              border: '1px solid var(--ds-link)', borderRadius: 99, cursor: 'pointer',
                              opacity: 0, transition: 'opacity 150ms', flexShrink: 0,
                            }}
                          >
                            <ClipboardCheck size={10} />
                            Check-in
                          </button>
                        </div>
                        <div>{statusBadge(kr.status, isDark)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {progressBar(krProgress, 5, isDark)}
                          <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: krProgressColor, minWidth: 32, textAlign: 'right' }}>{krProgress}%</span>
                        </div>
                        <div><ConfidenceDots level={getConfidenceLevel(kr.confidence_level)} isDark={isDark} /></div>
                        <div style={{ color: isDark ? DK.t3 : 'var(--fg-3)', fontSize: 'var(--ds-font-size-100)' }}>
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

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 50, background: footerBg, borderTop: `1px solid ${tableBorder}`,
      }}>
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: isDark ? DK.t3 : 'var(--fg-3)' }}>
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
