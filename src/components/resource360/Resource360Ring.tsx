import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Resource360Item, StatusCategory, RingPeriod } from '@/types/resource360';
import { getStatusCategory, STATUS_COLORS, WH_HUB_COLORS, WH_HUB_SHORT } from '@/types/resource360';
import { Resource360CompactNode } from './Resource360CompactNode';

/* ═══ CONFIG ═══ */
const MAX_FULL_NODES = 10;
const MAX_COMPACT_NODES = 20;

/** Build dynamic date periods from actual data */
function buildPeriods(items: Resource360Item[]): RingPeriod[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort(
    (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
  );

  const perBucket = Math.ceil(sorted.length / 4);
  const buckets: Resource360Item[][] = [];
  for (let i = 0; i < sorted.length; i += perBucket) {
    buckets.push(sorted.slice(i, i + perBucket));
  }

  const labels = ['Recent', 'Previous', 'Earlier', 'Oldest'];
  const fmtDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return buckets.map((bucket, idx) => {
    const newest = bucket[0]?.assigned_at?.slice(0, 10) ?? '';
    const oldest = bucket[bucket.length - 1]?.assigned_at?.slice(0, 10) ?? '';
    return {
      label: labels[idx] ?? `Period ${idx + 1}`,
      sub: `${fmtDate(oldest)} – ${fmtDate(newest)} · ${bucket.length} items`,
      startDate: oldest,
      endDate: newest,
      items: bucket,
    };
  });
}

interface Resource360RingProps {
  items: Resource360Item[];
  resourceName: string;
  resourceAvatar: string | null;
  jobRole: string;
  department: string;
  statusFilter: StatusCategory;
  onStatusFilterChange: (filter: StatusCategory) => void;
  onItemClick: (item: Resource360Item) => void;
}

export function Resource360Ring({
  items, resourceName, resourceAvatar, jobRole, department,
  statusFilter, onStatusFilterChange, onItemClick,
}: Resource360RingProps) {
  const [ringLevel, setRingLevel] = useState(0);
  const [pageOffset, setPageOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 960, h: 740 });

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth || 960;
        setDims({ w, h: Math.max(700, Math.min(w * 0.82, 820)) });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const filtered = useMemo(() =>
    statusFilter === 'all'
      ? items
      : items.filter(t => getStatusCategory(t.status, t.status_category) === statusFilter),
    [items, statusFilter]
  );

  const periods = useMemo(() => buildPeriods(filtered), [filtered]);

  useEffect(() => { setPageOffset(0); }, [ringLevel]);

  // Clamp ringLevel if periods shrink (e.g. filter change)
  const safeLevel = Math.min(ringLevel, Math.max(0, periods.length - 1));
  useEffect(() => {
    if (ringLevel !== safeLevel) setRingLevel(safeLevel);
  }, [safeLevel, ringLevel]);

  const currentPeriod = periods[safeLevel];
  const allCurrentItems = currentPeriod?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(allCurrentItems.length / MAX_FULL_NODES));
  const safePage = pageOffset % totalPages;
  const pageStart = safePage * MAX_FULL_NODES;
  const visibleFull = allCurrentItems.slice(pageStart, pageStart + MAX_FULL_NODES);

  const compactItems = useMemo(() => {
    const acc: Resource360Item[] = [];
    for (let i = safeLevel + 1; i < periods.length; i++) {
      acc.push(...(periods[i]?.items ?? []));
    }
    return acc.slice(0, MAX_COMPACT_NODES);
  }, [periods, safeLevel]);

  const canExpand = safeLevel < periods.length - 1;
  const canCollapse = safeLevel > 0;

  const { w: W, h: H } = dims;
  const cx = W / 2;
  const cy = H / 2 + 8;
  const avatarR = 36;
  const fullR = Math.max(240, Math.min(W, H) / 2 - 90);
  const compactR = compactItems.length > 0 ? Math.max(100, fullR * 0.45) : 0;

  const initials = resourceName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const filterOpts: { value: StatusCategory; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'todo', label: 'To Do' },
    { value: 'progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  const placeOnRing = (idx: number, total: number, radius: number) => {
    const angle = (-90 + (360 / Math.max(total, 1)) * idx) * (Math.PI / 180);
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  };

  return (
    <div className="flex flex-col w-full" ref={containerRef}>
      {/* Status filter bar */}
      <div className="flex items-center gap-5 px-4 py-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
        {filterOpts.map(opt => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer select-none" style={{ color: '#334155', fontWeight: 500 }}>
            <input
              type="radio"
              name="r360-status-filter"
              checked={statusFilter === opt.value}
              onChange={() => { onStatusFilterChange(opt.value); setPageOffset(0); }}
              style={{ width: 14, height: 14, accentColor: '#2563EB', cursor: 'pointer' }}
            />
            {opt.label}
            <span style={{ color: '#94A3B8', fontSize: 11 }}>
              ({opt.value === 'all' ? items.length :
                items.filter(t => getStatusCategory(t.status, t.status_category) === opt.value).length})
            </span>
          </label>
        ))}
      </div>

      {/* Ring canvas */}
      <div className="relative" style={{ width: W, height: H }}>
        <div className="relative" style={{ width: W, height: H }}>

          {/* SVG layer */}
          <svg width={W} height={H} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            <circle cx={cx} cy={cy} r={fullR} fill="none" stroke="#E2E8F0" strokeWidth={1} />
            <circle cx={cx} cy={cy} r={fullR} fill="none" stroke="#F1F5F9" strokeWidth={40} opacity={0.25} />

            {compactR > 0 && compactItems.length > 0 && (
              <>
                <circle cx={cx} cy={cy} r={compactR} fill="none" stroke="#E2E8F0" strokeWidth={1} strokeDasharray="4 4" />
                <circle cx={cx} cy={cy} r={compactR} fill="none" stroke="#F8FAFC" strokeWidth={24} opacity={0.3} />
              </>
            )}

            <circle cx={cx} cy={cy} r={avatarR + 10} fill="none" stroke="#DBEAFE" strokeWidth={3} opacity={0.5} />

            {/* Spokes to full nodes */}
            {visibleFull.map((_, i) => {
              const { x: nx, y: ny } = placeOnRing(i, visibleFull.length, fullR);
              const aR = avatarR + 16;
              const angle = Math.atan2(ny - cy, nx - cx);
              return (
                <line key={`s-${i}`}
                  x1={cx + Math.cos(angle) * aR} y1={cy + Math.sin(angle) * aR}
                  x2={cx + Math.cos(angle) * (fullR - 18)} y2={cy + Math.sin(angle) * (fullR - 18)}
                  stroke="#E2E8F0" strokeWidth={1} />
              );
            })}

            {/* Spokes to compact nodes */}
            {compactItems.map((_, i) => {
              const { x: nx, y: ny } = placeOnRing(i, compactItems.length, compactR);
              const angle = Math.atan2(ny - cy, nx - cx);
              return (
                <line key={`cs-${i}`}
                  x1={cx + Math.cos(angle) * (avatarR + 16)} y1={cy + Math.sin(angle) * (avatarR + 16)}
                  x2={cx + Math.cos(angle) * (compactR - 10)} y2={cy + Math.sin(angle) * (compactR - 10)}
                  stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3 3" />
              );
            })}

            {/* Period label at 3 o'clock */}
            {currentPeriod && visibleFull.length > 0 && (
              <>
                <text x={cx + fullR + 26} y={cy - 12} fill="#334155" fontSize={11} fontWeight={700} fontFamily="Inter, sans-serif" letterSpacing="0.04em">
                  {currentPeriod.label.toUpperCase()}
                </text>
                <text x={cx + fullR + 26} y={cy + 4} fill="#94A3B8" fontSize={10} fontFamily="Inter, sans-serif">
                  {currentPeriod.sub}
                </text>
                {totalPages > 1 && (
                  <text x={cx + fullR + 26} y={cy + 18} fill="#2563EB" fontSize={10} fontWeight={600} fontFamily="Inter, sans-serif">
                    Page {safePage + 1} of {totalPages}
                  </text>
                )}
              </>
            )}

            {/* Compact ring label */}
            {compactR > 0 && compactItems.length > 0 && (
              <text x={cx + compactR + 14} y={cy - 4} fill="#94A3B8" fontSize={9} fontWeight={600} fontFamily="Inter, sans-serif" letterSpacing="0.06em">
                OLDER · {compactItems.length}{compactItems.length < periods.slice(safeLevel + 1).reduce((s, p) => s + (p.items?.length ?? 0), 0) ? '+' : ''}
              </text>
            )}
          </svg>

          {/* Avatar */}
          <div
            className="absolute rounded-full overflow-hidden flex items-center justify-center"
            style={{
              left: cx - avatarR, top: cy - avatarR,
              width: avatarR * 2, height: avatarR * 2,
              background: '#2563EB',
              boxShadow: '0 0 0 4px #DBEAFE, 0 4px 16px rgba(37,99,235,.12)',
              zIndex: 10,
            }}
          >
            {resourceAvatar ? (
              <img src={resourceAvatar} alt={resourceName} className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : null}
            <span
              className={`absolute inset-0 flex items-center justify-center text-white font-bold ${resourceAvatar ? 'hidden' : ''}`}
              style={{ fontSize: 18, fontFamily: 'Inter, sans-serif' }}
            >
              {initials}
            </span>
          </div>

          {/* Name below avatar */}
          <div className="absolute text-center" style={{ left: cx - 100, top: cy + avatarR + 12, width: 200, zIndex: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Inter, sans-serif', margin: 0, lineHeight: 1.3 }}>
              {resourceName}
            </p>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#64748B', fontFamily: 'Inter, sans-serif', margin: '2px 0 0', lineHeight: 1.3 }}>
              {jobRole} · {department}
            </p>
          </div>

          {/* Full detail cards */}
          {visibleFull.map((item, i) => {
            const { x, y } = placeOnRing(i, visibleFull.length, fullR);
            return (
              <FullNode key={item.work_item_id} item={item} x={x} y={y} onClick={() => onItemClick(item)} />
            );
          })}

          {/* Compact pills on inner ring */}
          {compactItems.map((item, i) => {
            const { x, y } = placeOnRing(i, compactItems.length, compactR);
            return (
              <Resource360CompactNode key={`c-${item.work_item_id}`} item={item} x={x} y={y} onClick={() => onItemClick(item)} />
            );
          })}

          {/* Carousel: rotate right — 3 o'clock */}
          {totalPages > 1 && (
            <button
              onClick={() => setPageOffset(p => p + 1)}
              title="Next page"
              className="absolute flex items-center justify-center rounded-full transition-all"
              style={{
                zIndex: 30,
                left: cx + fullR - 22, top: cy - 22,
                width: 44, height: 44,
                background: '#fff', border: '2px solid #2563EB',
                cursor: 'pointer', fontSize: 18, fontWeight: 700, color: '#2563EB',
                boxShadow: '0 4px 16px rgba(37,99,235,.12)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#2563EB'; }}>
              ›
            </button>
          )}

          {/* Carousel: rotate left — 9 o'clock */}
          {totalPages > 1 && (
            <button
              onClick={() => setPageOffset(p => Math.max(0, p - 1))}
              title="Previous page"
              className="absolute flex items-center justify-center rounded-full transition-all"
              style={{
                zIndex: 30,
                left: cx - fullR - 22, top: cy - 22,
                width: 44, height: 44,
                background: '#fff', border: '2px solid #2563EB',
                cursor: 'pointer', fontSize: 18, fontWeight: 700, color: '#2563EB',
                boxShadow: '0 4px 16px rgba(37,99,235,.12)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#2563EB'; }}>
              ‹
            </button>
          )}

          {/* Expand/Collapse level — bottom center */}
          <div className="absolute flex items-center gap-3" style={{ left: cx - 120, bottom: 12, width: 240, justifyContent: 'center', zIndex: 10 }}>
            {canCollapse && (
              <button
                onClick={() => setRingLevel(l => l - 1)}
                style={{
                  padding: '4px 12px', borderRadius: 6,
                  background: '#fff', border: '1.5px solid #2563EB',
                  color: '#2563EB', fontSize: 10, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                ← Newer
              </button>
            )}

            {/* Level dots */}
            <div className="flex items-center gap-1.5">
              {periods.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all cursor-pointer"
                  style={{
                    width: i === safeLevel ? 16 : 6,
                    height: 6,
                    background: i === safeLevel ? '#2563EB' : '#CBD5E1',
                    borderRadius: i === safeLevel ? 3 : '50%',
                  }}
                  onClick={() => { setRingLevel(i); setPageOffset(0); }}
                />
              ))}
            </div>

            {canExpand && (
              <button
                onClick={() => setRingLevel(l => l + 1)}
                style={{
                  padding: '4px 12px', borderRadius: 6,
                  background: '#fff', border: '1.5px solid #2563EB',
                  color: '#2563EB', fontSize: 10, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                Older →
              </button>
            )}
          </div>

          {/* Empty state */}
          {visibleFull.length === 0 && compactItems.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 15 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No tickets match</p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Try a different filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ FULL DETAIL NODE — inline ═══ */

function FullNode({ item, x, y, onClick }: {
  item: Resource360Item; x: number; y: number; onClick: () => void;
}) {
  const cat = getStatusCategory(item.status, item.status_category);
  const sc = STATUS_COLORS[cat];
  const hubColor = WH_HUB_COLORS[item.hub] ?? '#64748B';
  const hubShort = WH_HUB_SHORT[item.hub] ?? item.hub?.slice(0, 4).toUpperCase();

  return (
    <div
      className="absolute cursor-pointer transition-all"
      style={{
        left: x, top: y,
        transform: 'translate(-50%, -50%)',
        width: 156, minHeight: 72,
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        padding: '8px 10px 8px 13px',
        boxShadow: '0 2px 6px rgba(0,0,0,.06)',
        zIndex: 5,
        fontFamily: 'Inter, sans-serif',
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)';
        e.currentTarget.style.zIndex = '20';
        e.currentTarget.style.transform = 'translate(-50%, -50%) translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,.06)';
        e.currentTarget.style.zIndex = '5';
        e.currentTarget.style.transform = 'translate(-50%, -50%)';
      }}>

      {/* Left status color bar */}
      <div
        className="absolute left-0 top-2 bottom-2 rounded-full"
        style={{ width: 3, background: sc.dot }}
      />

      {/* Row 1: Key + Hub */}
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', fontFamily: "'Inter', monospace" }}>
          {item.item_key}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
          color: hubColor, background: `${hubColor}12`,
          padding: '1px 5px', borderRadius: 3,
        }}>
          {hubShort}
        </span>
      </div>

      {/* Row 2: Title */}
      <div style={{
        fontSize: 12, fontWeight: 600, color: '#0F172A',
        lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', marginBottom: 4,
      }}>
        {item.title}
      </div>

      {/* Row 3: Status pill + date */}
      <div className="flex items-center gap-1.5">
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 9, fontWeight: 600,
          color: sc.text, background: sc.bg,
          padding: '1px 6px', borderRadius: 3,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
          {item.status.length > 14 ? item.status.slice(0, 12) + '…' : item.status}
        </span>
        <span style={{ fontSize: 9, color: '#94A3B8' }}>
          {item.assigned_at?.slice(5, 10)}
        </span>
      </div>
    </div>
  );
}
