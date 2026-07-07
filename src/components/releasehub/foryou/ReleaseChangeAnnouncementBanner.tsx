/**
 * ReleaseChangeAnnouncementBanner — the change that matters most to the current
 * user. Two time-driven surfaces, no manual controls:
 *
 *   • ReleaseTimerNavChip  — the DEFAULT. A persistent live-countdown chip in the
 *     global top nav, visible on every page whenever the user has a relevant change.
 *   • The full banner       — auto-appears on the For-You page only inside the
 *     "hero window" (from 1 hour before the planned start through the live window).
 *     Outside that window the banner is absent and only the nav chip shows.
 *
 * Magenta (Catalyst brand) border; status-toned accent rail; canonical lozenges.
 * ADS tokens only.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import { ListChecks } from '@/lib/atlaskit-icons';
import { ChangeStatusLozenge, RiskLozenge } from '@/components/releasehub/shared/ReleaseOpsLozenges';
import { RH } from '@/constants/releasehub.design';
import { useMyExecutionWork, type ChangeCtx, type ExecCard, type MyExecutionWork } from '@/hooks/useMyExecutionWork';

const T = {
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)',
  link: 'var(--ds-text-brand)', icon: 'var(--ds-icon-subtle)', danger: 'var(--ds-text-danger)',
  success: 'var(--ds-text-success)', info: 'var(--ds-text-information)', border: 'var(--ds-border)',
  magenta: 'var(--ds-border-accent-magenta)', raised: 'var(--ds-surface-raised)',
  mono: 'var(--ds-font-family-code, monospace)',
};
const HERO_LEAD_MS = 3600_000; // banner surfaces 1h before planned start
const TERMINAL = ['implemented', 'closed', 'done', 'cancelled'];

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

/**
 * Full banner — mounted on the For-You page. Renders only inside the change's
 * hero window (1h pre-start → live); otherwise null (the nav chip carries it).
 */
export function ReleaseChangeAnnouncementBanner({
  change, assignedCards, moreCount,
}: { change: ChangeCtx; assignedCards: ExecCard[]; moreCount: number }) {
  const navigate = useNavigate();
  if (!inHeroWindow(change, Date.now())) return null;

  const tone = computeTimer(change, Date.now()).tone;
  const open = () => navigate(`/release-hub/changes/${change.slug ?? change.id}`);
  const openSop = () => navigate(`/release-hub/changes/${change.slug ?? change.id}?tab=sop`);
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
      </span>
    </div>
  );
}

/**
 * ReleaseTimerNavChip — the persistent global top-nav timer (default state).
 * Shows on every page whenever the user has a relevant change, EXCEPT on the
 * For-You page during the hero window (where the full banner takes over, so we
 * avoid a duplicate timer). Click → change detail.
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
