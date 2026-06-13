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
import { createPortal } from 'react-dom';
import PreferencesIcon from '@atlaskit/icon/glyph/preferences';
import VidPlayIcon from '@atlaskit/icon/glyph/vid-play';
import VidPauseIcon from '@atlaskit/icon/glyph/vid-pause';
import CheckIcon from '@atlaskit/icon/glyph/check';
import CrossIcon from '@atlaskit/icon/glyph/cross';
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
const IcStop = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden>
    <rect x="3" y="3" width="10" height="10" rx="1.5" />
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
  /** When true, render as an inline docked flex-item (no position:fixed). The
   *  parent is responsible for sizing + positioning. Used by the Jira-parity
   *  layout where the standup sits side-by-side with the board columns. */
  docked?: boolean;
}

/* ── Assignee bucket ── */
interface AssigneeBucket {
  name: string;
  avatarUrl: string | null;
  total: number;
  inProgress: number;
  done: number;
}

/* ── Web Audio: 880Hz long beep when the timer hits 00:00. ── */
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

/* ── Web Audio: short higher-pitched "tick" for the last-10-second countdown. */
function playTick() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(1500, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch { /* ignore — audio context blocked */ }
}

const DEFAULT_TIMER_SEC = 120; // 2 minutes

export function StandupModal({ issues, avatarsByName, tk, onClose, onPersonChange, docked }: StandupPanelProps) {
  const [order, setOrder] = useState<number[]>([]);
  const [step, setStep] = useState(0);         // index into `order`
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(DEFAULT_TIMER_SEC);
  const [timerDuration, setTimerDuration] = useState(DEFAULT_TIMER_SEC);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  /* New header-spec state (Jira parity):
     - density: row spacing + avatar/name size in the speaker list
     - enableTimer: when false, the entire timer row is hidden
     - shuffleOnOpen: when true, randomize speaker order on mount */
  const [density, setDensity] = useState<'default' | 'compact'>('default');
  const [enableTimer, setEnableTimer] = useState(true);
  const [shuffleOnOpen, setShuffleOnOpen] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);

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

  /* Initialise order on first load — if shuffleOnOpen is enabled, randomise
     the speaker order so every standup feels different (Jira parity). */
  useEffect(() => {
    let initial = buckets.map((_, i) => i);
    if (shuffleOnOpen) {
      for (let i = initial.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [initial[i], initial[j]] = [initial[j], initial[i]];
      }
    }
    setOrder(initial);
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

  /* Countdown tick. Under 10s plays a short tick every second; at 00:00
     plays the long beep, then resets back to the selected timer duration
     so the timer row returns to its idle state (Stop button auto-hides
     because it's gated on `seconds !== timerDuration`). */
  useEffect(() => {
    if (!running) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setRunning(false);
          if (!muted) playBeep();
          return timerDuration;
        }
        const next = s - 1;
        if (next > 0 && next <= 10 && !muted) playTick();
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running, muted, timerDuration]);

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

  /* Settings outside-click close — ignores clicks on the trigger button so
     the toggle behaviour still works, and on the portaled dropdown. */
  useEffect(() => {
    if (!showSettings) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (settingsTriggerRef.current?.contains(t)) return;
      if (settingsRef.current?.contains(t)) return;
      setShowSettings(false);
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
      <div style={panelWrapStyle(tk, docked)}>
        <div style={{ padding: '12px 14px 8px', fontSize: 14, fontWeight: 600, color: tk.textPrimary, fontFamily: 'var(--cp-font-heading)' }}>
          Standup
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tk.textMuted, fontSize: 13, padding: 24, fontFamily: 'var(--cp-font-body)', textAlign: 'center' }}>
          No team members with issues on the board.
        </div>
      </div>
    );
  }

  return (
    <div style={panelWrapStyle(tk, docked)}>
      {/* ── Header: Standup title + Settings icon (Jira parity) ────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: tk.textPrimary, fontFamily: 'var(--cp-font-heading)' }}>
          Standup
        </span>
        <SettingsTrigger
          triggerRef={settingsTriggerRef}
          active={showSettings}
          onClick={() => setShowSettings(s => !s)}
        />
        {showSettings && (
          <SettingsDropdown
            triggerRef={settingsTriggerRef}
            panelRef={settingsRef}
            tk={tk}
            density={density}
            onDensityChange={setDensity}
            enableTimer={enableTimer}
            onEnableTimerChange={setEnableTimer}
            shuffleOnOpen={shuffleOnOpen}
            onShuffleOnOpenChange={setShuffleOnOpen}
            timerDuration={timerDuration}
            onTimerDurationChange={(secs) => { setTimerDuration(secs); setSeconds(secs); }}
          />
        )}
      </div>

      {/* ── Timer row (only when Enable timer is on) ─────────────────── */}
      {enableTimer && (
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          padding: '4px 16px 14px',
        }}>
          <span style={{
            fontSize: 36, fontWeight: 400,
            color: tk.textPrimary,
            fontFamily: 'var(--cp-font-mono)',
            letterSpacing: '0.01em',
            lineHeight: '40px',
          }}>
            {mm}:{ss}
          </span>
          {/* Play / Pause / Stop cluster — buttons anchored to the bottom of
              the timer row so the 36px time text is the visual anchor and the
              small 22px circles sit at its baseline. */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 4 }}>
            {running ? (
              <>
                <CircleCtrlBtn onClick={() => setRunning(false)} title="Pause" kind="pause" />
                <CircleCtrlBtn onClick={() => { setRunning(false); setSeconds(timerDuration); }} title="Stop" kind="stop" />
              </>
            ) : (
              <>
                <CircleCtrlBtn
                  onClick={() => {
                    if (seconds === 0) setSeconds(timerDuration);
                    setRunning(true);
                  }}
                  title="Play"
                  kind="play"
                />
                {seconds !== timerDuration && (
                  <CircleCtrlBtn onClick={() => { setRunning(false); setSeconds(timerDuration); }} title="Stop" kind="stop" />
                )}
              </>
            )}
          </div>
          {/* Buzzer toggle pushes to the right */}
          <span style={{ flex: 1 }} />
          <BuzzerBtn
            muted={muted}
            tk={tk}
            onToggle={() => setMuted(m => !m)}
          />
        </div>
      )}

      {/* ── Team member list ─ Density controls row padding + avatar/name. */}
      {(() => {
        const compact = density === 'compact';
        const rowPadding = compact ? '4px 12px' : '8px 12px';
        const avatarSize = compact ? 24 : 32;
        const nameSize = compact ? 13 : 14;
        const metaSize = compact ? 10 : 11;
        return (
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
                width: '100%', textAlign: 'left', padding: rowPadding,
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
              <KanbanAvatar name={b.name} avatarUrl={b.avatarUrl} size={avatarSize} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: nameSize, fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? 'var(--ds-link,var(--cp-primary-60, #0052CC))' : tk.textPrimary,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {b.name}
                </div>
                <div style={{ fontSize: metaSize, color: tk.textMuted, marginTop: 1 }}>
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
        );
      })()}

      {/* ── Footer navigation ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', gap: 8,
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

function panelWrapStyle(tk: KanbanThemeTokens, docked?: boolean): React.CSSProperties {
  if (docked) {
    /* Inline docked variant — sits as a flex item next to the board columns.
       Jira-parity: white surface, rounded gray border, no fixed positioning.
       Sticky + viewport-relative max-height keep the panel pinned to the
       visible viewport even when the board area scrolls past the bottom of
       the column list. Content inside scrolls internally via overflowY. */
    return {
      width: 280, minWidth: 280,
      position: 'sticky',
      top: 0,
      alignSelf: 'flex-start',
      maxHeight: 'calc(100vh - 180px)',
      background: tk.surfaceBg,
      border: `1px solid ${tk.border}`,
      borderRadius: 8,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--cp-font-body)',
      overflowY: 'auto',
    };
  }
  /* Legacy fixed overlay variant — left-edge dock spanning the viewport. */
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

/* ── Header settings trigger — preferences glyph in a tinted toggle button.
   Idle: gray icon on transparent bg.
   Hover (inactive): light neutral hover bg.
   Active (dropdown open): blue border + light-blue bg + blue icon.
   Active+hover: a touch more saturated blue. */
function SettingsTrigger({
  active, onClick, triggerRef,
}: {
  active: boolean;
  onClick: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onClick}
      title="Standup settings"
      aria-label="Standup settings"
      style={{
        width: 32, height: 32,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${active ? 'var(--ds-border-selected, #0C66E4)' : 'transparent'}`,
        background: active
          ? 'var(--ds-background-information, #E9F2FE)'
          : 'transparent',
        borderRadius: 4, cursor: 'pointer', padding: 0,
        color: active ? 'var(--ds-link, #0C66E4)' : 'var(--ds-text-subtle, #44546F)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = active
          ? 'var(--ds-background-information-hovered, #CCE0FF)'
          : 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = active
          ? 'var(--ds-background-information, #E9F2FE)'
          : 'transparent';
      }}
    >
      <PreferencesIcon
        label=""
        size="medium"
        primaryColor={active ? 'var(--ds-link, #0C66E4)' : 'var(--ds-text-subtle, #44546F)'}
      />
    </button>
  );
}

/* ── Settings dropdown panel (Density / Toggles / Timer Duration).
   Portaled to document.body so the rounded-overflow on the standup panel
   doesn't clip it. Opens to the RIGHT of the trigger button so it extends
   into the board area where there's more space. */
function SettingsDropdown({
  triggerRef, panelRef,
  tk, density, onDensityChange,
  enableTimer, onEnableTimerChange,
  shuffleOnOpen, onShuffleOnOpenChange,
  timerDuration, onTimerDurationChange,
}: {
  triggerRef: React.RefObject<HTMLButtonElement>;
  panelRef: React.RefObject<HTMLDivElement>;
  tk: KanbanThemeTokens;
  density: 'default' | 'compact';
  onDensityChange: (d: 'default' | 'compact') => void;
  enableTimer: boolean;
  onEnableTimerChange: (v: boolean) => void;
  shuffleOnOpen: boolean;
  onShuffleOnOpenChange: (v: boolean) => void;
  timerDuration: number;
  onTimerDurationChange: (seconds: number) => void;
}) {
  const PANEL_W = 300;
  const rect = triggerRef.current?.getBoundingClientRect();
  if (!rect) return null;
  // Default placement: open to the RIGHT of the trigger so the dropdown
  // extends into the board area (more space) rather than back over the
  // narrow standup panel. Falls back to the left when there isn't room.
  const spaceRight = window.innerWidth - rect.right;
  const openRight = spaceRight >= PANEL_W + 8;
  const left = openRight
    ? rect.right + 8
    : Math.max(8, rect.left - PANEL_W - 8);
  const top = Math.min(rect.bottom + 6, window.innerHeight - 8);
  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      data-standup-settings="true"
      style={{
        position: 'fixed',
        top,
        left,
        width: PANEL_W,
        background: tk.surfaceBg,
        border: `1px solid ${tk.border}`,
        borderRadius: 6,
        padding: '10px 0',
        zIndex: 10000,
        boxShadow: '0 8px 24px rgba(9,30,66,0.16)',
        fontFamily: 'var(--cp-font-body)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Section 1 — Density */}
      <div style={{ padding: '0 14px 8px' }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: tk.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
        }}>Density</div>
        <RadioOption
          checked={density === 'default'}
          onSelect={() => onDensityChange('default')}
          label="Default"
          rightHint={<DensityHint variant="default" tk={tk} />}
        />
        <RadioOption
          checked={density === 'compact'}
          onSelect={() => onDensityChange('compact')}
          label="Compact"
          rightHint={<DensityHint variant="compact" tk={tk} />}
        />
      </div>

      <div style={{ height: 1, background: tk.borderSubtle, margin: '6px 0' }} />

      {/* Section 2 — Toggles */}
      <div style={{ padding: '0 14px 6px' }}>
        <ToggleRow
          label="Enable timer"
          value={enableTimer}
          onChange={onEnableTimerChange}
        />
        <ToggleRow
          label="Shuffle speaker order for every standup"
          value={shuffleOnOpen}
          onChange={onShuffleOnOpenChange}
        />
      </div>

      <div style={{ height: 1, background: tk.borderSubtle, margin: '6px 0' }} />

      {/* Section 3 — Timer Duration chips */}
      <div style={{ padding: '0 14px 4px' }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: tk.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
        }}>Timer duration (min)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 5].map((m) => {
            const secs = m * 60;
            const selected = timerDuration === secs;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onTimerDurationChange(secs)}
                style={{
                  width: 40, height: 30, borderRadius: 4,
                  border: `1px solid ${selected ? 'var(--ds-border-selected, #0C66E4)' : 'var(--ds-border, #DFE1E6)'}`,
                  background: selected
                    ? 'var(--ds-background-information, #E9F2FE)'
                    : 'var(--ds-surface, #FFFFFF)',
                  color: selected ? 'var(--ds-link, #0C66E4)' : tk.textPrimary,
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = selected
                    ? 'var(--ds-background-information-hovered, #CCE0FF)'
                    : 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = selected
                    ? 'var(--ds-background-information, #E9F2FE)'
                    : 'var(--ds-surface, #FFFFFF)';
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Density hint — two/three thin bars visualising row density. ─────── */
function DensityHint({ variant, tk }: { variant: 'default' | 'compact'; tk: KanbanThemeTokens }) {
  const rows = variant === 'default' ? 2 : 3;
  const gap = variant === 'default' ? 5 : 3;
  return (
    <span style={{
      display: 'inline-flex', flexDirection: 'column',
      gap, padding: 4,
      border: `1px solid ${tk.border}`, borderRadius: 4,
    }}>
      {Array.from({ length: rows }).map((_, i) => (
        <span
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ width: 3, height: 3, borderRadius: 1, background: tk.textMuted }} />
          <span style={{ width: 22, height: 2, borderRadius: 1, background: tk.textMuted }} />
        </span>
      ))}
    </span>
  );
}

/* ── Radio row — selectable label with hint to the right. ─────────────── */
function RadioOption({
  checked, onSelect, label, rightHint,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  rightHint?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '6px 0',
        border: 'none', background: 'transparent', cursor: 'pointer',
        textAlign: 'left', fontFamily: 'var(--cp-font-body)',
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${checked ? 'var(--ds-border-selected, #0C66E4)' : 'var(--ds-border, #C1C7D0)'}`,
        background: 'transparent', flexShrink: 0,
      }}>
        {checked && (
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--ds-border-selected, #0C66E4)',
          }} />
        )}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--ds-text, #292A2E)' }}>{label}</span>
      {rightHint}
    </button>
  );
}

/* ── Pill toggle row — label + on/off switch. ─────────────────────────── */
function ToggleRow({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0',
    }}>
      <span style={{
        flex: 1, fontSize: 13, color: 'var(--ds-text, #292A2E)',
        lineHeight: '18px',
      }}>{label}</span>
      <PillToggle value={value} onChange={onChange} />
    </div>
  );
}

/* ── Pill toggle: green + check when ON, dark + cross when OFF. ───────── */
function PillToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        border: 'none', padding: 2,
        background: value ? '#4F7B26' : '#292A2E',
        display: 'inline-flex', alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      {/* When ON: icon on the LEFT, knob on the RIGHT.
          When OFF: knob on the LEFT, icon on the RIGHT. */}
      {value ? (
        <>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 16, color: '#FFFFFF', marginLeft: 2,
          }}>
            <CheckIcon label="" size="small" primaryColor="#FFFFFF" />
          </span>
          <span style={{
            width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF',
          }} />
        </>
      ) : (
        <>
          <span style={{
            width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF',
          }} />
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 16, color: '#FFFFFF', marginRight: 2,
          }}>
            <CrossIcon label="" size="small" primaryColor="#FFFFFF" />
          </span>
        </>
      )}
    </button>
  );
}

/* ── Circular outlined control button — white surface, light gray ring,
   Atlaskit play/pause glyph filled gray inside. Stop uses the in-file
   IcStop helper (filled rounded square) to keep the same gray tone. */
function CircleCtrlBtn({
  onClick, title, kind,
}: { onClick: () => void; title: string; kind: 'play' | 'pause' | 'stop' }) {
  const glyphColor = '#44546F';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 22, height: 22,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: '50%',
        background: 'var(--ds-surface, #FFFFFF)',
        cursor: 'pointer', padding: 0,
        color: glyphColor,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface, #FFFFFF)'; }}
    >
      {kind === 'play' && <VidPlayIcon label="" size="small" primaryColor={glyphColor} />}
      {kind === 'pause' && <VidPauseIcon label="" size="small" primaryColor={glyphColor} />}
      {kind === 'stop' && <IcStop size={9} color={glyphColor} />}
    </button>
  );
}

/* ── Buzzer toggle button — speaker or speaker-muted with tooltip. ────── */
function BuzzerBtn({
  muted, tk, onToggle,
}: { muted: boolean; tk: KanbanThemeTokens; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={muted ? 'Timer buzzer is off' : 'Timer buzzer is on'}
      aria-label={muted ? 'Turn timer buzzer on' : 'Turn timer buzzer off'}
      style={{
        width: 32, height: 32,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', background: 'transparent',
        borderRadius: 4, cursor: 'pointer', padding: 0,
        color: tk.textSecondary,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      <IcSpeaker size={20} color="var(--ds-text-subtle, #44546F)" muted={muted} />
    </button>
  );
}
