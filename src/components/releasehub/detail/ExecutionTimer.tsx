/**
 * ExecutionTimer — Phase 3 data-driven change execution timer summary.
 *
 * Primary placement: Change Detail. Derives entirely from change/SOP timing
 * data — never fakes state. States: upcoming (countdown to planned start),
 * running (elapsed + remaining vs planned end, overrun if late), completed,
 * blocked, failed. The same model is reused (secondary) on For You later.
 * ADS tokens only.
 */
import React, { useEffect, useState } from 'react';
import { RH } from '@/constants/releasehub.design';

const T = {
  card: 'var(--ds-surface-raised)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  danger: 'var(--ds-text-danger)',
  warning: 'var(--ds-text-warning)',
  success: 'var(--ds-text-success)',
  info: 'var(--ds-text-information)',
  dangerBg: 'var(--ds-background-danger)',
  warningBg: 'var(--ds-background-warning)',
  successBg: 'var(--ds-background-success)',
  infoBg: 'var(--ds-background-information)',
  neutralBg: 'var(--ds-background-neutral)',
};

type Kind = 'upcoming' | 'running' | 'overrun' | 'completed' | 'blocked' | 'failed' | 'none';

function fmtDur(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export interface ExecutionTimerProps {
  status: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  runningStep?: { title: string; role: string | null } | null;
  runningStepPlannedEnd?: string | null;
}

export function ExecutionTimer(p: ExecutionTimerProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const pStart = p.plannedStartAt ? new Date(p.plannedStartAt).getTime() : null;
  const pEnd = p.plannedEndAt ? new Date(p.plannedEndAt).getTime() : null;
  const aStart = p.actualStartAt ? new Date(p.actualStartAt).getTime() : null;
  const aEnd = p.actualEndAt ? new Date(p.actualEndAt).getTime() : null;

  let kind: Kind = 'none';
  let primary = '—';
  let secondary = '';

  if (p.status === 'failed' || p.status === 'rolled_back') {
    kind = 'failed'; primary = 'Execution failed';
    secondary = aStart ? `Ran ${fmtDur((aEnd ?? now) - aStart)}` : '';
  } else if (p.status === 'blocked') {
    kind = 'blocked'; primary = 'Blocked'; secondary = 'Execution paused — see blocker reason';
  } else if (aEnd || p.status === 'implemented' || p.status === 'closed') {
    kind = 'completed'; primary = 'Completed';
    secondary = aStart && aEnd ? `Took ${fmtDur(aEnd - aStart)}` : '';
  } else if (aStart) {
    // running
    const overrun = pEnd != null && now > pEnd;
    kind = overrun ? 'overrun' : 'running';
    primary = overrun ? `Overrun +${fmtDur(now - pEnd!)}` : (pEnd ? `${fmtDur(pEnd - now)} remaining` : 'Running');
    secondary = `Elapsed ${fmtDur(now - aStart)}${p.runningStep ? ` · ${p.runningStep.title}` : ''}`;
  } else if (pStart) {
    if (now < pStart) { kind = 'upcoming'; primary = `Starts in ${fmtDur(pStart - now)}`; secondary = 'Planned window not started'; }
    else { kind = 'overrun'; primary = `Window started ${fmtDur(now - pStart)} ago`; secondary = 'Not marked started — execution overdue'; }
  } else {
    kind = 'none'; primary = 'No planned window'; secondary = 'Set a planned execution window on the change';
  }

  const palette: Record<Kind, { fg: string; bg: string }> = {
    upcoming: { fg: T.info, bg: T.infoBg },
    running: { fg: T.success, bg: T.successBg },
    overrun: { fg: T.danger, bg: T.dangerBg },
    completed: { fg: T.success, bg: T.successBg },
    blocked: { fg: T.warning, bg: T.warningBg },
    failed: { fg: T.danger, bg: T.dangerBg },
    none: { fg: T.subtle, bg: T.neutralBg },
  };
  const c = palette[kind];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '14px 16px' }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.fg, flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: c.fg }}>{primary}</div>
        {secondary && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, marginTop: 2 }}>{secondary}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, textTransform: 'uppercase', letterSpacing: '.04em' }}>Planned end</div>
        <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text }}>{pEnd ? new Date(pEnd).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
      </div>
    </div>
  );
}

export default ExecutionTimer;
