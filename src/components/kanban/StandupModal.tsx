/**
 * StandupModal — Jira-parity "Start Standup" premium feature.
 *
 * Cycles through each assignee who has at least one in-progress card,
 * showing their cards across all active columns. Team lead clicks
 * "Next person" to advance.
 *
 * ADS-only: no lucide, no Tailwind classes, no --cp-* fallbacks.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens } from './kanban-tokens';
import { KanbanAvatar } from './KanbanAvatar';

/* ── Inline icons ── */
const IcClose = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" aria-hidden>
    <path d="M2 2l12 12M14 2L2 14" />
  </svg>
);
const IcArrowRight = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
const IcArrowLeft = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M13 8H3M7 4L3 8l4 4" />
  </svg>
);
const IcCheck = ({ size = 14, color = '#36B37E' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M2 8l5 5 7-7" />
  </svg>
);
const IcUsers = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3" />
    <path d="M19 17c0-2-1-3-3-3" />
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
  </svg>
);

/* ── Priority color dot ── */
const PRIORITY_COLORS: Record<string, string> = {
  highest: '#E5493A', critical: '#E5493A',
  high: '#E97F33', medium: '#FFAB00',
  low: '#2D8738', lowest: '#57A55A',
};

/* ── Status category → label ── */
function statusLabel(cat: string): string {
  if (cat === 'done') return 'Done';
  if (cat === 'inprogress' || cat === 'in_progress') return 'In Progress';
  return 'To Do';
}

function statusColor(cat: string): string {
  if (cat === 'done') return '#94C748';
  if (cat === 'inprogress' || cat === 'in_progress') return '#669DF1';
  return 'rgba(5,21,36,0.06)';
}
function statusTextColor(cat: string): string {
  return cat === 'done' ? '#292A2E' : cat === 'inprogress' || cat === 'in_progress' ? '#FFFFFF' : '#42526E';
}

/* ── Card row inside the modal ── */
function StandupCard({ issue, tk }: { issue: BoardIssue; tk: KanbanThemeTokens }) {
  const priColor = PRIORITY_COLORS[(issue.priority ?? '').toLowerCase()];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px',
      background: tk.cardBg,
      borderRadius: 4,
      boxShadow: tk.cardShadowRest,
      borderLeft: priColor ? `3px solid ${priColor}` : 'none',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: tk.textPrimary, lineHeight: '20px', fontFamily: 'var(--cp-font-body)', marginBottom: 4 }}>
          {issue.summary}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: tk.textMuted, fontFamily: 'var(--cp-font-mono)' }}>
            {issue.issueKey}
          </span>
          {issue.issueType && (
            <span style={{ fontSize: 11, color: tk.textMuted, fontFamily: 'var(--cp-font-body)' }}>
              {issue.issueType}
            </span>
          )}
        </div>
      </div>
      {/* Status pill */}
      <span style={{
        flexShrink: 0,
        fontSize: 11, fontWeight: 700,
        padding: '2px 8px', borderRadius: 3,
        background: statusColor(issue.statusCategory),
        color: statusTextColor(issue.statusCategory),
        fontFamily: 'var(--cp-font-body)',
        whiteSpace: 'nowrap',
      }}>
        {issue.status}
      </span>
    </div>
  );
}

/* ── Main props ── */
interface StandupModalProps {
  issues: BoardIssue[];
  avatarsByName: Map<string, string>;
  tk: KanbanThemeTokens;
  onClose: () => void;
}

/* ── Assignee bucket ── */
interface AssigneeBucket {
  name: string;
  avatarUrl: string | null;
  inProgress: BoardIssue[];
  done: BoardIssue[];
  todo: BoardIssue[];
}

export function StandupModal({ issues, avatarsByName, tk, onClose }: StandupModalProps) {
  const [personIdx, setPersonIdx] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());

  /* Build per-assignee buckets — only people with ≥1 issue */
  const buckets: AssigneeBucket[] = useMemo(() => {
    const map = new Map<string, AssigneeBucket>();
    for (const issue of issues) {
      const name = issue.assigneeName || 'Unassigned';
      if (!map.has(name)) {
        map.set(name, {
          name,
          avatarUrl: issue.assigneeName
            ? (avatarsByName.get(issue.assigneeName.toLowerCase()) ?? null)
            : null,
          inProgress: [],
          done: [],
          todo: [],
        });
      }
      const b = map.get(name)!;
      const cat = issue.statusCategory ?? '';
      if (cat === 'done') b.done.push(issue);
      else if (cat === 'inprogress' || cat === 'in_progress') b.inProgress.push(issue);
      else b.todo.push(issue);
    }
    // Sort: put people with in-progress work first
    return Array.from(map.values()).sort((a, b) =>
      b.inProgress.length - a.inProgress.length
    );
  }, [issues, avatarsByName]);

  const current = buckets[personIdx];
  const total = buckets.length;

  const advance = useCallback((delta: 1 | -1) => {
    if (current) setVisited(v => new Set([...v, current.name]));
    setPersonIdx(i => Math.max(0, Math.min(total - 1, i + delta)));
  }, [current, total]);

  /* Keyboard: left/right arrows, Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') advance(1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') advance(-1);
      else if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [advance, onClose]);

  const isDark = tk.pageBg.includes('0A0A0A') || tk.pageBg.includes('surface');

  if (buckets.length === 0) {
    return (
      <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={panelStyle(tk, isDark)}>
          <CloseButton onClick={onClose} tk={tk} />
          <div style={{ textAlign: 'center', padding: '48px 24px', color: tk.textMuted, fontSize: 14, fontFamily: 'var(--cp-font-body)' }}>
            No team members with issues to discuss.
          </div>
        </div>
      </div>
    );
  }

  const isLast = personIdx === total - 1;

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle(tk, isDark)}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 12px', borderBottom: `1px solid ${tk.border}` }}>
          <IcUsers size={18} color={tk.textSecondary} />
          <span style={{ fontSize: 16, fontWeight: 600, color: tk.textPrimary, fontFamily: 'var(--cp-font-heading)', flex: 1 }}>
            Daily Standup
          </span>
          <span style={{ fontSize: 12, color: tk.textMuted, fontFamily: 'var(--cp-font-body)' }}>
            {personIdx + 1} of {total}
          </span>
          <CloseButton onClick={onClose} tk={tk} />
        </div>

        {/* ── Progress bar ── */}
        <div style={{ height: 3, background: tk.borderSubtle }}>
          <div style={{
            height: '100%',
            width: `${((personIdx + 1) / total) * 100}%`,
            background: 'var(--ds-text-brand, #0052CC)',
            transition: 'width 300ms ease',
          }} />
        </div>

        {/* ── Person header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' }}>
          <KanbanAvatar
            name={current.name}
            avatarUrl={current.avatarUrl}
            size={40}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: tk.textPrimary, fontFamily: 'var(--cp-font-heading)' }}>
              {current.name}
            </div>
            <div style={{ fontSize: 12, color: tk.textMuted, fontFamily: 'var(--cp-font-body)', marginTop: 2 }}>
              {current.inProgress.length} in progress · {current.done.length} done · {current.todo.length} to do
            </div>
          </div>
          {visited.has(current.name) && (
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#36B37E', fontFamily: 'var(--cp-font-body)' }}>
              <IcCheck size={13} />
              Reviewed
            </span>
          )}
        </div>

        {/* ── Cards ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {current.inProgress.length > 0 && (
            <section>
              <SectionLabel label="In progress" count={current.inProgress.length} color="#669DF1" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {current.inProgress.map(i => <StandupCard key={i.id} issue={i} tk={tk} />)}
              </div>
            </section>
          )}
          {current.todo.length > 0 && (
            <section>
              <SectionLabel label="To do / next up" count={current.todo.length} color={tk.textMuted} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {current.todo.slice(0, 5).map(i => <StandupCard key={i.id} issue={i} tk={tk} />)}
                {current.todo.length > 5 && (
                  <div style={{ fontSize: 12, color: tk.textMuted, fontFamily: 'var(--cp-font-body)', padding: '2px 14px' }}>
                    +{current.todo.length - 5} more
                  </div>
                )}
              </div>
            </section>
          )}
          {current.done.length > 0 && (
            <section>
              <SectionLabel label="Done" count={current.done.length} color="#94C748" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {current.done.slice(0, 5).map(i => <StandupCard key={i.id} issue={i} tk={tk} />)}
              </div>
            </section>
          )}
          {current.inProgress.length === 0 && current.todo.length === 0 && current.done.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: tk.textMuted, fontSize: 13, fontFamily: 'var(--cp-font-body)' }}>
              No active issues.
            </div>
          )}
        </div>

        {/* ── Footer navigation ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: `1px solid ${tk.border}` }}>
          <button
            onClick={() => advance(-1)}
            disabled={personIdx === 0}
            style={navBtnStyle(tk, false, personIdx === 0)}
          >
            <IcArrowLeft size={14} color={personIdx === 0 ? tk.textDisabled : tk.textPrimary} />
            Previous
          </button>

          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 5 }}>
            {buckets.map((b, i) => (
              <button
                key={b.name}
                onClick={() => { if (current) setVisited(v => new Set([...v, current.name])); setPersonIdx(i); }}
                title={b.name}
                style={{
                  width: i === personIdx ? 20 : 8, height: 8, borderRadius: 4,
                  border: 'none', cursor: 'pointer', padding: 0,
                  background: i === personIdx
                    ? 'var(--ds-text-brand, #0052CC)'
                    : visited.has(b.name) ? '#36B37E' : tk.chipBg,
                  transition: 'width 200ms ease, background 200ms ease',
                }}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={onClose}
              style={navBtnStyle(tk, true, false)}
            >
              Done
              <IcCheck size={14} color="#FFFFFF" />
            </button>
          ) : (
            <button
              onClick={() => advance(1)}
              style={navBtnStyle(tk, true, false)}
            >
              Next
              <IcArrowRight size={14} color="#FFFFFF" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Style helpers ── */
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(9,30,66,0.54)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(2px)',
};

function panelStyle(tk: KanbanThemeTokens, _isDark: boolean): React.CSSProperties {
  return {
    width: 600, maxWidth: '94vw',
    height: 620, maxHeight: '90vh',
    background: tk.surfaceBg,
    borderRadius: 8,
    boxShadow: '0 16px 48px rgba(9,30,66,0.35), 0 0 1px rgba(9,30,66,0.25)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: 'var(--cp-font-body)',
  };
}

function navBtnStyle(tk: KanbanThemeTokens, primary: boolean, disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 32, padding: '0 14px',
    borderRadius: 3, border: 'none', cursor: disabled ? 'default' : 'pointer',
    fontSize: 14, fontWeight: 500, fontFamily: 'var(--cp-font-body)',
    color: disabled ? tk.textDisabled : primary ? '#FFFFFF' : tk.textPrimary,
    background: disabled ? tk.chipBg : primary ? 'var(--ds-text-brand, #0052CC)' : tk.surfaceHover,
    opacity: disabled ? 0.5 : 1,
    transition: 'background 100ms',
  };
}

function CloseButton({ onClick, tk }: { onClick: () => void; tk: KanbanThemeTokens }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close standup"
      style={{
        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 3,
        color: tk.textMuted, transition: 'background 80ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = tk.surfaceHover)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <IcClose size={14} color={tk.textMuted} />
    </button>
  );
}

function SectionLabel({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'var(--cp-font-body)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color, fontFamily: 'var(--cp-font-mono)' }}>
        ({count})
      </span>
    </div>
  );
}
