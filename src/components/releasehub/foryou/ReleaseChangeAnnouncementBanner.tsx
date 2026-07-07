/**
 * ReleaseChangeAnnouncementBanner — the change that matters most to the current
 * user. Two time-driven surfaces PLUS manual controls on the full banner:
 *
 *   • ReleaseTimerNavChip  — the DEFAULT. A persistent live-countdown chip in the
 *     global top nav, visible on every page whenever the user has a relevant
 *     change (compact dot-only variant on narrow viewports — never fully hidden).
 *   • The full banner       — auto-appears on the For-You page inside the
 *     "hero window" (1h before planned start through the live window), UNLESS
 *     manually collapsed or snoozed (both below). Collapsing/snoozing only
 *     affects the on-page banner — the nav chip keeps showing regardless, so
 *     the SLA signal never fully disappears ("collapse into the top nav bar").
 *
 * Manual controls (persisted in localStorage, per change):
 *   • Collapse → inline mini-timer pill on the page (Expand restores the card)
 *   • Stopwatch icon → Remind panel: quick presets + an Atlassian date-time
 *     chooser (DateTimePicker) for a custom remind-at, plus Collapse / Dismiss.
 *
 * Magenta (Catalyst brand) border; status-toned accent rail; canonical lozenges.
 * ADS tokens only. Countdown text is a throttled aria-live region (state word,
 * not the ticking digits) so assistive tech isn't spammed every second.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import StopwatchIcon from '@atlaskit/icon/core/stopwatch';
import { DateTimePicker } from '@atlaskit/datetime-picker';
import { ListChecks, Minimize2, Maximize2, X } from '@/lib/atlaskit-icons';
import { ChangeStatusLozenge, RiskLozenge } from '@/components/releasehub/shared/ReleaseOpsLozenges';
import { RH } from '@/constants/releasehub.design';
import { useMyExecutionWork, type ChangeCtx, type ExecCard, type MyExecutionWork } from '@/hooks/useMyExecutionWork';

const T = {
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)',
  link: 'var(--ds-text-brand)', icon: 'var(--ds-icon-subtle)', danger: 'var(--ds-text-danger)',
  success: 'var(--ds-text-success)', info: 'var(--ds-text-information)', border: 'var(--ds-border)',
  magenta: 'var(--ds-border-accent-magenta)', raised: 'var(--ds-surface-raised)', hover: 'var(--ds-background-neutral-subtle-hovered)',
  mono: 'var(--ds-font-family-code, monospace)',
};
const HERO_LEAD_MS = 3600_000; // banner surfaces 1h before planned start
const TERMINAL = ['implemented', 'closed', 'done', 'cancelled'];
const COLLAPSE_KEY = 'rb:collapsed';
const snoozeKey = (id: string) => `rb:snooze:${id}`;
const readSnooze = (id: string): number => {
  const v = Number(localStorage.getItem(snoozeKey(id)) ?? 0);
  return Number.isFinite(v) ? v : 0;
};

/** Is a change inside its on-page "hero" window? (1h pre-start → live/overdue, not terminal) */
function inHeroWindow(c: ChangeCtx, now: number): boolean {
  if (TERMINAL.includes(c.status)) return false;
  if (c.running) return true;
  const start = c.plannedStartAt ? new Date(c.plannedStartAt).getTime() : null;
  return start != null && now >= start - HERO_LEAD_MS;
}

function computeTimer(c: ChangeCtx, now: number): { eyebrow: string; big: string; tone: string; pulse: boolean } {
  const pStart = c.plannedStartAt ? new Date(c.plannedStartAt).getTime() : null;
  const pEnd = c.plannedEndAt ? new Date(c.plannedEndAt).getTime() : null;
  const fmtDur = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };
  if (c.running) {
    if (pEnd && now > pEnd) return { eyebrow: 'Live · window overrun', big: `+${fmtDur(now - pEnd)}`, tone: T.danger, pulse: true };
    if (pEnd) return { eyebrow: 'Live · window closes in', big: fmtDur(pEnd - now), tone: T.success, pulse: true };
    return { eyebrow: 'Live · in progress', big: 'Running', tone: T.success, pulse: true };
  }
  if (pStart && now < pStart) return { eyebrow: 'Deployment starts in', big: fmtDur(pStart - now), tone: T.info, pulse: false };
  if (pStart && now >= pStart && !TERMINAL.includes(c.status)) return { eyebrow: 'Window open · overdue', big: `+${fmtDur(now - pStart)}`, tone: T.danger, pulse: true };
  if (pEnd) return { eyebrow: 'Planned window', big: fmtDur(Math.abs(pEnd - now)), tone: T.subtle, pulse: false };
  return { eyebrow: 'No planned window', big: '—', tone: T.subtle, pulse: false };
}

function nextActionText(c: ChangeCtx, cards: ExecCard[]): string {
  if (c.running) return `Running · #${c.running.stepNo} ${c.running.title}`;
  const mine = cards.filter((k) => k.change.id === c.id && (k.step.status === 'pending' || k.step.status === 'ready')).sort((a, b) => a.step.stepNo - b.step.stepNo)[0];
  if (mine) return `Next · #${mine.step.stepNo} ${mine.step.title}`;
  return `SOP ${c.sopDone}/${c.sopTotal} complete`;
}

/** Self-ticking timer — owns its own 1s interval so parents never re-render on the tick. */
function LiveCountdown({ change, variant }: { change: ChangeCtx; variant: 'full' | 'pill' | 'dot' }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const timer = computeTimer(change, now);
  // role=status + aria-label keyed on the STATE word (eyebrow), not the ticking
  // digits — announces "Live" / "window overrun" on real transitions without
  // spamming assistive tech every second. The visible digits are aria-hidden;
  // the label is the accessible equivalent (WCAG 4.1.3 status messages).
  if (variant === 'dot') {
    // Compact/narrow-viewport fallback — no room for digits, so the solid
    // tone-colored dot IS the visible signal; full state+time lives in the
    // parent button's aria-label/title.
    return <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: timer.tone, flexShrink: 0 }} />;
  }
  if (variant === 'pill') {
    return (
      <span role="status" aria-live="polite" aria-label={`${change.chgNumber}: ${timer.eyebrow}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {timer.pulse && <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: timer.tone, flexShrink: 0 }} />}
        <span aria-hidden style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: timer.tone, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{timer.big}</span>
      </span>
    );
  }
  return (
    <span role="status" aria-live="polite" aria-label={timer.eyebrow} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-050)', fontWeight: 600, color: T.subtle, whiteSpace: 'nowrap' }}>
        {timer.pulse && <span style={{ width: 7, height: 7, borderRadius: '50%', background: timer.tone, display: 'inline-block' }} />}{timer.eyebrow}
      </span>
      <span aria-hidden style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: timer.tone, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{timer.big}</span>
    </span>
  );
}

/** Rank every change the user touches → the single most urgent (running first, else soonest start). */
export function pickPrimaryChange(data: MyExecutionWork): { primary: ChangeCtx | null; moreCount: number } {
  const byId = new Map<string, ChangeCtx>();
  for (const c of [...data.dayOfChanges, ...data.assignedCards.map((k) => k.change), ...data.managedChanges]) {
    if (!byId.has(c.id)) byId.set(c.id, c);
  }
  const changes = Array.from(byId.values());
  if (changes.length === 0) return { primary: null, moreCount: 0 };
  const startMs = (c: ChangeCtx) => (c.plannedStartAt ? new Date(c.plannedStartAt).getTime() : Number.MAX_SAFE_INTEGER);
  changes.sort((a, b) => { const ar = a.running ? 0 : 1, br = b.running ? 0 : 1; return ar !== br ? ar - br : startMs(a) - startMs(b); });
  return { primary: changes[0], moreCount: changes.length - 1 };
}

const isForYouRoute = (path: string) => path === '/' || path === '/for-you' || path.startsWith('/for-you/');

const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
  borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: T.icon, padding: 0,
};

function MenuRow({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
        padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
        background: hover ? T.hover : 'transparent', color: danger ? T.danger : T.text,
        fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
      }}
    >
      <span style={{ display: 'inline-flex', color: danger ? T.danger : T.icon }}>{icon}</span>{label}
    </button>
  );
}

function PresetChip({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}
      style={{
        flex: 1, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, cursor: 'pointer',
        background: hover ? T.hover : 'transparent', color: T.text,
        fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, whiteSpace: 'nowrap',
      }}
    >{label}</button>
  );
}

/**
 * Full banner — mounted on the For-You page. Auto-shows only inside the hero
 * window; a manual collapse or an active snooze suppresses it independently
 * (the nav chip keeps showing either way).
 */
export function ReleaseChangeAnnouncementBanner({
  change, assignedCards, moreCount,
}: { change: ChangeCtx; assignedCards: ExecCard[]; moreCount: number }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [snoozedUntil, setSnoozedUntil] = useState<number>(() => readSnooze(change.id));
  const [remindOpen, setRemindOpen] = useState(false);
  const [pickIso, setPickIso] = useState<string>(() => new Date(Date.now() + 3600_000).toISOString());
  const remindRef = useRef<HTMLSpanElement>(null);

  useEffect(() => { setSnoozedUntil(readSnooze(change.id)); }, [change.id]);
  // Close the reminders panel on outside click — but ignore clicks inside the
  // DateTimePicker's own portal (its calendar/time menus render to body).
  useEffect(() => {
    if (!remindOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (remindRef.current?.contains(t)) return;
      if (t.closest('.atlaskit-portal, .atlaskit-portal-container, [data-ds--level]')) return;
      setRemindOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [remindOpen]);

  if (!inHeroWindow(change, Date.now())) return null;
  if (snoozedUntil && Date.now() < snoozedUntil) return null;

  const tone = computeTimer(change, Date.now()).tone;
  const open = () => navigate(`/release-hub/changes/${change.slug ?? change.id}`);
  const openSop = () => navigate(`/release-hub/changes/${change.slug ?? change.id}?tab=sop`);
  const setCollapse = (v: boolean) => { setCollapsed(v); localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); };
  const snoozeUntil = (until: number) => {
    if (!until || until <= Date.now()) return;
    localStorage.setItem(snoozeKey(change.id), String(until));
    setSnoozedUntil(until); setRemindOpen(false);
  };
  const HOUR = 3600_000;
  const tomorrow9 = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.getTime(); };

  const remindPopup = (
    <span ref={remindRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        aria-label="Reminders and options"
        onClick={(e) => { e.stopPropagation(); setRemindOpen((o) => !o); }}
        style={{ ...iconBtn, background: remindOpen ? T.hover : 'transparent', color: remindOpen ? T.text : T.icon }}
      >
        <StopwatchIcon label="" color="currentColor" />
      </button>
      {remindOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60, width: 300, padding: 12,
            display: 'flex', flexDirection: 'column', gap: 8, background: T.raised,
            border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: 'var(--ds-shadow-overlay)',
          }}
        >
          <div role="heading" aria-level={3} style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: T.text, padding: '0 4px' }}>Remind me</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <PresetChip label="1 hour" onClick={() => snoozeUntil(Date.now() + HOUR)} />
            <PresetChip label="4 hours" onClick={() => snoozeUntil(Date.now() + 4 * HOUR)} />
            <PresetChip label="Tomorrow" onClick={() => snoozeUntil(tomorrow9())} />
          </div>
          <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle, padding: '0 4px' }}>Or pick a date &amp; time</div>
          <DateTimePicker defaultValue={pickIso} onChange={(v: string) => setPickIso(v)} />
          <button
            onClick={() => pickIso && snoozeUntil(new Date(pickIso).getTime())}
            disabled={!pickIso}
            style={{ height: 36, borderRadius: 8, border: 'none', cursor: pickIso ? 'pointer' : 'not-allowed', background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, opacity: pickIso ? 1 : 0.5 }}
          >Set reminder</button>
          <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
          <MenuRow icon={<Minimize2 size={16} />} label="Collapse to timer" onClick={() => { setRemindOpen(false); setCollapse(true); }} />
          <MenuRow icon={<X size={16} />} label="Dismiss for this change" danger onClick={() => snoozeUntil(Date.now() + 365 * 24 * HOUR)} />
        </div>
      )}
    </span>
  );

  // ── Collapsed: premium mini-timer pill (inline, on-page). The nav chip
  // keeps showing regardless — collapsing "sends" the SLA signal up to the
  // top nav bar rather than hiding it outright.
  if (collapsed) {
    return (
      <div
        role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 8px 8px 12px', borderRadius: 999,
          border: `1px solid ${T.magenta}`,
          background: 'linear-gradient(90deg, var(--ds-surface-raised) 0%, var(--ds-background-information) 100%)',
          boxShadow: 'var(--ds-shadow-raised)',
        }}
      >
        <LiveCountdown change={change} variant="pill" />
        <span aria-hidden style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.link, whiteSpace: 'nowrap' }}>{change.chgNumber}</span>
        <span aria-hidden style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{change.title}</span>
        <button aria-label="Expand banner" style={iconBtn} onClick={(e) => { e.stopPropagation(); setCollapse(false); }}><Maximize2 size={15} /></button>
      </div>
    );
  }

  // ── Expanded: full banner ──
  const action = nextActionText(change, assignedCards);
  return (
    <div
      role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'stretch', borderRadius: 12,
        border: `1px solid ${T.magenta}`,
        background: 'linear-gradient(90deg, var(--ds-surface-raised) 0%, var(--ds-background-information) 100%)',
        boxShadow: 'var(--ds-shadow-raised)',
      }}
    >
      <span style={{ width: 4, flexShrink: 0, background: tone, borderRadius: '11px 0 0 11px' }} aria-hidden />

      {/* identity */}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 16px', minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-050)', fontWeight: 700, letterSpacing: '.08em', color: T.subtlest, textTransform: 'uppercase' as const }}>Change execution</span>
          <ChangeStatusLozenge status={change.status} />
          <RiskLozenge risk={change.risk} />
        </span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.link, flexShrink: 0 }}>{change.chgNumber}</span>
          <span style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{change.title}</span>
        </span>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {(change.releaseNames[0] ?? (change.isUnlinkedProduction ? 'Unlinked production' : 'No release'))} · {change.targetEnv ?? '—'} · {action}{moreCount > 0 ? ` · +${moreCount} more` : ''}
        </span>
      </span>

      {/* countdown */}
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 4, padding: '16px 24px', flexShrink: 0, borderLeft: `1px solid ${T.border}` }}>
        <LiveCountdown change={change} variant="full" />
      </span>

      {/* actions */}
      <span onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', flexShrink: 0, borderLeft: `1px solid ${T.border}` }}>
        <button onClick={openSop} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.raised, cursor: 'pointer', color: T.text, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>
          <ListChecks size={16} /> SOP
        </button>
        <button onClick={open} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: T.link, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>
          Open change <ArrowRightIcon label="" size="small" />
        </button>
        {remindPopup}
        <button aria-label="Collapse to timer" style={iconBtn} onClick={() => setCollapse(true)}><Minimize2 size={16} /></button>
      </span>
    </div>
  );
}

/**
 * ReleaseTimerNavChip — the persistent global top-nav timer (default state).
 * Shows on every page whenever the user has a relevant change, EXCEPT on the
 * For-You page during the hero window (where the full banner takes over, so we
 * avoid a duplicate timer). Click → change detail. On narrow viewports renders
 * a compact dot-only variant instead of disappearing.
 */
export function ReleaseTimerNavChip({ compact = false }: { compact?: boolean } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useMyExecutionWork();
  if (!data) return null;
  const { primary } = pickPrimaryChange(data);
  if (!primary) return null;
  if (isForYouRoute(location.pathname) && inHeroWindow(primary, Date.now())) return null;

  const open = () => navigate(`/release-hub/changes/${primary.slug ?? primary.id}`);
  const label = `${primary.chgNumber} · ${primary.title}`;

  // Narrow viewports (mobile/on-call): shed the text, keep a compact dot so the
  // SLA signal is never fully invisible to the audience that most needs it.
  if (compact) {
    return (
      <button
        onClick={open}
        aria-label={label}
        title={label}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, flexShrink: 0,
          borderRadius: '50%', border: `1px solid ${T.magenta}`, cursor: 'pointer', padding: 0,
          background: 'linear-gradient(135deg, var(--ds-surface-raised) 0%, var(--ds-background-information) 100%)',
        }}
      >
        <LiveCountdown change={primary} variant="dot" />
      </button>
    );
  }

  return (
    <button
      onClick={open}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px', borderRadius: 999,
        border: `1px solid ${T.magenta}`, cursor: 'pointer', maxWidth: 260,
        background: 'linear-gradient(90deg, var(--ds-surface-raised) 0%, var(--ds-background-information) 100%)',
        boxShadow: 'var(--ds-shadow-raised)',
      }}
    >
      <LiveCountdown change={primary} variant="pill" />
      <span aria-hidden style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.link, whiteSpace: 'nowrap' }}>{primary.chgNumber}</span>
    </button>
  );
}

export default ReleaseChangeAnnouncementBanner;
