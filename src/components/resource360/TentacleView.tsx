import React, { useMemo, useState, useEffect, useRef } from 'react';
import { HUB_COLORS, HUB_SHORT, WIT_STYLES } from '@/constants/resource360';
import { getStatusCategory, SC_COLORS, type StatusCategory } from '@/utils/statusCategory';
import type { RoleFilter } from './Toolbar';

interface TentacleViewProps {
  resource: any;
  items: any[];
  roleFilter: RoleFilter;
  onItemClick: (item: any) => void;
}

const NODE_W = 185;
const ITEMS_PER_RING = 8;
const FIRST_RING_RADIUS = 200;
const RING_GAP = 130;

interface NodePosition { x: number; y: number; item: any; }

function deriveHub(item: any): string {
  if (item.source_hub && item.source_hub !== 'ProjectHub') return item.source_hub;
  const type = (item.work_item_type || '').toLowerCase();
  if (['test case', 'test plan'].includes(type)) return 'TestHub';
  if (['incident'].includes(type)) return 'IncidentHub';
  if (['task'].includes(type)) return 'TaskHub';
  return item.source_hub || 'ProjectHub';
}

function calculateNodePositions(items: any[], canvasW: number, canvasH: number): NodePosition[] {
  const cx = canvasW / 2;
  const cy = canvasH / 2;

  const todoItems = items.filter(i => getStatusCategory(i.status_category || i.status) === 'todo');
  const progressItems = items.filter(i => getStatusCategory(i.status_category || i.status) === 'progress');
  const doneItems = items.filter(i => getStatusCategory(i.status_category || i.status) === 'done');

  const zones = [
    { items: todoItems,     startDeg: 126, endDeg: 234,  label: 'TO DO' },
    { items: progressItems, startDeg: 306, endDeg: 414,  label: 'IN PROGRESS' },
    { items: doneItems,     startDeg: 54,  endDeg: 126,  label: 'DONE' },
  ];

  const positions: NodePosition[] = [];

  zones.forEach(zone => {
    const count = zone.items.length;
    if (count === 0) return;

    const rings = Math.ceil(count / ITEMS_PER_RING);
    let itemIndex = 0;

    for (let ring = 0; ring < rings; ring++) {
      const radius = FIRST_RING_RADIUS + (ring * RING_GAP);
      const itemsThisRing = Math.min(ITEMS_PER_RING, count - itemIndex);
      const angleSpan = zone.endDeg - zone.startDeg;
      const angleStep = angleSpan / (itemsThisRing + 1);

      for (let j = 0; j < itemsThisRing; j++) {
        const angleDeg = zone.startDeg + angleStep * (j + 1);
        const angleRad = (angleDeg * Math.PI) / 180;
        const x = cx + Math.cos(angleRad) * radius;
        const y = cy + Math.sin(angleRad) * radius;

        const clampedX = Math.max(NODE_W / 2 + 10, Math.min(canvasW - NODE_W / 2 - 10, x));
        const clampedY = Math.max(70, Math.min(canvasH - 70, y));

        positions.push({ x: clampedX, y: clampedY, item: zone.items[itemIndex] });
        itemIndex++;
      }
    }
  });

  return positions;
}

const ageColor = (days: number | null | undefined): string => {
  if (days == null) return '#64748B';
  if (days > 14) return '#DC2626';
  if (days > 7) return '#D97706';
  return '#64748B';
};

const TentacleView: React.FC<TentacleViewProps> = ({ resource, items, roleFilter, onItemClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  const [pulseCount, setPulseCount] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (pulseCount >= 3) return;
    const timer = setTimeout(() => setPulseCount(c => c + 1), 1500);
    return () => clearTimeout(timer);
  }, [pulseCount]);

  // Enrich items with computed status category + age + hub
  const enriched = useMemo(() => {
    return items.map(it => {
      const sc = getStatusCategory(it.status_category || it.status);
      const createdAt = it.assigned_date || it.jira_created_at;
      let ageDays: number | null = null;
      if (createdAt) {
        ageDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
      }
      return { ...it, _sc: sc, age_days: it.age_days ?? ageDays, _hub: deriveHub(it) };
    });
  }, [items]);

  const filtered = useMemo(() => {
    if (roleFilter === 'all') return enriched;
    return enriched.filter(i => i.resource_role === roleFilter);
  }, [enriched, roleFilter]);

  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const positions = useMemo(() => calculateNodePositions(filtered, dims.w, dims.h), [filtered, dims.w, dims.h]);

  const initials = resource?.initials || resource?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';

  if (filtered.length === 0) {
    return (
      <div ref={containerRef} style={{
        position: 'relative', width: '100%', minHeight: 500, height: 'calc(100vh - 280px)',
        background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 28, color: '#94A3B8' }}>○</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
          {roleFilter !== 'all' ? 'No items match role filter' : 'No work items assigned yet'}
        </div>
        <div style={{ fontSize: 12, color: '#64748B' }}>
          {roleFilter !== 'all' ? 'Try switching to "All" to see all items' : 'Items from across 7 hubs will appear here as they\'re assigned'}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{
      position: 'relative', width: '100%', minHeight: 500, height: 'calc(100vh - 280px)',
      background: '#F8FAFC', overflow: 'auto', fontFamily: "'Inter', sans-serif",
    }}>
      {/* Zone labels */}
      <div style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase', zIndex: 2 }}>TO DO</div>
      <div style={{ position: 'absolute', right: 24, top: '22%', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase', zIndex: 2 }}>IN PROGRESS</div>
      <div style={{ position: 'absolute', right: 24, bottom: '22%', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase', zIndex: 2 }}>DONE</div>

      {/* SVG bezier lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
        {positions.map((pos, i) => {
          const midX = (cx + pos.x) / 2;
          const sc = pos.item._sc as StatusCategory;
          const lineColor = sc === 'todo' ? '#FCA5A5' : sc === 'progress' ? '#93C5FD' : '#6EE7B7';
          const isDashed = pos.item.resource_role === 'reported';
          return (
            <path
              key={pos.item.id || i}
              d={`M ${cx} ${cy} Q ${midX} ${cy}, ${pos.x} ${pos.y}`}
              fill="none"
              stroke={lineColor}
              strokeWidth={1.5}
              strokeDasharray={isDashed ? '6 4' : 'none'}
              opacity={0.7}
            />
          );
        })}
      </svg>

      {/* Center avatar */}
      <div
        tabIndex={0}
        aria-label={`Center avatar for ${resource?.full_name || 'resource'}`}
        style={{
          position: 'absolute',
          left: cx - 36, top: cy - 36,
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFFFFF', fontSize: 24, fontWeight: 700,
          zIndex: 10,
          animation: pulseCount < 3 ? 'r360pulse 1.5s ease-in-out' : 'none',
          boxShadow: '0 0 0 4px #FFFFFF, 0 0 0 6px #2563EB, 0 4px 16px rgba(37,99,235,.25)',
        }}
      >
        {initials}
      </div>

      {/* Ticket node cards */}
      {positions.map((pos, i) => {
        const it = pos.item;
        const sc = it._sc as StatusCategory;
        const colors = SC_COLORS[sc];
        const witStyle = WIT_STYLES[it.work_item_type] || { bg: '#F1F5F9', color: '#334155' };
        const hub = it._hub;
        const hubColor = HUB_COLORS[hub] || '#64748B';
        const hubShort = HUB_SHORT[hub] || '';
        const isReported = it.resource_role === 'reported';

        return (
          <div
            key={it.id || i}
            tabIndex={0}
            role="button"
            aria-label={`Work item ${it.item_key}: ${it.title}`}
            onClick={() => onItemClick(it)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemClick(it); } }}
            style={{
              position: 'absolute',
              left: pos.x - NODE_W / 2,
              top: pos.y - 60,
              width: NODE_W,
              background: '#FFFFFF',
              borderRadius: 8,
              borderLeft: `3.5px ${isReported ? 'dashed' : 'solid'} ${colors.dot}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              padding: '8px 10px',
              cursor: 'pointer',
              zIndex: 5,
              animation: `nodeAppear 300ms ease-out ${i * 40}ms both`,
              transition: 'box-shadow 150ms, transform 150ms',
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
          >
            {/* Row 1: Key + Type badge + Hub badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                {it.item_key}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                background: witStyle.bg, color: witStyle.color,
              }}>
                {it.work_item_type}
              </span>
              <span style={{
                fontSize: 8.5, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                background: hubColor, color: '#FFFFFF', marginLeft: 'auto',
              }}>
                {hubShort}
              </span>
            </div>

            {/* Row 2: Title (2-line clamp) */}
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#0F172A',
              lineHeight: 1.3,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              marginBottom: 6,
            }}>
              {it.title}
            </div>

            {/* Row 3: Status pill + Age + Role circle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                background: colors.bg, color: colors.text,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: colors.dot }} />
                {it.status}
              </span>

              {/* Age badge */}
              <span style={{
                fontSize: 10, fontWeight: 600, marginLeft: 'auto',
                color: ageColor(it.age_days),
              }}>
                {it.age_days != null ? `${it.age_days}d` : '—'}
              </span>

              {/* Role indicator: solid = assigned, outline = reported. Color from status category */}
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: isReported ? 'transparent' : colors.dot,
                border: isReported ? `1.5px solid ${colors.dot}` : 'none',
              }} />
            </div>

            {/* Row 4: Parent chain */}
            {it.parent_item_key && (
              <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 4, fontFamily: 'monospace' }}>
                ↳ {it.parent_item_key}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes nodeAppear {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes r360pulse {
          0% { box-shadow: 0 0 0 4px #fff, 0 0 0 6px #2563EB, 0 0 0 6px rgba(37,99,235,0.4); }
          100% { box-shadow: 0 0 0 4px #fff, 0 0 0 6px #2563EB, 0 0 0 24px rgba(37,99,235,0); }
        }
        *:focus-visible { outline: 2px solid #2563EB; outline-offset: 2px; }
      `}</style>
    </div>
  );
};

export default TentacleView;
