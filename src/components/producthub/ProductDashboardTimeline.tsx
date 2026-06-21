import React, { useState } from 'react';
import { format, startOfDay, addDays, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Tag } from 'lucide-react';
import { useProductTimeline } from '@/hooks/useProductTimeline';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Atlassian Design Tokens ──────────────────────────────────────────────────
const T = {
  card:           'var(--ds-surface-raised, #FFFFFF)',
  sunken:         'var(--ds-surface-sunken, #F7F8F9)',
  border:         'var(--ds-border, #DFE1E6)',
  borderSub:      'var(--ds-border-subtle, #F1F2F4)',
  text:           'var(--ds-text, #172B4D)',
  subtle:         'var(--ds-text-subtle, #44546F)',
  subtlest:       'var(--ds-text-subtlest, #626F86)',
  neutral:        'var(--ds-background-neutral, #F1F2F4)',
  textInverse:    'var(--ds-text-inverse, #FFFFFF)',
  shadow:         'var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.25))',
  // Active release — blue
  activeSolid:    'var(--ds-link, #0C66E4)',
  activeBoldBg:   'var(--ds-background-information-bold, #0C66E4)',
  activeBg:       'var(--ds-background-information, #E9F2FF)',
  activeText:     'var(--ds-link, #0C66E4)',
  // Upcoming — purple
  upcomingBar:    'var(--ds-icon-discovery, #8270DB)',
  upcomingBoldBg: 'var(--ds-background-discovery-bold, #6E5DC6)',
  upcomingBg:     'var(--ds-background-discovery, #F3F0FF)',
  upcomingText:   'var(--ds-text-discovery, #6E5DC6)',
  // Released — green
  doneBar:        'var(--ds-icon-success, #22A06B)',
  doneBoldBg:     'var(--ds-background-success-bold, #1F845A)',
  doneBg:         'var(--ds-background-success, #DCFFF1)',
  doneText:       'var(--ds-text-success, #1F845A)',
  // Draft / low confidence — neutral
  neutralBoldBg:  'var(--ds-background-neutral-bold, #626F86)',
};

type ReleaseStatus = 'released' | 'active' | 'upcoming';

function getReleaseStatus(endDate: string | null, today: Date): ReleaseStatus {
  if (!endDate) return 'upcoming';
  const diff = differenceInDays(new Date(endDate), today);
  if (diff < -1) return 'released';
  if (diff <= 60) return 'active';
  return 'upcoming';
}

function statusMeta(status: ReleaseStatus) {
  switch (status) {
    case 'active':   return { bar: T.activeSolid,  boldBg: T.activeBoldBg,   bg: T.activeBg,   text: T.activeText,   label: 'Active' };
    case 'upcoming': return { bar: T.upcomingBar,  boldBg: T.upcomingBoldBg, bg: T.upcomingBg, text: T.upcomingText, label: 'Upcoming' };
    case 'released': return { bar: T.doneBar,      boldBg: T.doneBoldBg,     bg: T.doneBg,     text: T.doneText,     label: 'Released' };
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function TimelineSkeleton() {
  return (
    <div style={{
      background: T.card, boxShadow: T.shadow,
      border: `1px solid ${T.border}`, borderTop: `3px solid ${T.activeSolid}`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <Skeleton style={{ width: 200, height: 16, marginBottom: 8 }} />
        <Skeleton style={{ width: 280, height: 12 }} />
      </div>
      <div style={{ padding: '8px 0' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', height: 40, padding: '0 16px', gap: 12 }}>
            <Skeleton style={{ width: 20, height: 20, borderRadius: 4 }} />
            <Skeleton style={{ width: 160, height: 13 }} />
            <div style={{ flex: 1 }}>
              <Skeleton style={{ height: 12, borderRadius: 3 }} />
            </div>
            <Skeleton style={{ width: 56, height: 18, borderRadius: 10 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProductDashboardTimeline({ productId }: { productId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useProductTimeline(productId);
  const [showReleased, setShowReleased] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) return <TimelineSkeleton />;

  // Empty state
  if (!data?.releases?.length) {
    return (
      <div style={{
        background: T.card, boxShadow: T.shadow,
        border: `1px solid ${T.border}`, borderTop: `3px solid ${T.activeSolid}`,
        borderRadius: 8, overflow: 'hidden',
      }}>
        <div
          onClick={() => setCollapsed(v => !v)}
          style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Release Timeline</div>
            <div style={{ fontSize: 12, color: T.subtle, marginTop: 4 }}>Product release schedule and delivery milestones</div>
          </div>
          <ChevronDown size={16} color={T.subtlest} style={{ marginTop: 4, flexShrink: 0, transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
        </div>
        {!collapsed && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: T.activeBoldBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <Tag size={24} color={T.textInverse} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>No releases yet</div>
            <div style={{ fontSize: 12, color: T.subtle }}>
              Create releases in the Product Hub to track delivery milestones here.
            </div>
          </div>
        )}
      </div>
    );
  }

  const today = startOfDay(new Date());

  const sorted = [...data.releases].sort((a, b) => {
    if (!a.endDate && !b.endDate) return 0;
    if (!a.endDate) return 1;
    if (!b.endDate) return -1;
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  });

  const released = sorted.filter(r => getReleaseStatus(r.endDate, today) === 'released');
  const active   = sorted.filter(r => getReleaseStatus(r.endDate, today) === 'active');
  const upcoming = sorted.filter(r => getReleaseStatus(r.endDate, today) === 'upcoming');

  const noActiveOrUpcoming = active.length === 0 && upcoming.length === 0;
  const effectiveShowReleased = showReleased || noActiveOrUpcoming;
  const shownReleased = effectiveShowReleased
    ? (noActiveOrUpcoming && !showReleased ? released.slice(-4) : released)
    : [];

  const rendered = [...shownReleased, ...active, ...upcoming];
  const rangeAnchor = rendered.length > 0 ? rendered : released;
  const firstR = rangeAnchor[0];
  const lastR  = rangeAnchor[rangeAnchor.length - 1];

  const startAnchor = firstR?.startDate ?? firstR?.endDate;
  const endAnchor   = lastR?.endDate;
  const rangeStart  = startAnchor ? addDays(new Date(startAnchor), -7) : addDays(today, -21);
  const rangeEnd    = endAnchor   ? addDays(new Date(endAnchor),   21) : addDays(today, 60);

  const totalDays  = Math.max(1, differenceInDays(rangeEnd, rangeStart));
  const todayRatio = Math.max(0, Math.min(1, differenceInDays(today, rangeStart) / totalDays));
  const toRatio    = (d: Date) => Math.max(0, Math.min(1, differenceInDays(d, rangeStart) / totalDays));

  const ticks = Array.from({ length: 6 }, (_, i) =>
    addDays(rangeStart, Math.round((i * totalDays) / 5)),
  );

  const NAME_W = 188;
  const META_W = 104;

  const renderRow = (release: typeof sorted[0], dimmed = false) => {
    const status  = getReleaseStatus(release.endDate, today);
    const sm      = statusMeta(status);
    const endDate = release.endDate ? new Date(release.endDate) : addDays(today, 30);
    const startDate = release.startDate
      ? new Date(release.startDate)
      : addDays(endDate, -21);

    const barLeft  = toRatio(startOfDay(startDate));
    const barRight = toRatio(startOfDay(endDate));
    const barW     = Math.max(0.5, (barRight - barLeft) * 100);

    const spanDays = Math.max(1, differenceInDays(endDate, startDate));
    const progressPct = status === 'active'
      ? Math.max(0, Math.min(100, (differenceInDays(today, startDate) / spanDays) * 100))
      : status === 'released' ? 100 : 0;

    return (
      <div
        key={release.id}
        onClick={() => navigate(`/product-hub/${productId}/filters?release=${encodeURIComponent(release.name)}`)}
        style={{
          display: 'flex', alignItems: 'center', height: 40,
          borderBottom: `1px solid ${T.borderSub}`,
          cursor: 'pointer', position: 'relative',
          transition: 'background 0.08s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = T.sunken; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        {/* Release icon */}
        <div style={{ width: NAME_W, flexShrink: 0, padding: '0 8px 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 4, flexShrink: 0,
            background: dimmed ? T.neutralBoldBg : sm.boldBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Tag size={11} color={T.textInverse} strokeWidth={2} />
          </div>
          <span style={{
            fontSize: 12, fontWeight: dimmed ? 400 : 500,
            color: dimmed ? T.subtlest : T.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {release.name}
          </span>
        </div>

        {/* Gantt bar */}
        <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{
            position: 'absolute',
            left:  `${barLeft * 100}%`,
            width: `${barW}%`,
            height: 14, borderRadius: 3,
            background: dimmed ? T.neutral : sm.bar,
            overflow: 'hidden',
          }}>
            {progressPct > 0 && (
              <div style={{
                position: 'absolute', left: 0, height: '100%',
                width: `${progressPct}%`,
                background: 'var(--ds-text-inverse, rgba(255,255,255,0.22))',
                opacity: 0.22,
                borderRadius: '3px 0 0 3px',
              }} />
            )}
          </div>
          {release.endDate && (
            <span style={{
              position: 'absolute',
              left: `calc(${barRight * 100}% + 5px)`,
              fontSize: 10, color: T.subtlest, whiteSpace: 'nowrap',
            }}>
              {format(new Date(release.endDate), 'MMM d')}
            </span>
          )}
        </div>

        {/* BRs badge + status */}
        <div style={{
          width: META_W, flexShrink: 0, paddingRight: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
        }}>
          {release.brCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 600, borderRadius: 10, padding: '0 8px',
              background: dimmed ? T.neutral : sm.bg,
              color: dimmed ? T.subtle : sm.text,
              whiteSpace: 'nowrap',
            }}>
              {release.brCount} BRs
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: T.card, boxShadow: T.shadow,
      border: `1px solid ${T.border}`, borderTop: `3px solid ${T.activeSolid}`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      {/* Title row — click to collapse */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Release Timeline</div>
          <div style={{ fontSize: 12, color: T.subtle, marginTop: 4 }}>Product release schedule and delivery milestones</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
          <span style={{ fontSize: 11, color: T.subtlest, flexShrink: 0 }}>
            {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d, yyyy')}
          </span>
          <ChevronDown size={16} color={T.subtlest} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Axis header */}
          <div style={{
            display: 'flex', height: 28,
            background: T.sunken, borderBottom: `1px solid ${T.border}`,
            position: 'relative',
          }}>
            {/* TODAY line */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0, pointerEvents: 'none', zIndex: 5,
              left: `calc(${NAME_W}px + ${todayRatio} * (100% - ${NAME_W + META_W}px))`,
              width: 2, background: T.activeSolid, opacity: 0.35,
            }} />
            <div style={{ width: NAME_W, flexShrink: 0, paddingLeft: 40, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.subtlest }}>Release</span>
            </div>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              {ticks.map((tick, i) => {
                const ratio = toRatio(tick);
                const isNear = Math.abs(differenceInDays(tick, today)) <= 3;
                return (
                  <span key={i} style={{
                    position: 'absolute', left: `${ratio * 100}%`, transform: 'translateX(-50%)',
                    fontSize: 10, whiteSpace: 'nowrap',
                    color: isNear ? T.activeSolid : T.subtlest,
                    fontWeight: isNear ? 700 : 400,
                  }}>
                    {format(tick, 'MMM d')}
                  </span>
                );
              })}
            </div>
            <div style={{ width: META_W, flexShrink: 0 }} />
          </div>

          {/* Body */}
          <div style={{ position: 'relative' }}>
            {/* TODAY pill */}
            <div style={{
              position: 'relative', height: 20,
              background: T.activeBg,
              borderTop: `1px solid ${T.activeSolid}20`,
              borderBottom: `1px solid ${T.activeSolid}20`,
            }}>
              <span style={{
                position: 'absolute',
                left: `calc(${NAME_W}px + ${todayRatio} * (100% - ${NAME_W + META_W}px))`,
                top: '50%', transform: 'translate(-50%, -50%)',
                background: T.activeSolid, color: T.textInverse,
                fontSize: 9, fontWeight: 800, padding: '0 8px',
                borderRadius: 2, letterSpacing: '0.07em', whiteSpace: 'nowrap',
                zIndex: 6,
              }}>
                TODAY · {format(today, 'MMM d')}
              </span>
            </div>

            {/* Released section */}
            {released.length > 0 && (
              <>
                <div
                  onClick={e => { e.stopPropagation(); setShowReleased(v => !v); }}
                  style={{
                    display: 'flex', alignItems: 'center', height: 26, gap: 6,
                    borderBottom: `1px solid ${T.border}`,
                    background: T.sunken, cursor: 'pointer', padding: '0 16px',
                  }}
                >
                  <span style={{ fontSize: 9, color: T.subtlest }}>{effectiveShowReleased ? '▼' : '▶'}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.subtlest }}>
                    {noActiveOrUpcoming
                      ? `Released — showing ${shownReleased.length} of ${released.length}`
                      : `Released — ${released.length} release${released.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
                {effectiveShowReleased && shownReleased.map(r => renderRow(r, true))}
              </>
            )}

            {/* Active releases */}
            {active.length === 0 && upcoming.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', height: 36, gap: 10,
                borderBottom: `1px solid ${T.borderSub}`, padding: '0 16px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.neutral, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: T.subtlest, fontStyle: 'italic' }}>
                  No active release in progress
                </span>
              </div>
            )}
            {active.map(r => renderRow(r))}
            {upcoming.map(r => renderRow(r))}
          </div>

          {/* Footer legend */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            padding: '8px 16px', borderTop: `1px solid ${T.border}`,
            background: T.sunken,
          }}>
            {([['active', T.activeSolid, 'Active'], ['upcoming', T.upcomingBar, 'Upcoming'], ['released', T.doneBar, 'Released']] as const).map(([, bar, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 8, borderRadius: 2, background: bar, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: T.subtle }}>{label}</span>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: T.subtlest, fontStyle: 'italic' }}>
              Click release → opens filter
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductDashboardTimeline;
