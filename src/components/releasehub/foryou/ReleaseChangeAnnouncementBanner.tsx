/**
 * ReleaseChangeAnnouncementBanner — the single, sleek For-You announcement for
 * the change that matters most to the current user right now. Replaces the old
 * card stack: ONE slim, countdown-driven enterprise banner (live timer + next
 * action + one CTA). Clicking routes into the Release Hub change detail, where
 * the full SOP actions live. ADS tokens only; canonical status/risk lozenges.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import { ChangeStatusLozenge, RiskLozenge } from '@/components/releasehub/shared/ReleaseOpsLozenges';
import { RH } from '@/constants/releasehub.design';
import type { ChangeCtx, ExecCard } from '@/hooks/useMyExecutionWork';

const T = {
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)',
  inverse: 'var(--ds-text-inverse)', link: 'var(--ds-text-brand)',
  danger: 'var(--ds-text-danger)', success: 'var(--ds-text-success)', info: 'var(--ds-text-information)',
  mono: 'var(--ds-font-family-code, monospace)',
};

/** Two-part countdown target derived from the change window + live SOP state. */
function computeTimer(c: ChangeCtx, now: number): { eyebrow: string; big: string; tone: string; pulse: boolean } {
  const pStart = c.plannedStartAt ? new Date(c.plannedStartAt).getTime() : null;
  const pEnd = c.plannedEndAt ? new Date(c.plannedEndAt).getTime() : null;
  const running = !!c.running;

  const fmtDur = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  if (running) {
    if (pEnd && now > pEnd) return { eyebrow: 'Live · window overrun', big: `+${fmtDur(now - pEnd)}`, tone: T.danger, pulse: true };
    if (pEnd) return { eyebrow: 'Live · window closes in', big: fmtDur(pEnd - now), tone: T.success, pulse: true };
    return { eyebrow: 'Live · in progress', big: 'Running', tone: T.success, pulse: true };
  }
  if (pStart && now < pStart) return { eyebrow: 'Deployment starts in', big: fmtDur(pStart - now), tone: T.info, pulse: false };
  if (pStart && now >= pStart && !['implemented', 'closed', 'done'].includes(c.status)) {
    return { eyebrow: 'Window open · overdue', big: `+${fmtDur(now - pStart)}`, tone: T.danger, pulse: true };
  }
  if (pEnd) return { eyebrow: 'Planned window', big: fmtDur(Math.abs(pEnd - now)), tone: T.subtle, pulse: false };
  return { eyebrow: 'No planned window', big: '—', tone: T.subtle, pulse: false };
}

function nextActionText(c: ChangeCtx, cards: ExecCard[]): string {
  if (c.running) return `Running · #${c.running.stepNo} ${c.running.title}`;
  const mine = cards
    .filter((k) => k.change.id === c.id && (k.step.status === 'pending' || k.step.status === 'ready'))
    .sort((a, b) => a.step.stepNo - b.step.stepNo)[0];
  if (mine) return `Next · #${mine.step.stepNo} ${mine.step.title}`;
  return `SOP ${c.sopDone}/${c.sopTotal} complete`;
}

export function ReleaseChangeAnnouncementBanner({
  change, assignedCards, moreCount,
}: { change: ChangeCtx; assignedCards: ExecCard[]; moreCount: number }) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const timer = computeTimer(change, now);
  const action = nextActionText(change, assignedCards);
  const open = () => navigate(`/release-hub/changes/${change.slug ?? change.id}`);

  return (
    <button
      onClick={open}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'stretch',
        gap: 0, padding: 0, borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${change.isEmergency || change.freezeConflict ? 'var(--ds-border-danger)' : 'var(--ds-border)'}`,
        background: 'linear-gradient(90deg, var(--ds-surface-raised) 0%, var(--ds-background-information) 100%)',
        boxShadow: 'var(--ds-shadow-raised)',
      }}
    >
      {/* status accent rail */}
      <span style={{ width: 4, flexShrink: 0, background: timer.tone }} aria-hidden />

      {/* identity block */}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 16px', minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-050)', fontWeight: 700, letterSpacing: '.08em', color: T.subtlest, textTransform: 'uppercase' as const }}>
            Change execution
          </span>
          <ChangeStatusLozenge status={change.status} />
          <RiskLozenge risk={change.risk} />
        </span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.link, flexShrink: 0 }}>{change.chgNumber}</span>
          <span style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{change.title}</span>
        </span>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {(change.releaseNames[0] ?? (change.isUnlinkedProduction ? 'Unlinked production' : 'No release'))} · {change.targetEnv ?? '—'} · {action}
          {moreCount > 0 ? ` · +${moreCount} more` : ''}
        </span>
      </span>

      {/* live countdown */}
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 4, padding: '16px 24px', flexShrink: 0, borderLeft: '1px solid var(--ds-border)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-050)', fontWeight: 600, color: T.subtle, whiteSpace: 'nowrap' }}>
          {timer.pulse && <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: timer.tone, display: 'inline-block' }} />}
          {timer.eyebrow}
        </span>
        <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: timer.tone, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
          {timer.big}
        </span>
      </span>

      {/* CTA */}
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', flexShrink: 0, gap: 8, color: T.link, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, borderLeft: '1px solid var(--ds-border)' }}>
        Open change
        <ArrowRightIcon label="" size="small" />
      </span>
    </button>
  );
}

export default ReleaseChangeAnnouncementBanner;
