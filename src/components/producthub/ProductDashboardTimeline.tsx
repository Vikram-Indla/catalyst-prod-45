import React, { useState } from 'react';
import { format, startOfDay, addDays, differenceInDays } from 'date-fns';
import { useProductTimeline } from '@/hooks/useProductTimeline';

const T = {
  card: 'var(--ds-surface-raised, #FFFFFF)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  bgNeutral: 'var(--ds-background-neutral, #F1F2F4)',
  link: 'var(--ds-link, #0C66E4)',
  success: 'var(--ds-background-success, #216E4E)',
  warning: 'var(--ds-background-warning, #974F0C)',
  danger: 'var(--ds-background-danger, #AE2A19)',
};

const CONF_DOT: Record<string, string> = {
  high: T.success,
  medium: T.warning,
  low: T.danger,
  released: 'var(--ds-background-neutral-bold, #626F86)',
  draft: 'var(--ds-background-subtlest, #B3B9C4)',
};

export function ProductDashboardTimeline({ productId }: { productId: string }) {
  const { data, isLoading } = useProductTimeline(productId);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);

  if (isLoading || !data?.releases) return null;
  if (data.releases.length === 0) return null;

  const releases = data.releases;
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -14);
  const rangeEnd = releases.length > 0 && releases[releases.length - 1].endDate
    ? addDays(new Date(releases[releases.length - 1].endDate), 21)
    : addDays(today, 90);
  const totalDays = Math.max(1, differenceInDays(rangeEnd, rangeStart));
  const todayPct = Math.max(0, Math.min(100, (differenceInDays(today, rangeStart) / totalDays) * 100));

  const pct = (d: Date) => {
    const p = (differenceInDays(d, rangeStart) / totalDays) * 100;
    return Math.max(0, Math.min(100, p));
  };

  const selectedRelease = releases.find(r => r.id === selectedReleaseId);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: T.text }}>Release Timeline</span>
        <span style={{ fontSize: 12, color: T.subtlest }}>
          {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d')}
        </span>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Track */}
        <div style={{ position: 'relative', height: 44, borderRadius: 4, background: T.bgNeutral }}>
          {/* Today hairline */}
          <div style={{ position: 'absolute', left: `${todayPct}%`, top: -4, bottom: -4, width: 2, background: T.link, zIndex: 2 }}>
            <span style={{ position: 'absolute', bottom: '100%', marginBottom: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: T.link, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>TODAY</span>
          </div>

          {/* Release dots */}
          {releases.map((release) => {
            const dotDate = release.endDate ? new Date(release.endDate) : new Date(release.startDate || today);
            const p = pct(startOfDay(dotDate));
            const isSelected = release.id === selectedReleaseId;
            return (
              <div
                key={release.id}
                onClick={() => setSelectedReleaseId(isSelected ? null : release.id)}
                title={`${release.name} — ${release.brCount} BRs`}
                style={{
                  position: 'absolute',
                  left: `${p}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: CONF_DOT[release.confidence],
                  border: isSelected ? `3px solid ${T.link}` : '2px solid white',
                  zIndex: 3,
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 0 2px ${T.card}` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Axis labels */}
        <div style={{ position: 'relative', height: 18, marginTop: 4 }}>
          <span style={{ position: 'absolute', left: 0, fontSize: 10, color: T.subtlest }}>{format(rangeStart, 'MMM d')}</span>
          <span style={{ position: 'absolute', left: `${todayPct}%`, transform: 'translateX(-50%)', fontSize: 10, fontWeight: 600, color: T.link, whiteSpace: 'nowrap' }}>{format(new Date(), 'MMM d')}</span>
          <span style={{ position: 'absolute', right: 0, fontSize: 10, color: T.subtlest }}>{format(rangeEnd, 'MMM d')}</span>
        </div>
      </div>

      {/* Legend chips */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {releases.map((release) => (
          <div key={release.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: T.bgNeutral, borderRadius: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: CONF_DOT[release.confidence], flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.subtle, fontWeight: 500 }}>{release.name}</span>
            {release.endDate && (
              <span style={{ fontSize: 11, color: T.subtlest }}>
                {format(new Date(release.endDate), 'MMM d')}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Selected release details */}
      {selectedRelease && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, background: T.bgNeutral }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: T.text }}>
            {selectedRelease.name} · {selectedRelease.brCount} business requests
          </div>
          <div style={{ fontSize: 12, color: T.subtlest }}>
            Business requests in this release appear in the list below
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDashboardTimeline;
