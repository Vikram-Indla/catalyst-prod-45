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
};

type ReleaseStatus = 'released' | 'active' | 'soon' | 'upcoming' | 'future';

function getStatus(endDate: string | null, today: Date): ReleaseStatus {
  if (!endDate) return 'future';
  const diff = differenceInDays(new Date(endDate), today);
  if (diff < -14)               return 'released';
  if (diff >= -14 && diff <= 7) return 'active';
  if (diff > 7 && diff <= 30)   return 'soon';
  if (diff > 30 && diff <= 120) return 'upcoming';
  return 'future';
}

// Solid ADS icon tokens — NOT background-* tokens (those resolve to pastels)
const STATUS_STYLE: Record<ReleaseStatus, { dot: string; bg: string; text: string; label: string }> = {
  released: {
    dot:   'var(--ds-icon-disabled, #8993A5)',
    bg:    'var(--ds-background-neutral, #F1F2F4)',
    text:  'var(--ds-text-subtlest, #626F86)',
    label: 'Completed',
  },
  active: {
    dot:   'var(--ds-icon-brand, #0C66E4)',
    bg:    'var(--ds-background-selected, #E9F2FF)',
    text:  'var(--ds-link, #0C66E4)',
    label: 'Active',
  },
  soon: {
    dot:   'var(--ds-icon-warning, #D97008)',
    bg:    'var(--ds-background-warning-subtle, #FFF7D6)',
    text:  'var(--ds-text-warning, #7F5F01)',
    label: 'Due soon',
  },
  upcoming: {
    dot:   'var(--ds-icon-success, #22A06B)',
    bg:    'var(--ds-background-success-subtle, #DCFFF1)',
    text:  'var(--ds-text-success, #216E4E)',
    label: 'Upcoming',
  },
  future: {
    dot:   'var(--ds-icon-subtle, #626F86)',
    bg:    'var(--ds-background-neutral, #F1F2F4)',
    text:  'var(--ds-text-subtle, #44546F)',
    label: 'Planned',
  },
};

export function ProductDashboardTimeline({ productId }: { productId: string }) {
  const { data, isLoading } = useProductTimeline(productId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  if (isLoading || !data?.releases?.length) return null;

  const today = startOfDay(new Date());
  const releases = data.releases;

  // Split: past (>14 days past endDate) vs active/upcoming
  const past = releases.filter(r => getStatus(r.endDate, today) === 'released');
  const visible = releases.filter(r => getStatus(r.endDate, today) !== 'released');

  // Track: last past + all visible
  const anchor = past.length > 0 ? past[past.length - 1] : null;
  const trackReleases = [...(anchor ? [anchor] : []), ...visible];

  // Date window
  const anchorDate = anchor?.endDate ? new Date(anchor.endDate) : null;
  const rangeStart = anchorDate
    ? addDays(anchorDate, -7)
    : addDays(today, -14);
  const lastVisible = visible.length > 0 ? visible[visible.length - 1] : null;
  const rangeEnd = lastVisible?.endDate
    ? addDays(new Date(lastVisible.endDate), 21)
    : addDays(today, 60);
  const totalDays = Math.max(1, differenceInDays(rangeEnd, rangeStart));
  const todayPct = Math.max(0, Math.min(100, (differenceInDays(today, rangeStart) / totalDays) * 100));
  const pct = (d: Date) => Math.max(0, Math.min(100, (differenceInDays(d, rangeStart) / totalDays) * 100));

  const selectedRelease = releases.find(r => r.id === selectedId);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Release Timeline</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {past.length > 0 && (
            <button
              onClick={() => setShowPast(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: T.subtle, display: 'flex', alignItems: 'center',
                gap: 4, padding: 0, fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 9 }}>{showPast ? '▼' : '▶'}</span>
              {past.length} past
            </button>
          )}
          <span style={{ fontSize: 11, color: T.subtlest }}>
            {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Track */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ position: 'relative', height: 36, borderRadius: 4, background: T.bgNeutral }}>
          {/* Today line */}
          <div style={{ position: 'absolute', left: `${todayPct}%`, top: -4, bottom: -4, width: 2, background: T.link, zIndex: 2 }}>
            <span style={{
              position: 'absolute', bottom: '100%', marginBottom: 3,
              left: '50%', transform: 'translateX(-50%)',
              fontSize: 9, fontWeight: 700, color: T.link, whiteSpace: 'nowrap', letterSpacing: '0.08em',
            }}>TODAY</span>
          </div>

          {/* Release dots */}
          {trackReleases.map(release => {
            const dotDate = release.endDate
              ? new Date(release.endDate)
              : release.startDate ? new Date(release.startDate) : today;
            const status = getStatus(release.endDate, today);
            const style = STATUS_STYLE[status];
            const p = pct(startOfDay(dotDate));
            const isSelected = release.id === selectedId;
            return (
              <div
                key={release.id}
                onClick={() => setSelectedId(isSelected ? null : release.id)}
                title={`${release.name} · ${release.brCount} BRs · ${release.endDate ? format(new Date(release.endDate), 'MMM d, yyyy') : 'No date'}`}
                style={{
                  position: 'absolute',
                  left: `${p}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: isSelected ? 16 : 12,
                  height: isSelected ? 16 : 12,
                  borderRadius: '50%',
                  background: style.dot,
                  border: isSelected ? `2px solid ${T.link}` : `2px solid ${T.card}`,
                  zIndex: isSelected ? 5 : 3,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  boxShadow: isSelected
                    ? `0 0 0 3px rgba(12,102,228,0.18)`
                    : '0 1px 2px rgba(9,30,66,0.18)',
                }}
              />
            );
          })}
        </div>

        {/* Axis */}
        <div style={{ position: 'relative', height: 16, marginTop: 3 }}>
          <span style={{ position: 'absolute', left: 0, fontSize: 10, color: T.subtlest }}>
            {format(rangeStart, 'MMM d')}
          </span>
          <span style={{
            position: 'absolute', left: `${todayPct}%`,
            transform: 'translateX(-50%)',
            fontSize: 10, fontWeight: 600, color: T.link, whiteSpace: 'nowrap',
          }}>
            {format(today, 'MMM d')}
          </span>
          <span style={{ position: 'absolute', right: 0, fontSize: 10, color: T.subtlest }}>
            {format(rangeEnd, 'MMM d')}
          </span>
        </div>
      </div>

      {/* Active/upcoming chip row */}
      {visible.length > 0 && (
        <div style={{ padding: '10px 16px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {visible.map(release => {
            const status = getStatus(release.endDate, today);
            const style = STATUS_STYLE[status];
            const isSelected = release.id === selectedId;
            return (
              <button
                key={release.id}
                onClick={() => setSelectedId(isSelected ? null : release.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 8px 3px 6px',
                  background: isSelected ? style.bg : T.bgNeutral,
                  border: `1px solid ${isSelected ? style.dot : T.border}`,
                  borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.1s ease',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: style.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: isSelected ? style.text : T.subtle, fontWeight: isSelected ? 600 : 400 }}>
                  {release.name}
                </span>
                {release.endDate && (
                  <span style={{ fontSize: 10, color: T.subtlest }}>
                    {format(new Date(release.endDate), 'MMM d')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Past releases (collapsed) */}
      {showPast && past.length > 0 && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {past.map(release => {
            const isSelected = release.id === selectedId;
            const style = STATUS_STYLE.released;
            return (
              <button
                key={release.id}
                onClick={() => setSelectedId(isSelected ? null : release.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 8px 3px 6px',
                  background: isSelected ? style.bg : T.bgNeutral,
                  border: `1px solid ${isSelected ? style.dot : T.border}`,
                  borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: 0.65,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: style.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: T.subtlest }}>{release.name}</span>
                {release.endDate && (
                  <span style={{ fontSize: 10, color: T.subtlest }}>{format(new Date(release.endDate), 'MMM d')}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected release detail */}
      {selectedRelease && (() => {
        const status = getStatus(selectedRelease.endDate, today);
        const style = STATUS_STYLE[status];
        return (
          <div style={{
            padding: '12px 16px', borderTop: `1px solid ${T.border}`,
            background: style.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: style.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{selectedRelease.name}</span>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: style.text,
                  background: T.card, border: `1px solid ${style.dot}`,
                  borderRadius: 10, padding: '1px 7px',
                }}>
                  {style.label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: T.subtle, paddingLeft: 16, display: 'flex', gap: 16 }}>
                {selectedRelease.endDate && (
                  <span>{format(new Date(selectedRelease.endDate), 'MMMM d, yyyy')}</span>
                )}
                <span>{selectedRelease.brCount} business requests</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Close release detail"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: T.subtlest, lineHeight: 1, padding: '0 2px', fontFamily: 'inherit' }}
            >
              ×
            </button>
          </div>
        );
      })()}
    </div>
  );
}

export default ProductDashboardTimeline;
