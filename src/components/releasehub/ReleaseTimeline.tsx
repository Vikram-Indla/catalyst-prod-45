import React, { useMemo } from 'react';
import { format, startOfDay, addDays, differenceInDays } from 'date-fns';
import { useReleasePortfolio } from '@/hooks/useReleasePortfolio';
import { useFreezeWindowsList } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { type ReleaseConfidence } from '@/lib/releasehub/releaseConfidence';

const T = {
  card: 'var(--ds-surface-raised, #FFFFFF)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  bgNeutral: 'var(--ds-background-neutral, #F1F2F4)',
  link: 'var(--ds-link, #0C66E4)',
  success: 'var(--ds-border-success, #4BCE97)',
  warning: 'var(--ds-border-warning, #E2B203)',
  danger: 'var(--ds-text-danger, #AE2A19)',
  dangerBg: 'var(--ds-background-danger, rgba(174,42,25,0.10))',
  dangerBorder: 'var(--ds-border-danger, rgba(174,42,25,0.35))',
};

const CONF_DOT: Record<ReleaseConfidence, string> = {
  high:     'var(--ds-icon-success, #22A06B)',
  medium:   'var(--ds-icon-warning, #E2B203)',
  low:      'var(--ds-icon-danger, #AE2A19)',
  released: 'var(--ds-icon-subtle, #8590A2)',
  draft:    'var(--ds-icon-subtlest, #B3B9C4)',
};

export function ReleaseTimeline() {
  const { data: releases = [], isLoading: relLoad } = useReleasePortfolio();
  const { data: freezes = [], isLoading: frzLoad } = useFreezeWindowsList();

  const { rangeStart, rangeEnd, totalDays, todayPct } = useMemo(() => {
    const today = startOfDay(new Date());
    const futureDates = releases
      .filter((r) => r.goLiveDate && r.confidence !== 'released')
      .map((r) => new Date(r.goLiveDate!));
    const latest =
      futureDates.length > 0
        ? new Date(Math.max(...futureDates.map((d) => d.getTime())))
        : addDays(today, 90);
    const rs = addDays(today, -14);
    const re = addDays(latest, 21);
    const td = Math.max(1, differenceInDays(re, rs));
    const tp = Math.max(0, Math.min(100, (differenceInDays(today, rs) / td) * 100));
    return { rangeStart: rs, rangeEnd: re, totalDays: td, todayPct: tp };
  }, [releases]);

  const pct = (d: Date) => {
    const p = (differenceInDays(d, rangeStart) / totalDays) * 100;
    return Math.max(0, Math.min(100, p));
  };

  const visibleReleases = releases.filter((r) => {
    if (!r.goLiveDate) return false;
    const p = pct(startOfDay(new Date(r.goLiveDate)));
    return p >= 0 && p <= 100;
  });

  if (relLoad || frzLoad || (visibleReleases.length === 0 && freezes.length === 0)) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text }}>Release timeline</span>
        <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest }}>
          {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d')}
        </span>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Track */}
        <div style={{ position: 'relative', height: 44, borderRadius: 4, background: T.bgNeutral }}>
          {/* Freeze bands */}
          {freezes
            .filter((f) => f.startDate && f.endDate)
            .map((f) => {
              const l = pct(startOfDay(new Date(f.startDate)));
              const r = pct(startOfDay(new Date(f.endDate)));
              const w = Math.max(1, r - l);
              return (
                <div
                  key={f.id}
                  title={`Freeze: ${f.name}`}
                  style={{
                    position: 'absolute', left: `${l}%`, width: `${w}%`,
                    top: 0, bottom: 0,
                    background: T.dangerBg,
                    borderLeft: `2px solid ${T.dangerBorder}`,
                    borderRight: `2px solid ${T.dangerBorder}`,
                  }}
                >
                  <span style={{ position: 'absolute', top: 4, left: 4, fontFamily: RH.fontBody, fontSize: 9, fontWeight: 700, color: T.danger, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>FREEZE</span>
                </div>
              );
            })}

          {/* Today hairline + label */}
          <div style={{ position: 'absolute', left: `${todayPct}%`, top: -4, bottom: -4, width: 2, background: T.link, zIndex: 2 }}>
            <span style={{
              position: 'absolute', bottom: '100%', marginBottom: 4,
              left: '50%', transform: 'translateX(-50%)',
              fontFamily: RH.fontBody, fontSize: 9, fontWeight: 700, color: T.link,
              whiteSpace: 'nowrap', letterSpacing: '0.06em',
            }}>TODAY</span>
          </div>

          {/* Release dots */}
          {visibleReleases.map((r) => {
            const p = pct(startOfDay(new Date(r.goLiveDate!)));
            return (
              <div
                key={r.id}
                title={`${r.name} — ${r.confidence}`}
                style={{
                  position: 'absolute', left: `${p}%`, top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 14, height: 14, borderRadius: '50%',
                  background: CONF_DOT[r.confidence],
                  border: '2px solid white',
                  zIndex: 3,
                }}
              />
            );
          })}
        </div>

        {/* Axis labels */}
        <div style={{ position: 'relative', height: 18, marginTop: 4 }}>
          <span style={{ position: 'absolute', left: 0, fontFamily: RH.fontBody, fontSize: 10, color: T.subtlest }}>{format(rangeStart, 'MMM d')}</span>
          <span style={{
            position: 'absolute', left: `${todayPct}%`, transform: 'translateX(-50%)',
            fontFamily: RH.fontBody, fontSize: 10, fontWeight: 600, color: T.link, whiteSpace: 'nowrap',
          }}>{format(new Date(), 'MMM d')}</span>
          <span style={{ position: 'absolute', right: 0, fontFamily: RH.fontBody, fontSize: 10, color: T.subtlest }}>{format(rangeEnd, 'MMM d')}</span>
        </div>
      </div>

      {/* Release legend chips */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {visibleReleases.map((r) => (
          <div key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: T.bgNeutral, borderRadius: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: CONF_DOT[r.confidence], flexShrink: 0 }} />
            <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtle, fontWeight: 500 }}>{r.name}</span>
            {r.goLiveDate && (
              <span style={{ fontFamily: RH.fontBody, fontSize: 11, color: T.subtlest }}>
                {format(new Date(r.goLiveDate), 'MMM d')}
              </span>
            )}
          </div>
        ))}
        {freezes.map((f) => (
          <div key={`frz-${f.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: T.dangerBg, borderRadius: 4 }}>
            <span style={{ width: 8, height: 8, background: T.dangerBorder, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.danger, fontWeight: 500 }}>{f.name}</span>
            {f.startDate && f.endDate && (
              <span style={{ fontFamily: RH.fontBody, fontSize: 11, color: T.danger, opacity: 0.7 }}>
                {format(new Date(f.startDate), 'MMM d')}–{format(new Date(f.endDate), 'MMM d')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReleaseTimeline;
