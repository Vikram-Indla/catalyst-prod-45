/**
 * ReleaseChangeAnnouncementBanner — the change that matters most to the current
 * user, rendered at one of three sizes depending on time + an explicit dismiss:
 *
 *   • On the For-You page, size is TIME-DRIVEN and automatic:
 *       - outside the "hero window" → compact on-page pill (key + truncated title)
 *       - inside the hero window (1h before planned start through live/overrun)
 *         → full card (badges, labeled Release/Release#/Env fields, running-step
 *         owner avatar, SOP + Open change actions, countdown)
 *   • Dismissing (collapse icon on either on-page state, or the Remind panel's
 *     "Collapse to timer" row) hides the on-page element entirely and hands the
 *     signal to ReleaseTimerNavChip, the persistent chip in the global top nav
 *     (compact dot-only variant on narrow viewports). Clicking the nav chip
 *     while dismissed and already on the For-You page un-dismisses back to the
 *     time-correct on-page size instead of navigating away.
 *   • Snoozing (via the Remind panel) hides the on-page element for a duration
 *     regardless of window/dismiss state; the nav chip keeps showing regardless
 *     of any of the above, so the SLA signal never fully disappears.
 *
 * The banner and nav chip are separate mounts (page vs header) that only share
 * localStorage, so the dismiss flag is synced same-tab via a custom event.
 *
 * Real @atlaskit/button (Button/IconButton) + canonical lozenges/avatar only —
 * no hand-rolled buttons, no gradients. Magenta (Catalyst brand) border; flat
 * ADS surface; status-toned accent rail. Countdown text is a throttled
 * aria-live region (state word, not the ticking digits) so assistive tech
 * isn't spammed every second.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import StopwatchIcon from '@atlaskit/icon/core/stopwatch';
import Button, { IconButton } from '@atlaskit/button/new';
import { DateTimePicker } from '@atlaskit/datetime-picker';
import { ListChecks, Minimize2, X, Calendar, ChevronDown, ChevronUp } from '@/lib/atlaskit-icons';
import { ChangeStatusLozenge, RiskLozenge } from '@/components/releasehub/shared/ReleaseOpsLozenges';
import { CatalystOwnerAvatar } from '@/components/ui/catalyst';
import { RH } from '@/constants/releasehub.design';
import { useMyExecutionWork, type ChangeCtx, type ExecCard, type MyExecutionWork } from '@/hooks/useMyExecutionWork';

const T = {
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)',
  link: 'var(--ds-text-brand)', icon: 'var(--ds-icon-subtle)', danger: 'var(--ds-text-danger)',
  success: 'var(--ds-text-success)', info: 'var(--ds-text-information)', border: 'var(--ds-border)',
  magenta: 'var(--ds-border-accent-magenta)', raised: 'var(--ds-surface-raised)',
};
const HERO_LEAD_MS = 3600_000; // banner surfaces 1h before planned start
const TERMINAL = ['implemented', 'closed', 'done', 'cancelled'];
// "Dismissed" sends the on-page presence (pill or full card) up to the global
// nav chip entirely — distinct from the time-driven pill/card size choice.
const DISMISS_KEY = 'rb:dismissed';
const DISMISS_EVENT = 'rb:dismissed-changed';
const readDismissed = (): boolean => localStorage.getItem(DISMISS_KEY) === '1';
const writeDismissed = (v: boolean) => {
  localStorage.setItem(DISMISS_KEY, v ? '1' : '0');
  window.dispatchEvent(new Event(DISMISS_EVENT));
};
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

/** Self-ticking timer — owns its own 1s interval so parents never re-render on the tick.
 *  One font family throughout (tabular numerals, no monospace) so the digits sit in the
 *  same type system as the rest of the card. */
function LiveCountdown({ change, variant }: { change: ChangeCtx; variant: 'full' | 'card' | 'pill' | 'dot' }) {
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
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: timer.tone, flexShrink: 0 }} />
        <span aria-hidden style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{timer.big}</span>
      </span>
    );
  }
  // 'card' = compact on-page card (smaller digits); 'full' = expanded card.
  const bigSize = variant === 'card' ? 'var(--ds-font-size-300)' : 'var(--ds-font-size-400)';
  return (
    <span role="status" aria-live="polite" aria-label={timer.eyebrow} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: timer.tone, whiteSpace: 'nowrap' }}>
        {timer.pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: timer.tone, display: 'inline-block' }} />}{timer.eyebrow}
      </span>
      <span aria-hidden style={{ fontFamily: RH.fontBody, fontSize: bigSize, fontWeight: 600, color: timer.tone, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{timer.big}</span>
    </span>
  );
}

/** "Tue 8 Jul · 14:00–16:00" from the planned window — the execution date, first-class. */
function fmtWindow(startIso: string | null, endIso: string | null): string | null {
  if (!startIso) return null;
  const s = new Date(startIso);
  if (Number.isNaN(s.getTime())) return null;
  const day = s.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  const hm = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const e = endIso ? new Date(endIso) : null;
  return `${day} · ${hm(s)}${e && !Number.isNaN(e.getTime()) ? `–${hm(e)}` : ''}`;
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

/** Field-grid cell: muted label over value — the memo layout of the expanded card. */
function GridField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.text, minWidth: 0 }}>{children}</span>
    </span>
  );
}

/** Executor face avatar — canonical CatalystOwnerAvatar at its "lg" (32px) size. */
function ExecutorAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  return <CatalystOwnerAvatar type="human" name={name ?? undefined} avatarUrl={avatarUrl ?? undefined} size="lg" showTooltip />;
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
  const [dismissed, setDismissedState] = useState<boolean>(() => readDismissed());
  const [snoozedUntil, setSnoozedUntil] = useState<number>(() => readSnooze(change.id));
  const [remindOpen, setRemindOpen] = useState(false);
  // Session-only manual size override — chevron toggles; time decides when null.
  const [sizeOverride, setSizeOverride] = useState<'expanded' | 'compact' | null>(null);
  const [pickIso, setPickIso] = useState<string>(() => new Date(Date.now() + 3600_000).toISOString());
  const remindRef = useRef<HTMLSpanElement>(null);

  useEffect(() => { setSnoozedUntil(readSnooze(change.id)); }, [change.id]);
  // Nav chip and banner are separate mounts (header vs page) sharing only
  // localStorage — sync via a same-tab custom event (storage events don't fire
  // in the tab that wrote the value).
  useEffect(() => {
    const onDismissChange = () => setDismissedState(readDismissed());
    window.addEventListener(DISMISS_EVENT, onDismissChange);
    return () => window.removeEventListener(DISMISS_EVENT, onDismissChange);
  }, []);
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

  if (dismissed) return null;
  if (snoozedUntil && Date.now() < snoozedUntil) return null;

  const inWindow = inHeroWindow(change, Date.now());
  const tone = computeTimer(change, Date.now()).tone;
  const open = () => navigate(`/release-hub/changes/${change.slug ?? change.id}`);
  const openSop = () => navigate(`/release-hub/changes/${change.slug ?? change.id}?tab=sop`);
  const dismiss = () => { writeDismissed(true); setDismissedState(true); };
  const snoozeUntil = (until: number) => {
    if (!until || until <= Date.now()) return;
    localStorage.setItem(snoozeKey(change.id), String(until));
    setSnoozedUntil(until); setRemindOpen(false);
  };
  const HOUR = 3600_000;
  const tomorrow9 = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.getTime(); };

  const remindPopup = (
    <span ref={remindRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <IconButton
        label="Reminders and options"
        appearance="subtle"
        isSelected={remindOpen}
        icon={(p) => <StopwatchIcon {...p} label="" />}
        onClick={(e) => { e.stopPropagation(); setRemindOpen((o) => !o); }}
      />
      {remindOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60, width: 300, padding: 12,
            display: 'flex', flexDirection: 'column', gap: 8, background: T.raised,
            border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: 'var(--ds-shadow-overlay)',
          }}
        >
          <div role="heading" aria-level={3} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text, padding: '0 4px' }}>Remind me</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ flex: 1 }}><Button shouldFitContainer appearance="default" onClick={() => snoozeUntil(Date.now() + HOUR)}>1 hour</Button></span>
            <span style={{ flex: 1 }}><Button shouldFitContainer appearance="default" onClick={() => snoozeUntil(Date.now() + 4 * HOUR)}>4 hours</Button></span>
            <span style={{ flex: 1 }}><Button shouldFitContainer appearance="default" onClick={() => snoozeUntil(tomorrow9())}>Tomorrow</Button></span>
          </div>
          <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle, padding: '0 4px' }}>Or pick a date &amp; time</div>
          <DateTimePicker defaultValue={pickIso} onChange={(v: string) => setPickIso(v)} />
          <Button shouldFitContainer appearance="primary" isDisabled={!pickIso} onClick={() => pickIso && snoozeUntil(new Date(pickIso).getTime())}>Set reminder</Button>
          <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
          <Button shouldFitContainer appearance="subtle" iconBefore={(p) => <Minimize2 {...p} size={16} />} onClick={() => { setRemindOpen(false); dismiss(); }}>Collapse to timer</Button>
          <Button shouldFitContainer appearance="subtle" iconBefore={(p) => <X {...p} size={16} />} onClick={() => snoozeUntil(Date.now() + 365 * 24 * HOUR)}>Dismiss for this change</Button>
        </div>
      )}
    </span>
  );

  // Time drives the default size (compact outside the window, expanded inside);
  // the chevron is a manual session-only override in either direction.
  const showFull = sizeOverride ? sizeOverride === 'expanded' : inWindow;
  const action = nextActionText(change, assignedCards);
  const primaryRelease = change.releases[0];
  const windowText = fmtWindow(change.plannedStartAt, change.plannedEndAt);
  const releaseText = primaryRelease?.name ?? (change.isUnlinkedProduction ? 'Unlinked production' : 'No release');

  const shell: React.CSSProperties = {
    width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'stretch',
    borderRadius: 8, border: `1px solid ${T.border}`, background: T.raised, boxShadow: 'var(--ds-shadow-raised)', overflow: 'hidden',
  };
  const rail = <span style={{ width: 3, flexShrink: 0, background: tone }} aria-hidden />;
  const keyEl = <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: T.link, flexShrink: 0 }}>{change.chgNumber}</span>;

  // ── Compact (default): one row, everything present — date, release, env,
  // executor avatar, live countdown. Half the vertical cost of the full card. ──
  if (!showFull) {
    return (
      <div role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open(); }} style={shell}>
        {rail}
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', minWidth: 0, flex: 1 }}>
          <ExecutorAvatar name={change.running?.ownerName ?? null} avatarUrl={change.runningOwnerAvatarUrl} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {keyEl}
              <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{change.title}</span>
              <ChangeStatusLozenge status={change.status} />
              <RiskLozenge risk={change.risk} />
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap', overflow: 'hidden', minWidth: 0 }}>
              {windowText && (
                <>
                  <span style={{ display: 'inline-flex', color: T.icon, flexShrink: 0 }}><Calendar size={14} /></span>
                  <span style={{ color: T.text, fontWeight: 600 }}>{windowText}</span>
                  <span>·</span>
                </>
              )}
              <span>{releaseText}{primaryRelease?.number ? ` (${primaryRelease.number})` : ''}</span>
              <span>·</span><span>{change.targetEnv ?? '—'}</span>
              <span>·</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{action}{moreCount > 0 ? ` · +${moreCount} more` : ''}</span>
            </span>
          </span>
          <LiveCountdown change={change} variant="card" />
        </span>
        <span onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', paddingRight: 8 }}>
          <IconButton label="Expand change card" appearance="subtle" icon={(p) => <ChevronDown {...p} size={16} />} onClick={() => setSizeOverride('expanded')} />
        </span>
      </div>
    );
  }

  // ── Expanded (auto during the change window): header + labeled field grid +
  // SOP progress and actions. ──
  return (
    <div role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open(); }} style={shell}>
      {rail}
      <span style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', minWidth: 0, flex: 1 }}>
        {/* header: key · title · lozenges ·· countdown */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {keyEl}
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{change.title}</span>
          <ChangeStatusLozenge status={change.status} />
          <RiskLozenge risk={change.risk} />
          <span style={{ flex: 1 }} />
          <LiveCountdown change={change} variant="full" />
        </span>

        {/* labeled field grid — the memo */}
        <span style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, margin: '12px 0', padding: '12px 0', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          <GridField label="Window">{windowText ?? '—'}</GridField>
          <GridField label="Release">
            {releaseText}
            {primaryRelease?.number && <span style={{ color: T.subtle, fontWeight: 400 }}> {primaryRelease.number}</span>}
          </GridField>
          <GridField label="Environment">{change.targetEnv ?? '—'}</GridField>
          <GridField label={change.running ? 'Executing now' : 'Next up'}>
            {change.running ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <ExecutorAvatar name={change.running.ownerName} avatarUrl={change.runningOwnerAvatarUrl} />
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{change.running.ownerName ?? 'Unassigned'}</span>
                  <span style={{ color: T.subtle, fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>#{change.running.stepNo} {change.running.title}</span>
                </span>
              </span>
            ) : (
              <span style={{ color: T.subtle, fontWeight: 400 }}>{action}</span>
            )}
          </GridField>
        </span>

        {/* footer: SOP progress + actions */}
        <span onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle, minWidth: 0 }}>
            <span style={{ whiteSpace: 'nowrap' }}>SOP {change.sopDone} of {change.sopTotal}</span>
            <span aria-hidden style={{ flex: 1, maxWidth: 160, height: 4, background: 'var(--ds-background-neutral)', borderRadius: 2, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: `${change.sopTotal > 0 ? Math.round((change.sopDone / change.sopTotal) * 100) : 0}%`, height: '100%', background: 'var(--ds-background-brand-bold)' }} />
            </span>
            {moreCount > 0 && <span style={{ whiteSpace: 'nowrap' }}>+{moreCount} more</span>}
          </span>
          <Button appearance="default" iconBefore={(p) => <ListChecks {...p} size={16} />} onClick={openSop}>View SOP</Button>
          <Button appearance="subtle" iconAfter={ArrowRightIcon} onClick={open}>Open change</Button>
          {remindPopup}
          <IconButton label="Send to top bar" appearance="subtle" icon={(p) => <Minimize2 {...p} size={16} />} onClick={dismiss} />
          <IconButton label="Collapse change card" appearance="subtle" icon={(p) => <ChevronUp {...p} size={16} />} onClick={() => setSizeOverride('compact')} />
        </span>
      </span>
    </div>
  );
}

/**
 * ReleaseTimerNavChip — the persistent global top-nav timer. Shows on every
 * page whenever the user has a relevant change, EXCEPT on the For-You page
 * while the on-page pill/full-card is showing there (avoids a duplicate
 * timer) — unless the user has explicitly dismissed the on-page element, in
 * which case the chip is the only remaining surface and must show there too.
 * Clicking it normally opens the change; on the For-You page while dismissed,
 * it instead un-dismisses back to the time-correct on-page size. On narrow
 * viewports renders a compact dot-only variant instead of disappearing.
 */
export function ReleaseTimerNavChip({ compact = false }: { compact?: boolean } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useMyExecutionWork();
  const [dismissed, setDismissedState] = useState<boolean>(() => readDismissed());

  useEffect(() => {
    const onDismissChange = () => setDismissedState(readDismissed());
    window.addEventListener(DISMISS_EVENT, onDismissChange);
    return () => window.removeEventListener(DISMISS_EVENT, onDismissChange);
  }, []);

  if (!data) return null;
  const { primary } = pickPrimaryChange(data);
  if (!primary) return null;
  const onForYou = isForYouRoute(location.pathname);
  if (onForYou && !dismissed) return null;

  const label = `${primary.chgNumber} · ${primary.title}`;
  const handleClick = () => {
    if (onForYou && dismissed) { writeDismissed(false); setDismissedState(false); return; }
    navigate(`/release-hub/changes/${primary.slug ?? primary.id}`);
  };

  // Narrow viewports (mobile/on-call): shed the text, keep a compact dot so the
  // SLA signal is never fully invisible to the audience that most needs it.
  if (compact) {
    return (
      <button
        onClick={handleClick}
        aria-label={label}
        title={label}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, flexShrink: 0,
          borderRadius: '50%', border: `1px solid ${T.border}`, cursor: 'pointer', padding: 0, background: T.raised,
        }}
      >
        <LiveCountdown change={primary} variant="dot" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px', borderRadius: 999,
        border: `1px solid ${T.border}`, cursor: 'pointer', maxWidth: 260, background: T.raised,
      }}
    >
      <LiveCountdown change={primary} variant="pill" />
      <span aria-hidden style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: T.subtle, whiteSpace: 'nowrap' }}>{primary.chgNumber}</span>
    </button>
  );
}

export default ReleaseChangeAnnouncementBanner;
