import React, { useState } from 'react';
import { format, startOfDay, addDays, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useReleasePortfolio } from '@/hooks/useReleasePortfolio';
import { useFreezeWindowsList } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';

const T = {
  card:     'var(--ds-surface-raised, #FFFFFF)',
  border:   'var(--ds-border, #DFE1E6)',
  borderSub:'var(--ds-border-subtle, #F1F2F4)',
  text:     'var(--ds-text, #172B4D)',
  subtle:   'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  neutral:  'var(--ds-background-neutral, #F1F2F4)',
  sunken:   'var(--ds-surface-sunken, #FAFBFC)',
  selected: 'var(--ds-background-selected, #E9F2FF)',
  link:     'var(--ds-link, #0C66E4)',
  danger:   'var(--ds-text-danger, #AE2A19)',
  dangerBg: 'var(--ds-background-danger, rgba(174,42,25,0.08))',
  dangerBorder: 'var(--ds-border-danger, rgba(174,42,25,0.30))',
};

const BAR = {
  completed: { bar: '#C1C7D0', badge: { bg: '#F1F2F4', text: '#44546F' }, label: 'Released' },
  active:    { bar: '#0C66E4', badge: { bg: '#E9F2FF', text: '#0C66E4' }, label: 'Active' },
  upcoming:  { bar: '#22A06B', badge: { bg: '#DCFFF1', text: '#216E4E' }, label: 'Upcoming' },
} as const;

type GanttStatus = keyof typeof BAR;

const NAME_W = 168;
const META_W = 96;

function getStatus(goLiveDate: string | null, confidence: string, today: Date): GanttStatus {
  if (confidence === 'released') return 'completed';
  if (!goLiveDate) return 'upcoming';
  const diff = differenceInDays(new Date(goLiveDate), today);
  if (diff < -14) return 'completed';
  if (diff <= 14)  return 'active';
  return 'upcoming';
}

export function ReleaseTimeline() {
  const navigate = useNavigate();
  const { data: releases = [], isLoading: relLoad } = useReleasePortfolio();
  const { data: freezes = [], isLoading: frzLoad } = useFreezeWindowsList();
  const [showPast, setShowPast] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (relLoad || frzLoad) return null;

  const today = startOfDay(new Date());

  const sorted = [...releases].sort((a, b) => {
    if (!a.goLiveDate && !b.goLiveDate) return 0;
    if (!a.goLiveDate) return 1;
    if (!b.goLiveDate) return -1;
    return new Date(a.goLiveDate).getTime() - new Date(b.goLiveDate).getTime();
  });

  const past    = sorted.filter(r => getStatus(r.goLiveDate, r.confidence, today) === 'completed');
  const visible = sorted.filter(r => getStatus(r.goLiveDate, r.confidence, today) !== 'completed');

  if (sorted.length === 0 && freezes.length === 0) return null;

  const anchor     = past.length > 0 ? past[past.length - 1] : null;
  const rangeStart = anchor?.goLiveDate
    ? addDays(new Date(anchor.goLiveDate), -7)
    : addDays(today, -21);
  const lastVisible = visible[visible.length - 1];
  const rangeEnd   = lastVisible?.goLiveDate
    ? addDays(new Date(lastVisible.goLiveDate), 21)
    : addDays(today, 60);

  const totalDays  = Math.max(1, differenceInDays(rangeEnd, rangeStart));
  const todayRatio = Math.max(0, Math.min(1, differenceInDays(today, rangeStart) / totalDays));
  const toRatio    = (d: Date) => Math.max(0, Math.min(1, differenceInDays(d, rangeStart) / totalDays));

  const ticks = Array.from({ length: 6 }, (_, i) =>
    addDays(rangeStart, Math.round((i * totalDays) / 5)),
  );

  const hasActive = visible.some(r => getStatus(r.goLiveDate, r.confidence, today) === 'active');

  const renderRow = (release: typeof sorted[0], dimmed = false) => {
    const status    = getStatus(release.goLiveDate, release.confidence, today);
    const style     = BAR[status];
    const endDate   = release.goLiveDate ? new Date(release.goLiveDate) : addDays(today, 30);
    const startDate = addDays(endDate, -14);

    const barLeft  = toRatio(startOfDay(startDate));
    const barRight = toRatio(startOfDay(endDate));
    const barW     = Math.max(0.5, (barRight - barLeft) * 100);
    const isHovered = hoveredId === release.id;

    const spanDays = Math.max(1, differenceInDays(endDate, startDate));
    const progressPct = status === 'active'
      ? Math.max(0, Math.min(100, (differenceInDays(today, startDate) / spanDays) * 100))
      : 0;

    return (
      <div
        key={release.id}
        onClick={() => navigate(`/release-hub/filters?release=${encodeURIComponent(release.name)}`)}
        onMouseEnter={() => setHoveredId(release.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{
          display: 'flex', alignItems: 'center', height: 36,
          borderBottom: `1px solid ${T.borderSub}`,
          cursor: 'pointer', position: 'relative',
          background: isHovered ? T.sunken : 'transparent',
          opacity: dimmed ? 0.65 : 1,
          transition: 'background 0.08s',
        }}
      >
        {/* Name */}
        <div style={{
          width: NAME_W, flexShrink: 0, padding: '0 10px 0 16px',
          fontFamily: RH.fontBody,
          fontSize: 12, fontWeight: dimmed ? 400 : 500,
          color: dimmed ? T.subtlest : T.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {release.name}
        </div>

        {/* Chart */}
        <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
          {/* Freeze bands behind bar */}
          {freezes
            .filter(f => f.startDate && f.endDate)
            .map(f => {
              const l = toRatio(startOfDay(new Date(f.startDate)));
              const r = toRatio(startOfDay(new Date(f.endDate)));
              const w = Math.max(0.5, (r - l) * 100);
              return (
                <div key={f.id} style={{
                  position: 'absolute',
                  left: `${l * 100}%`, width: `${w}%`,
                  top: 0, bottom: 0, pointerEvents: 'none',
                  background: T.dangerBg,
                  borderLeft: `1px solid ${T.dangerBorder}`,
                  borderRight: `1px solid ${T.dangerBorder}`,
                }} />
              );
            })}

          {/* Bar */}
          <div style={{
            position: 'absolute',
            left:  `${barLeft  * 100}%`,
            width: `${barW}%`,
            height: 16, borderRadius: 3,
            background: dimmed ? '#C1C7D0' : style.bar,
            overflow: 'hidden', zIndex: 2,
          }}>
            {status === 'active' && (
              <div style={{
                position: 'absolute', left: 0, height: '100%',
                width: `${progressPct}%`,
                background: 'rgba(255,255,255,0.22)',
                borderRadius: '3px 0 0 3px',
              }} />
            )}
          </div>
          {release.goLiveDate && (
            <span style={{
              position: 'absolute',
              left: `calc(${barRight * 100}% + 5px)`,
              fontFamily: RH.fontBody,
              fontSize: 10, color: T.subtlest, whiteSpace: 'nowrap', zIndex: 3,
            }}>
              {format(new Date(release.goLiveDate), 'MMM d')}
            </span>
          )}
        </div>

        {/* Meta */}
        <div style={{
          width: META_W, flexShrink: 0, paddingRight: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
        }}>
          {release.scopeItems > 0 && (
            <span style={{
              fontFamily: RH.fontBody,
              fontSize: 10, fontWeight: 600, borderRadius: 10, padding: '1px 7px',
              background: dimmed ? T.neutral : style.badge.bg,
              color: dimmed ? T.subtle : style.badge.text,
              whiteSpace: 'nowrap',
            }}>
              {release.scopeItems}
            </span>
          )}
          <span style={{
            fontSize: 12, color: T.link, fontWeight: 700,
            opacity: isHovered ? 1 : 0.15, transition: 'opacity 0.1s',
          }}>↗</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: RH.fontDisplay, fontSize: 14, fontWeight: 600, color: T.text }}>
            Release Timeline
          </span>
          {freezes.length > 0 && (
            <span style={{
              fontFamily: RH.fontBody,
              fontSize: 10, fontWeight: 600, color: T.danger,
              background: T.dangerBg, border: `1px solid ${T.dangerBorder}`,
              borderRadius: 3, padding: '1px 6px',
            }}>
              {freezes.length} freeze window{freezes.length !== 1 ? 's' : ''}
            </span>
          )}
          {past.length > 0 && (
            <button
              onClick={() => setShowPast(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 11, color: T.link, fontFamily: 'inherit', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              {showPast ? '▼' : '▶'} {past.length} past
            </button>
          )}
        </div>
        <span style={{ fontFamily: RH.fontBody, fontSize: 11, color: T.subtlest }}>
          {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d, yyyy')}
        </span>
      </div>

      {/* Gantt body */}
      <div style={{ position: 'relative' }}>

        {/* TODAY vertical line */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, pointerEvents: 'none', zIndex: 5,
          left: `calc(${NAME_W}px + ${todayRatio} * (100% - ${NAME_W + META_W}px))`,
          width: 2, background: T.link, opacity: 0.35,
        }} />

        {/* Axis row */}
        <div style={{
          display: 'flex', height: 26,
          borderBottom: `1px solid ${T.border}`,
          background: T.sunken, position: 'relative',
        }}>
          <div style={{
            width: NAME_W, flexShrink: 0, paddingLeft: 16,
            display: 'flex', alignItems: 'center',
          }}>
            <span style={{
              fontFamily: RH.fontBody,
              fontSize: 10, fontWeight: 600, color: T.subtlest,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Release
            </span>
          </div>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            {ticks.map((tick, i) => (
              <span key={i} style={{
                position: 'absolute',
                left: `${toRatio(tick) * 100}%`,
                transform: 'translateX(-50%)',
                fontFamily: RH.fontBody,
                fontSize: 10, whiteSpace: 'nowrap',
                color: Math.abs(differenceInDays(tick, today)) <= 3 ? T.link : T.subtlest,
                fontWeight: Math.abs(differenceInDays(tick, today)) <= 3 ? 700 : 400,
              }}>
                {format(tick, 'MMM d')}
              </span>
            ))}
          </div>
          <div style={{ width: META_W, flexShrink: 0 }} />
        </div>

        {/* Completed section toggle */}
        {past.length > 0 && (
          <div
            onClick={() => setShowPast(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', height: 26, gap: 6,
              borderBottom: `1px solid ${T.border}`,
              background: T.sunken, cursor: 'pointer', padding: '0 16px',
            }}
          >
            <span style={{ fontSize: 9, color: T.subtlest }}>{showPast ? '▼' : '▶'}</span>
            <span style={{ fontFamily: RH.fontBody, fontSize: 10, fontWeight: 600, color: T.subtlest, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Released — {past.length}
            </span>
          </div>
        )}
        {showPast && past.map(r => renderRow(r, true))}

        {/* TODAY pill row */}
        <div style={{
          position: 'relative', height: 20,
          background: T.selected,
          borderTop: `1px solid ${T.link}20`,
          borderBottom: `1px solid ${T.link}20`,
        }}>
          <span style={{
            position: 'absolute',
            left: `calc(${NAME_W}px + ${todayRatio} * (100% - ${NAME_W + META_W}px))`,
            top: '50%', transform: 'translate(-50%, -50%)',
            background: T.link, color: '#fff',
            fontFamily: RH.fontBody,
            fontSize: 9, fontWeight: 800, padding: '1px 6px',
            borderRadius: 2, letterSpacing: '0.07em', whiteSpace: 'nowrap',
            zIndex: 6,
          }}>
            TODAY · {format(today, 'MMM d')}
          </span>
        </div>

        {/* No active release */}
        {!hasActive && visible.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', height: 36, gap: 10,
            borderBottom: `1px solid ${T.borderSub}`,
            padding: '0 16px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C1C7D0', flexShrink: 0 }} />
            <span style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, fontStyle: 'italic' }}>
              No active release in progress
            </span>
          </div>
        )}

        {/* Active + upcoming rows */}
        {visible.map(r => renderRow(r))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        padding: '8px 16px', borderTop: `1px solid ${T.border}`,
        background: T.sunken,
      }}>
        {Object.entries(BAR).map(([key, { bar, label }]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 8, borderRadius: 2, background: bar, flexShrink: 0 }} />
            <span style={{ fontFamily: RH.fontBody, fontSize: 10, color: T.subtle }}>{label}</span>
          </div>
        ))}
        {freezes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 8, borderRadius: 2, background: T.dangerBorder, flexShrink: 0 }} />
            <span style={{ fontFamily: RH.fontBody, fontSize: 10, color: T.danger }}>Freeze</span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: RH.fontBody, fontSize: 10, color: T.subtlest, fontStyle: 'italic' }}>
          Click release → opens filter module
        </span>
      </div>
    </div>
  );
}

export default ReleaseTimeline;
