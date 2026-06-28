/**
 * StandupPanel — left rail for standup mode.
 *
 * Behaviour (ported from the canonical src/components/kanban/StandupModal,
 * adapted to this board's data model, MINUS speaker/audio per product spec):
 *  • Session countdown timer — driver-selectable 5/10/15/30/50 min (min 5),
 *    shown big to the audience ("we've got X min"). NOT per-person 2-min.
 *  • Subtle Previous / Next (white surface, grey border) — never blue.
 *  • Settings popup: Density (Default/Compact) + Enable timer + Shuffle.
 *  • First click on a person → focus (blue ring) + board filters to them.
 *  • Second click on the selected person → mark done (green tick) + advance.
 *  • Hover row → "Remove from standup" (X) drops them from the rotation.
 *  • onPersonChange(name|null) lets the page filter the board.
 *
 * No speaker, no buzzer, no Web Audio — there is no voice/video requirement.
 * ADS-only: @atlaskit/tokens, @atlaskit primitives, no hardcoded hex.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import VidPlayIcon from '@atlaskit/icon/glyph/vid-play';
import VidPauseIcon from '@atlaskit/icon/glyph/vid-pause';
import PreferencesIcon from '@atlaskit/icon/glyph/preferences';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import EditorDoneIcon from '@atlaskit/icon/glyph/editor/done';
import CheckIcon from '@atlaskit/icon/glyph/check';
import type { BoardIssue } from '../types';

interface Props {
  issues: BoardIssue[];
  avatars: Map<string, string | null>;
  /** Called whenever the selected speaker changes so the board can filter. */
  onPersonChange: (name: string | null) => void;
  /** Reports the chosen session timer (seconds) so the page can persist it. */
  onTimerSet?: (sec: number) => void;
}

/** Timer options in minutes. Minimum is 5 — Jira's 2-min model does not fit. */
const TIMER_OPTIONS_MIN = [5, 10, 15, 30, 50] as const;
const DEFAULT_TIMER_SEC = 5 * 60;
const UNASSIGNED = 'Unassigned';

interface Bucket { name: string; avatarUrl: string | null; total: number; inProgress: number; }

function IcShuffle({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 4h2.5a4 4 0 013.2 1.6L9.5 8m3 4h1.5m-1.5 0l1.5-1.5-1.5-1.5" />
      <path d="M9.5 8l1.8 2.4A4 4 0 0014.5 12H12m1.5-8H12a4 4 0 00-3.2 1.6L7.3 5.6" />
    </svg>
  );
}

export const StandupPanel: React.FC<Props> = ({ issues, avatars, onPersonChange, onTimerSet }) => {
  /* Per-assignee buckets (sorted by in-progress count desc). */
  const buckets: Bucket[] = useMemo(() => {
    const map = new Map<string, Bucket>();
    for (const i of issues) {
      const name = i.assigneeName || UNASSIGNED;
      if (!map.has(name)) {
        map.set(name, { name, avatarUrl: i.assigneeName ? (avatars.get(i.assigneeName) ?? null) : null, total: 0, inProgress: 0 });
      }
      const b = map.get(name)!;
      b.total++;
      if (i.statusCategory === 'in_progress') b.inProgress++;
    }
    return Array.from(map.values()).sort((a, b) => b.inProgress - a.inProgress);
  }, [issues, avatars]);

  const [order, setOrder] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [density, setDensity] = useState<'default' | 'compact'>('default');
  const [enableTimer, setEnableTimer] = useState(true);
  const [shuffleOnOpen, setShuffleOnOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const [timerSec, setTimerSec] = useState(DEFAULT_TIMER_SEC);
  const [seconds, setSeconds] = useState(DEFAULT_TIMER_SEC);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  /* Init order on first bucket load (optionally shuffled). */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || buckets.length === 0) return;
    seeded.current = true;
    let initial = buckets.map((_, i) => i);
    if (shuffleOnOpen) {
      for (let i = initial.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [initial[i], initial[j]] = [initial[j], initial[i]]; }
    }
    setOrder(initial);
  }, [buckets, shuffleOnOpen]);

  const currentBucket = buckets[order[step] ?? -1];

  /* Notify board of the current speaker. */
  useEffect(() => { onPersonChange(currentBucket?.name ?? null); }, [currentBucket, onPersonChange]);

  /* Session countdown — counts the whole standup, NOT per person. */
  useEffect(() => {
    if (!running) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setSeconds((s) => { if (s <= 1) { clearInterval(timerRef.current); setRunning(false); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running]);

  /* Settings outside-click close. */
  useEffect(() => {
    if (!showSettings) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (settingsTriggerRef.current?.contains(t) || settingsRef.current?.contains(t)) return;
      setShowSettings(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showSettings]);

  const advance = useCallback((delta: 1 | -1) => {
    if (currentBucket) setVisited((v) => new Set([...v, currentBucket.name]));
    setStep((i) => Math.max(0, Math.min((order.length || 1) - 1, i + delta)));
  }, [currentBucket, order.length]);

  const shuffle = useCallback(() => {
    setOrder((prev) => { const a = [...prev]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; });
    setStep(0); setVisited(new Set());
  }, []);

  const removeFromStandup = useCallback((name: string) => {
    const removeIdx = buckets.findIndex((b) => b.name === name);
    if (removeIdx === -1) return;
    setOrder((prev) => { const next = prev.filter((i) => i !== removeIdx); setStep((s) => Math.max(0, Math.min(s, next.length - 1))); return next; });
    setVisited((v) => { const n = new Set(v); n.delete(name); return n; });
  }, [buckets]);

  const onRowClick = useCallback((listPos: number, name: string) => {
    if (listPos === step) {
      /* Second click on the selected speaker → mark done + advance. */
      setVisited((v) => new Set([...v, name]));
      if (listPos < order.length - 1) setStep(listPos + 1);
    } else {
      if (currentBucket) setVisited((v) => new Set([...v, currentBucket.name]));
      setStep(listPos);
    }
  }, [step, order.length, currentBucket]);

  const setTimer = (secs: number) => { setTimerSec(secs); setSeconds(secs); setRunning(false); onTimerSet?.(secs); };
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const timerDanger = seconds <= 15 && seconds > 0;

  const compact = density === 'compact';
  const rowPad = compact ? '4px 8px' : '8px 8px';
  const avatarSize = compact ? 'small' : 'medium';

  return (
    <aside style={{ width: 280, minWidth: 280, flexShrink: 0, border: `1px solid ${token('color.border', '#091E4224')}`, borderRadius: 8, position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'), overflowY: 'auto' }}>
      {/* Header: title + settings */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: token('color.text', 'var(--ds-text, #172B4D)') }}>Standup</span>
        <button
          ref={settingsTriggerRef}
          type="button"
          aria-label="Standup settings"
          onClick={() => setShowSettings((s) => !s)}
          style={{
            width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${showSettings ? token('color.border.selected', 'var(--ds-link, #0C66E4)') : 'transparent'}`,
            background: showSettings ? token('color.background.selected', 'var(--ds-background-selected, #E9F2FF)') : 'transparent',
            borderRadius: 4, cursor: 'pointer', padding: 0,
          }}
        >
          <PreferencesIcon label="" size="medium" primaryColor={showSettings ? token('color.icon.selected', 'var(--ds-link, #0C66E4)') : token('color.icon.subtle', 'var(--ds-icon, #44546F)')} />
        </button>
      </div>

      {showSettings && (
        <SettingsDropdown
          triggerRef={settingsTriggerRef}
          panelRef={settingsRef}
          density={density} onDensity={setDensity}
          enableTimer={enableTimer} onEnableTimer={setEnableTimer}
          shuffleOnOpen={shuffleOnOpen} onShuffle={setShuffleOnOpen}
          timerSec={timerSec} onTimer={setTimer}
        />
      )}

      {/* Session timer */}
      {enableTimer && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '0 16px 12px' }}>
          <span style={{ fontSize: 36, fontWeight: 400, fontVariantNumeric: 'tabular-nums', lineHeight: '40px', color: timerDanger ? token('color.text.danger', 'var(--ds-text-danger, #AE2A19)') : token('color.text', 'var(--ds-text, #172B4D)') }}>
            {mm}:{ss}
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 4 }}>
            <CircleBtn label={running ? 'Pause' : 'Play'} onClick={() => { if (seconds === 0) setSeconds(timerSec); setRunning((r) => !r); }}>
              {running ? <VidPauseIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon, #44546F)')} /> : <VidPlayIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon, #44546F)')} />}
            </CircleBtn>
          </div>
        </div>
      )}

      {/* Nav row: Shuffle | Previous + Next */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px', gap: 8 }}>
        <IconGhostBtn label="Shuffle order" onClick={shuffle}>
          <IcShuffle size={16} color={token('color.icon.subtle', 'var(--ds-icon, #44546F)')} />
        </IconGhostBtn>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NavStepBtn label="Previous" disabled={step === 0} onClick={() => advance(-1)} />
          <NavStepBtn label="Next" disabled={step >= order.length - 1} onClick={() => advance(1)} />
        </div>
      </div>

      {/* Speaker list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {order.map((bucketIdx, listPos) => {
          const b = buckets[bucketIdx];
          if (!b) return null;
          const isSelected = listPos === step;
          const wasVisited = visited.has(b.name);
          const isHovered = hoveredRow === b.name;
          return (
            <div
              key={b.name}
              role="button"
              tabIndex={0}
              onClick={() => onRowClick(listPos, b.name)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(listPos, b.name); } }}
              onMouseEnter={() => setHoveredRow(b.name)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: rowPad, marginBottom: 2,
                borderRadius: 6, cursor: 'pointer',
                background: isSelected ? token('color.background.selected', 'var(--ds-background-selected, #E9F2FF)') : isHovered ? token('color.background.neutral.subtle.hovered', '#091E420F') : 'transparent',
                border: `1px solid ${isSelected ? token('color.border.selected', 'var(--ds-link, #0C66E4)') : 'transparent'}`,
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0, lineHeight: 0 }}>
                <Avatar size={avatarSize} src={b.name === UNASSIGNED ? undefined : b.avatarUrl ?? undefined} name={b.name} />
                {wasVisited && (
                  <span aria-label="Standup done" title="Done" style={{
                    position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%',
                    background: token('color.icon.success', 'var(--ds-background-success-bold, #1F845A)'), border: `2px solid ${token('elevation.surface', 'var(--ds-surface, #FFFFFF)')}`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', boxSizing: 'border-box',
                  }}>
                    <EditorDoneIcon label="" size="small" primaryColor="var(--ds-surface, #FFFFFF)" />
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: compact ? 13 : 14, fontWeight: isSelected ? 600 : 500, color: isSelected ? token('color.text.selected', 'var(--ds-link, #0C66E4)') : token('color.text', 'var(--ds-text, #172B4D)'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.name}
                </div>
                <div style={{ fontSize: compact ? 10 : 11, color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'), marginTop: 1 }}>
                  {b.total} issue{b.total !== 1 ? 's' : ''}{b.inProgress > 0 ? ` · ${b.inProgress} in progress` : ''}
                </div>
              </div>
              {isHovered && (
                <button
                  type="button"
                  aria-label="Remove from standup"
                  title="Remove from standup"
                  onClick={(e) => { e.stopPropagation(); removeFromStandup(b.name); }}
                  style={{ width: 22, height: 22, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, background: 'transparent', cursor: 'pointer', padding: 0 }}
                >
                  <CrossIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon, #44546F)')} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

/* ── Subtle Previous / Next button — white surface, grey border, dark text. ── */
function NavStepBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 30, padding: '0 12px', borderRadius: 4,
        border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
        background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
        fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
        color: disabled ? token('color.text.disabled', 'var(--ds-text-disabled, #8590A2)') : token('color.text', 'var(--ds-text, #172B4D)'),
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('elevation.surface', 'var(--ds-surface, #FFFFFF)'); }}
    >
      {label}
    </button>
  );
}

function CircleBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" aria-label={label} title={label} onClick={onClick}
      style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`, borderRadius: '50%', background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'), cursor: 'pointer', padding: 0 }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('elevation.surface', 'var(--ds-surface, #FFFFFF)'); }}
    >
      {children}
    </button>
  );
}

function IconGhostBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" aria-label={label} title={label} onClick={onClick}
      style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer', padding: 0 }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

/* ── Settings popup — Density / Enable timer / Shuffle / Timer duration. ── */
function SettingsDropdown({
  triggerRef, panelRef, density, onDensity, enableTimer, onEnableTimer, shuffleOnOpen, onShuffle, timerSec, onTimer,
}: {
  triggerRef: React.RefObject<HTMLButtonElement>;
  panelRef: React.RefObject<HTMLDivElement>;
  density: 'default' | 'compact'; onDensity: (d: 'default' | 'compact') => void;
  enableTimer: boolean; onEnableTimer: (v: boolean) => void;
  shuffleOnOpen: boolean; onShuffle: (v: boolean) => void;
  timerSec: number; onTimer: (s: number) => void;
}) {
  const PANEL_W = 300;
  const rect = triggerRef.current?.getBoundingClientRect();
  if (!rect) return null;
  const spaceRight = window.innerWidth - rect.right;
  const left = spaceRight >= PANEL_W + 8 ? rect.right + 8 : Math.max(8, rect.left - PANEL_W - 8);
  const top = Math.min(rect.bottom + 6, window.innerHeight - 8);
  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
      style={{ position: 'fixed', top, left, width: PANEL_W, background: token('elevation.surface.overlay', 'var(--ds-surface, #FFFFFF)'), border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`, borderRadius: 6, padding: '10px 0', zIndex: 10000, boxShadow: token('elevation.shadow.overlay', '0 8px 24px var(--ds-shadow-raised, rgba(9,30,66,0.16))') }}
    >
      <div style={{ padding: '0 14px 8px' }}>
        <SectionLabel>Density</SectionLabel>
        <RadioOption checked={density === 'default'} onSelect={() => onDensity('default')} label="Default" />
        <RadioOption checked={density === 'compact'} onSelect={() => onDensity('compact')} label="Compact" />
      </div>
      <Divider />
      <div style={{ padding: '0 14px 6px' }}>
        <ToggleRow label="Enable timer" value={enableTimer} onChange={onEnableTimer} />
        <ToggleRow label="Shuffle speaker order for every standup" value={shuffleOnOpen} onChange={onShuffle} />
      </div>
      <Divider />
      <div style={{ padding: '0 14px 4px' }}>
        <SectionLabel>Timer duration (min)</SectionLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIMER_OPTIONS_MIN.map((m) => {
            const secs = m * 60;
            const selected = timerSec === secs;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onTimer(secs)}
                style={{
                  minWidth: 40, height: 30, padding: '0 8px', borderRadius: 4,
                  border: `1px solid ${selected ? token('color.border.selected', 'var(--ds-link, #0C66E4)') : token('color.border', 'var(--ds-border, #DFE1E6)')}`,
                  background: selected ? token('color.background.selected', 'var(--ds-background-selected, #E9F2FF)') : token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
                  color: selected ? token('color.text.selected', 'var(--ds-link, #0C66E4)') : token('color.text', 'var(--ds-text, #172B4D)'),
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{children}</div>;
}
function Divider() { return <div style={{ height: 1, background: token('color.border', '#091E4224'), margin: '6px 0' }} />; }

function RadioOption({ checked, onSelect, label }: { checked: boolean; onSelect: () => void; label: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onSelect} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 0', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
// TODO: ads-unmapped — #C1C7D0 context unclear
      <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${checked ? token('color.border.selected', 'var(--ds-link, #0C66E4)') : token('color.border', '#C1C7D0')}`, flexShrink: 0 }}>
        {checked && <span style={{ width: 8, height: 8, borderRadius: '50%', background: token('color.border.selected', 'var(--ds-link, #0C66E4)') }} />}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: token('color.text', 'var(--ds-text, #172B4D)') }}>{label}</span>
    </button>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <span style={{ flex: 1, fontSize: 13, color: token('color.text', 'var(--ds-text, #172B4D)'), lineHeight: '18px' }}>{label}</span>
      <button
        type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', padding: 2, background: value ? token('color.background.success.bold', 'var(--ds-background-success-bold, #1F845A)') : token('color.background.neutral.bold', 'var(--ds-icon, #44546F)'), display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', flexShrink: 0 }}
      >
        {value ? (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, marginLeft: 2 }}><CheckIcon label="" size="small" primaryColor="var(--ds-surface, #FFFFFF)" /></span>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--ds-surface, #FFFFFF)' }} />
          </>
        ) : (
          <>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--ds-surface, #FFFFFF)' }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, marginRight: 2 }}><CrossIcon label="" size="small" primaryColor="var(--ds-surface, #FFFFFF)" /></span>
          </>
        )}
      </button>
    </div>
  );
}
