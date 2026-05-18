// @ts-nocheck
/**
 * StandupPanel — Jira-parity "Start Standup" feature.
 *
 * Layout: fixed left-side panel (280px). The board stays visible on the right,
 * filtered to the currently-selected team member's issues.
 *
 * Features (Jira parity):
 *  • Team member list with avatars
 *  • Per-person 2-minute countdown timer (configurable)
 *  • Play / pause button
 *  • Audio alert when timer expires (Web Audio API — no file dependency)
 *  • Shuffle (randomise order)
 *  • Settings gear (timer duration)
 *  • "End standup" button
 *  • Board filters to the selected person via onPersonChange callback
 *
 * ADS-only: no lucide, no Tailwind, no --cp-* fallbacks.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens } from './kanban-tokens';
import { KanbanAvatar } from './KanbanAvatar';

/* ── Inline SVG icons ── */
const IcPlay = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden>
    <path d="M4 2.5l10 5.5-10 5.5V2.5z" />
  </svg>
);
const IcPause = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden>
    <rect x="3" y="2" width="4" height="12" rx="1" />
    <rect x="9" y="2" width="4" height="12" rx="1" />
  </svg>
);
const IcShuffle = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 4h2.5a4 4 0 013.2 1.6L9.5 8m3 4h1.5m-1.5 0l1.5-1.5-1.5-1.5" />
    <path d="M9.5 8l1.8 2.4A4 4 0 0014.5 12H12m1.5-8H12a4 4 0 00-3.2 1.6L7.3 5.6" />
  </svg>
);
const IcSettings = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="8" cy="8" r="2.5" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" />
  </svg>
);
const IcSpeaker = ({ size = 15, color = 'currentColor', muted = false }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 6H1v4h2l4 3V3L3 6z" fill={color} fillOpacity={0.15} />
    {muted ? (
      <path d="M12 6l-3 4M9 6l3 4" />
    ) : (
      <>
        <path d="M10 5.5a3.5 3.5 0 010 5" />
        <path d="M12 3.5a6 6 0 010 9" />
      </>
    )}
  </svg>
);
const IcCheck = ({ size = 13, color = '#36B37E' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M2 8l5 5 7-7" />
  </svg>
);

/* ── Props ── */
export interface StandupPanelProps {
  issues: BoardIssue[];
  avatarsByName: Map<string, string>;
  tk: KanbanThemeTokens;
  onClose: () => void;
  /** Called whenever the selected person changes so the board can filter */
  onPersonChange: (assigneeName: string | null) => void;
}

/* ── Assignee bucket ── */
interface AssigneeBucket {
  name: string;
  avatarUrl: string | null;
  total: number;
  inProgress: number;
  done: number;
}

/* ── Web Audio beep ── */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch { /* ignore — audio context blocked */ }
}

const DEFAULT_TIMER_SEC = 120; // 2 minutes

export function StandupModal({ issues, avatarsByName, tk, onClose, onPersonChange }: StandupPanelProps) {
  const [order, setOrder] = useState<number[]>([]);
  const [step, setStep] = useState(0);         // index into `order`
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(DEFAULT_TIMER_SEC);
  const [timerDuration, setTimerDuration] = useState(DEFAULT_TIMER_SEC);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [draftDuration, setDraftDuration] = useState('2');
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const settingsRef = useRef<HTMLDivElement>(null);

  /* Build per-assignee buckets */
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
          total: 0, inProgress: 0, done: 0,
        });
      }
      const b = map.get(name)!;
      b.total++;
      const cat = issue.statusCategory ?? '';
      if (cat === 'done') b.done++;
      else if (cat === 'inprogress' || cat === 'in_progress') b.inProgress++;
    }
    return Array.from(map.values()).sort((a, b2) => b2.inProgress - a.inProgress);
  }, [issues, avatarsByName]);

  /* Initialise order on first load */
  useEffect(() => {
    setOrder(buckets.map((_, i) => i));
    setStep(0);
    setRunning(false);
    setSeconds(DEFAULT_TIMER_SEC);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  const currentBucket = buckets[order[step] ?? 0];

  /* Notify board whenever selected person changes */
  useEffect(() => {
    onPersonChange(currentBucket?.name ?? null);
  }, [currentBucket, onPersonChange]);

  /* Countdown tick */
  useEffect(() => {
    if (!running) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setRunning(false);
          if (!muted) playBeep();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running, muted]);

  /* Reset timer when person changes */
  useEffect(() => {
    clearInterval(timerRef.current);
    setRunning(false);
    setSeconds(timerDuration);
  }, [step, timerDuration]);

  /* Keyboard nav */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') advance(1);
      else if (e.key === 'ArrowLeft') advance(-1);
      else if (e.key === 'Escape') { onPersonChange(null); onClose(); }
      else if (e.key === ' ') { e.preventDefault(); setRunning(r => !r); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, order]);

  /* Settings outside-click close */
  useEffect(() => {
    if (!showSettings) return;
    const h = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showSettings]);

  const advance = useCallback((delta: 1 | -1) => {
    if (currentBucket) setVisited(v => new Set([...v, currentBucket.name]));
    setStep(i => Math.max(0, Math.min((order.length || 1) - 1, i + delta)));
  }, [currentBucket, order.length]);

  const shuffle = useCallback(() => {
    setOrder(prev => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    setStep(0);
    setVisited(new Set());
  }, []);

  const handleEnd = useCallback(() => {
    onPersonChange(null);
    onClose();
  }, [onPersonChange, onClose]);

  /* Timer display */
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const timerPct = 1 - seconds / timerDuration;
  const timerColor = seconds <= 15 ? '#E5493A' : seconds <= 30 ? '#FF8B00' : 'var(--ds-text-brand,var(--cp-primary-60, #0052CC))';
  const total = order.length;
  const isLast = step === total - 1;

  if (buckets.length === 0) {
    return (
      <div style={panelWrapStyle(tk)}>
        <PanelHeader tk={tk} onEnd={handleEnd} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tk.textMuted, fontSize: 13, padding: 24, fontFamily: 'var(--cp-font-body)', textAlign: 'center' }}>
          No team members with issues on the board.
        </div>
      </div>
    );
  }

  return (
    <div style={panelWrapStyle(tk)}>
      {/* ── Header: title + End standup ── */}
      <PanelHeader tk={tk} onEnd={handleEnd} />

      {/* ── Timer block ── */}
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${tk.border}` }}>
        {/* Jira parity: timer centered above controls (not side-by-side) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {/* Circular timer — 72px, centered */}
          <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke={tk.borderSubtle} strokeWidth="4" />
              <circle
                cx="36" cy="36" r="30" fill="none"
                stroke={timerColor} strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * timerPct}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 300ms' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: timerColor, fontFamily: 'var(--cp-font-mono)',
              letterSpacing: '0.02em',
            }}>
              {mm}:{ss}
            </div>
          </div>
          {/* Controls row — centered below timer */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {/* Play/Pause */}
            <IconBtn
              onClick={() => setRunning(r => !r)}
              title={running ? 'Pause' : 'Play'}
              tk={tk}
              active={running}
            >
              {running ? <IcPause size={13} color="var(--ds-text-brand,var(--cp-primary-60, #0052CC))" /> : <IcPlay size={13} color="var(--ds-text-brand,var(--cp-primary-60, #0052CC))" />}
            </IconBtn>
            {/* Mute */}
            <IconBtn onClick={() => setMuted(m => !m)} title={muted ? 'Unmute' : 'Mute'} tk={tk}>
              <IcSpeaker size={14} color={muted ? tk.textDisabled : tk.textSecondary} muted={muted} />
            </IconBtn>
            {/* Shuffle */}
            <IconBtn onClick={shuffle} title="Shuffle order" tk={tk}>
              <IcShuffle size={14} color={tk.textSecondary} />
            </IconBtn>
            {/* Settings */}
            <div style={{ position: 'relative' }} ref={settingsRef}>
              <IconBtn onClick={() => { setShowSettings(s => !s); setDraftDuration(String(Math.round(timerDuration / 60))); }} title="Timer settings" tk={tk}>
                <IcSettings size={14} color={tk.textSecondary} />
              </IconBtn>
              {showSettings && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                  width: 180, background: tk.surfaceBg,
                  border: `1px solid ${tk.border}`, borderRadius: 6,
                  padding: 12, zIndex: 60,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                  fontFamily: 'var(--cp-font-body)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tk.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Timer duration (min)
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 5].map(m => (
                      <button key={m}
                        onClick={() => { const s = m * 60; setTimerDuration(s); setSeconds(s); setShowSettings(false); }}
                        style={{
                          flex: 1, height: 28, borderRadius: 4, border: `1px solid ${timerDuration === m * 60 ? 'var(--ds-text-brand,var(--cp-primary-60, #0052CC))' : tk.border}`,
                          background: timerDuration === m * 60 ? 'var(--ds-background-selected,#DEEBFF)' : 'transparent',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          color: timerDuration === m * 60 ? 'var(--ds-link,var(--cp-primary-60, #0052CC))' : tk.textSecondary,
                        }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Person position — centered, muted */}
          <div style={{ fontSize: 11, color: tk.textMuted, fontFamily: 'var(--cp-font-body)' }}>
            {step + 1} of {total} — press Space to {running ? 'pause' : 'start'}
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: tk.borderSubtle, borderRadius: 2, marginTop: 10 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${((step + 1) / total) * 100}%`,
            background: 'var(--ds-text-brand,var(--cp-primary-60, #0052CC))',
            transition: 'width 250ms ease',
          }} />
        </div>
      </div>

      {/* ── Team member list ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {order.map((bucketIdx, listPos) => {
          const b = buckets[bucketIdx];
          const isSelected = listPos === step;
          const wasVisited = visited.has(b.name);
          return (
            <button
              key={b.name}
              onClick={() => {
                if (currentBucket) setVisited(v => new Set([...v, currentBucket.name]));
                setStep(listPos);
              }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
                border: 'none', cursor: 'pointer',
                background: isSelected ? 'var(--ds-background-selected,#DEEBFF)' : 'transparent',
                borderLeft: isSelected ? '3px solid var(--ds-text-brand,var(--cp-primary-60, #0052CC))' : '3px solid transparent',
                fontFamily: 'var(--cp-font-body)',
                transition: 'background 80ms',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = tk.surfaceHover; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <KanbanAvatar name={b.name} avatarUrl={b.avatarUrl} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? 'var(--ds-link,var(--cp-primary-60, #0052CC))' : tk.textPrimary,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {b.name}
                </div>
                <div style={{ fontSize: 11, color: tk.textMuted, marginTop: 1 }}>
                  {b.total} issue{b.total !== 1 ? 's' : ''}
                  {b.inProgress > 0 ? ` · ${b.inProgress} in progress` : ''}
                </div>
              </div>
              {wasVisited && !isSelected && (
                <IcCheck size={13} color="#36B37E" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Footer navigation ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderTop: `1px solid ${tk.border}`, gap: 8,
      }}>
        <button
          onClick={() => advance(-1)} disabled={step === 0}
          style={navBtnStyle(tk, false, step === 0)}
        >
          ← Prev
        </button>
        {/* Dot row */}
        <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {order.slice(0, 15).map((bIdx, lp) => (
            <span key={lp} style={{
              width: lp === step ? 16 : 6, height: 6, borderRadius: 3,
              background: lp === step
                ? 'var(--ds-text-brand,var(--cp-primary-60, #0052CC))'
                : visited.has(buckets[bIdx]?.name ?? '') ? '#36B37E' : tk.chipBg,
              transition: 'width 200ms ease',
              flexShrink: 0,
            }} />
          ))}
          {order.length > 15 && (
            <span style={{ fontSize: 10, color: tk.textMuted, lineHeight: '6px' }}>…</span>
          )}
        </div>
        {isLast ? (
          <button onClick={handleEnd} style={navBtnStyle(tk, true, false)}>
            Done ✓
          </button>
        ) : (
          <button onClick={() => advance(1)} style={navBtnStyle(tk, true, false)}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}


/* ── Sub-components ── */
function PanelHeader({ tk, onEnd }: { tk: KanbanThemeTokens; onEnd: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px 8px', borderBottom: `1px solid ${tk.border}`,
    }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: tk.textPrimary, fontFamily: 'var(--cp-font-heading)' }}>
        Daily Standup
      </span>
      <button
        onClick={onEnd}
        style={{
          fontSize: 12, fontWeight: 500, height: 26, padding: '0 10px',
          borderRadius: 3, border: 'none',
          background: 'transparent', cursor: 'pointer',
          color: 'var(--ds-text-danger,#AE2A19)', fontFamily: 'var(--cp-font-body)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-danger-hovered,#FFEBE6)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        End standup
      </button>
    </div>
  );
}

function IconBtn({ onClick, title, children, tk, active }: {
  onClick: () => void; title: string;
  children: React.ReactNode; tk: KanbanThemeTokens; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 4, border: `1px solid ${active ? 'var(--ds-text-brand,var(--cp-primary-60, #0052CC))' : 'transparent'}`,
        background: active ? 'var(--ds-background-selected,#DEEBFF)' : 'transparent',
        cursor: 'pointer', flexShrink: 0,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = tk.surfaceHover; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'var(--ds-background-selected,#DEEBFF)' : 'transparent'; }}
    >
      {children}
    </button>
  );
}

function panelWrapStyle(tk: KanbanThemeTokens): React.CSSProperties {
  return {
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    width: 280,
    background: tk.surfaceBg,
    borderRight: `1px solid ${tk.border}`,
    boxShadow: '4px 0 16px rgba(9,30,66,0.18)',
    display: 'flex', flexDirection: 'column',
    zIndex: 300,
    fontFamily: 'var(--cp-font-body)',
    overflow: 'hidden',
  };
}

function navBtnStyle(tk: KanbanThemeTokens, primary: boolean, disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    height: 30, padding: '0 12px', borderRadius: 3, border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 13, fontWeight: 500, fontFamily: 'var(--cp-font-body)',
    color: disabled ? tk.textDisabled : primary ? '#FFFFFF' : tk.textPrimary,
    background: disabled ? tk.chipBg : primary ? 'var(--ds-text-brand,var(--cp-primary-60, #0052CC))' : tk.surfaceHover,
    opacity: disabled ? 0.4 : 1,
    whiteSpace: 'nowrap',
  };
}
