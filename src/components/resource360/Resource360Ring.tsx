import React, { useState, useRef, useEffect } from 'react';
import type { Resource360Item, StatusCategory, RingPeriod } from '@/types/resource360';
import { getStatusCategory, STATUS_COLORS, WH_HUB_COLORS, WH_HUB_SHORT } from '@/types/resource360';
import { Resource360RingNode } from './Resource360RingNode';
import { Resource360CompactNode } from './Resource360CompactNode';

/** Time period buckets for progressive disclosure */
const PERIODS: RingPeriod[] = [
  { label: 'Recent 2 Weeks',    sub: 'Feb 10 – 23',    startDate: '2026-02-10', endDate: '2026-02-23' },
  { label: 'Previous 2 Weeks',  sub: 'Jan 27 – Feb 9',  startDate: '2026-01-27', endDate: '2026-02-09' },
  { label: 'January',           sub: 'Jan 1 – 26',      startDate: '2026-01-01', endDate: '2026-01-26' },
  { label: 'Pre-Quarter',       sub: 'Before Jan',       startDate: '2025-01-01', endDate: '2025-12-31' },
];

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

/** Bucket items into time periods by assigned_at date */
function bucketItems(items: Resource360Item[]): Resource360Item[][] {
  const buckets: Resource360Item[][] = [[], [], [], []];
  items.forEach((item) => {
    const d = item.assigned_at?.slice(0, 10) ?? '';
    for (let i = 0; i < PERIODS.length; i++) {
      if (d >= PERIODS[i].startDate && d <= PERIODS[i].endDate) {
        buckets[i].push(item);
        return;
      }
    }
    buckets[3].push(item);
  });
  return buckets;
}

export function Resource360Ring({
  items,
  resourceName,
  resourceAvatar,
  jobRole,
  department,
  statusFilter,
  onStatusFilterChange,
  onItemClick,
}: Resource360RingProps) {
  const [ringLevel, setRingLevel] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 740 });

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth || 900;
        setDimensions({ width: w, height: Math.max(740, w * 0.92) });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const filtered = statusFilter === 'all'
    ? items
    : items.filter((t) => getStatusCategory(t.status, t.status_category) === statusFilter);

  const buckets = bucketItems(filtered);

  const compactItems: Resource360Item[] = [];
  for (let i = 0; i < ringLevel; i++) {
    compactItems.push(...buckets[i]);
  }
  const fullItems = buckets[ringLevel] ?? [];

  const canExpand = ringLevel < PERIODS.length - 1;
  const canCollapse = ringLevel > 0;

  const { width: W, height: H } = dimensions;
  const cx = W / 2;
  const cy = H / 2 + 10;
  const avatarR = 36;
  const fullR = Math.max(220, Math.min(W, H) / 2 - 100);
  const compactR = ringLevel > 0 ? Math.max(90, fullR * 0.42) : 0;

  const initials = resourceName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const filterOptions: { value: StatusCategory; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'todo', label: 'To Do' },
    { value: 'progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  return (
    <div className="flex flex-col w-full" ref={containerRef}>
      {/* Status filter bar */}
      <div className="flex items-center gap-5 px-4 py-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
        {filterOptions.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer select-none" style={{ color: '#334155', fontWeight: 500 }}>
            <input
              type="radio"
              name="r360-status-filter"
              checked={statusFilter === opt.value}
              onChange={() => onStatusFilterChange(opt.value)}
              className="w-3.5 h-3.5 cursor-pointer"
              style={{ accentColor: '#2563EB' }}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Ring canvas */}
      <div className="relative" style={{ width: W, height: H }}>
        <div className="relative" style={{ width: W, height: H }}>
          {/* SVG layer — rings, spokes, labels */}
          <svg width={W} height={H} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            {/* Full ring band */}
            <circle cx={cx} cy={cy} r={fullR} fill="none" stroke="#E2E8F0" strokeWidth={1} />
            <circle cx={cx} cy={cy} r={fullR} fill="none" stroke="#F1F5F9" strokeWidth={40} opacity={0.25} />

            {/* Compact ring (when expanded) */}
            {ringLevel > 0 && compactItems.length > 0 && (
              <>
                <circle cx={cx} cy={cy} r={compactR} fill="none" stroke="#E2E8F0" strokeWidth={1} strokeDasharray="4 4" />
                <circle cx={cx} cy={cy} r={compactR} fill="none" stroke="#F8FAFC" strokeWidth={24} opacity={0.3} />
              </>
            )}

            {/* Avatar glow ring */}
            <circle cx={cx} cy={cy} r={avatarR + 10} fill="none" stroke="#DBEAFE" strokeWidth={3} opacity={0.5} />

            {/* Spokes to full nodes */}
            {fullItems.map((_, fi) => {
              const angle = (-90 + (360 / fullItems.length) * fi) * (Math.PI / 180);
              const x1 = cx + Math.cos(angle) * (avatarR + 16);
              const y1 = cy + Math.sin(angle) * (avatarR + 16);
              const x2 = cx + Math.cos(angle) * (fullR - 18);
              const y2 = cy + Math.sin(angle) * (fullR - 18);
              return <line key={`s-${fi}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E2E8F0" strokeWidth={1} />;
            })}

            {/* Spokes to compact nodes */}
            {ringLevel > 0 && compactItems.map((_, ci) => {
              const angle = (-90 + (360 / compactItems.length) * ci) * (Math.PI / 180);
              const x1 = cx + Math.cos(angle) * (avatarR + 16);
              const y1 = cy + Math.sin(angle) * (avatarR + 16);
              const x2 = cx + Math.cos(angle) * (compactR - 10);
              const y2 = cy + Math.sin(angle) * (compactR - 10);
              return <line key={`cs-${ci}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3 3" />;
            })}

            {/* Horizontal period label at 3 o'clock */}
            {fullItems.length > 0 && (
              <>
                <text x={cx + fullR + 26} y={cy - 6} fill="#334155" fontSize={11} fontWeight={700} fontFamily="Inter, sans-serif" letterSpacing="0.04em">
                  {PERIODS[ringLevel].label.toUpperCase()}
                </text>
                <text x={cx + fullR + 26} y={cy + 10} fill="#94A3B8" fontSize={10} fontFamily="Inter, sans-serif">
                  {PERIODS[ringLevel].sub} · {fullItems.length} items
                </text>
              </>
            )}

            {/* Compact ring label */}
            {ringLevel > 0 && compactItems.length > 0 && (
              <text x={cx + compactR + 14} y={cy - 4} fill="#94A3B8" fontSize={9} fontWeight={600} fontFamily="Inter, sans-serif" letterSpacing="0.06em">
                EARLIER · {compactItems.length}
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
              <img
                src={resourceAvatar}
                alt={resourceName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <span
              className={`absolute inset-0 flex items-center justify-center text-white font-bold ${resourceAvatar ? 'hidden' : ''}`}
              style={{ fontSize: 18, fontFamily: 'Inter, sans-serif' }}
            >
              {initials}
            </span>
          </div>

          {/* Name + role below avatar */}
          <div
            className="absolute text-center"
            style={{
              left: cx - 100, top: cy + avatarR + 12,
              width: 200, zIndex: 10,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Inter, sans-serif', margin: 0, lineHeight: 1.3 }}>
              {resourceName}
            </p>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#64748B', fontFamily: 'Inter, sans-serif', margin: '2px 0 0', lineHeight: 1.3 }}>
              {jobRole} · {department}
            </p>
          </div>

          {/* Full detail nodes */}
          {fullItems.map((item, fi) => {
            const angle = (-90 + (360 / fullItems.length) * fi) * (Math.PI / 180);
            const nx = cx + Math.cos(angle) * fullR;
            const ny = cy + Math.sin(angle) * fullR;
            return (
              <Resource360RingNode
                key={item.work_item_id}
                item={item}
                x={nx}
                y={ny}
                onClick={() => onItemClick(item)}
              />
            );
          })}

          {/* Compact pill nodes */}
          {ringLevel > 0 && compactItems.map((item, ci) => {
            const angle = (-90 + (360 / compactItems.length) * ci) * (Math.PI / 180);
            const nx = cx + Math.cos(angle) * compactR;
            const ny = cy + Math.sin(angle) * compactR;
            return (
              <Resource360CompactNode
                key={`c-${item.work_item_id}`}
                item={item}
                x={nx}
                y={ny}
                onClick={() => onItemClick(item)}
              />
            );
          })}

          {/* Expand chevron — 3 o'clock on ring */}
          {canExpand && (
            <button
              onClick={() => setRingLevel((l) => Math.min(l + 1, PERIODS.length - 1))}
              title="Show older items"
              className="absolute z-30 flex items-center justify-center rounded-full bg-white transition-all"
              style={{
                left: cx + fullR - 22, top: cy - 22,
                width: 44, height: 44,
                border: '2px solid #2563EB',
                fontSize: 18, fontWeight: 700, color: '#2563EB',
                boxShadow: '0 4px 16px rgba(37,99,235,.12)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#2563EB';
                (e.currentTarget as HTMLElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#fff';
                (e.currentTarget as HTMLElement).style.color = '#2563EB';
              }}
            >
              ›
            </button>
          )}

          {/* Collapse chevron — 9 o'clock on ring */}
          {canCollapse && (
            <button
              onClick={() => setRingLevel((l) => Math.max(l - 1, 0))}
              title="Show newer items"
              className="absolute z-30 flex items-center justify-center rounded-full bg-white transition-all"
              style={{
                left: cx - fullR - 22, top: cy - 22,
                width: 44, height: 44,
                border: '2px solid #2563EB',
                fontSize: 18, fontWeight: 700, color: '#2563EB',
                boxShadow: '0 4px 16px rgba(37,99,235,.12)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#2563EB';
                (e.currentTarget as HTMLElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#fff';
                (e.currentTarget as HTMLElement).style.color = '#2563EB';
              }}
            >
              ‹
            </button>
          )}

          {/* Empty state */}
          {fullItems.length === 0 && compactItems.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 15 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No tickets match</p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Try a different filter</p>
            </div>
          )}

          {/* Level indicator dots */}
          <div className="absolute flex items-center gap-1.5" style={{ left: cx - 24, top: H - 20, zIndex: 10 }}>
            {PERIODS.map((p, i) => (
              <div
                key={p.label}
                className="rounded-full transition-all"
                style={{
                  width: i === ringLevel ? 16 : 6,
                  height: 6,
                  background: i === ringLevel ? '#2563EB' : '#CBD5E1',
                  borderRadius: i === ringLevel ? 3 : '50%',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
