import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { HUB_COLORS, HUB_SHORT, STATUS_CATEGORY_COLORS, WIT_STYLES, PRIORITY_ICONS } from '@/constants/resource360';
import type { RoleFilter } from './Toolbar';

interface TentacleViewProps {
  resource: any;
  items: any[];
  roleFilter: RoleFilter;
  onItemClick: (item: any) => void;
}

// Force-directed positioning using Fruchterman-Reingold
function computePositions(items: any[], cx: number, cy: number) {
  const minDist = 195;
  const zones: Record<string, [number, number]> = {
    todo: [126, 234],
    progress: [-54, 54],
    done: [270, 378],
  };

  // Initial placement
  const grouped: Record<string, any[]> = { todo: [], progress: [], done: [] };
  items.forEach(it => {
    const cat = it.status_category || 'todo';
    (grouped[cat] || grouped.todo).push(it);
  });

  const positions: { x: number; y: number; item: any }[] = [];

  Object.entries(grouped).forEach(([cat, catItems]) => {
    const [startDeg, endDeg] = zones[cat] || [0, 120];
    const count = catItems.length;
    catItems.forEach((item, i) => {
      const frac = count === 1 ? 0.5 : i / (count - 1);
      const angleDeg = startDeg + frac * (endDeg - startDeg);
      const angleRad = (angleDeg * Math.PI) / 180;
      const radius = 200 + (i % 2) * 60;
      positions.push({
        x: cx + Math.cos(angleRad) * radius,
        y: cy + Math.sin(angleRad) * radius,
        item,
      });
    });
  });

  // Repulsion iterations
  for (let iter = 0; iter < 8; iter++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < minDist) {
          const force = (minDist - dist) / 2;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          positions[i].x -= fx;
          positions[i].y -= fy;
          positions[j].x += fx;
          positions[j].y += fy;
        }
      }
    }
  }

  return positions;
}

const NODE_W = 185;
const NODE_H = 120;

const TentacleView: React.FC<TentacleViewProps> = ({ resource, items, roleFilter, onItemClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 700 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const filtered = useMemo(() => {
    if (roleFilter === 'all') return items;
    return items.filter(i => i.resource_role === roleFilter);
  }, [items, roleFilter]);

  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const positions = useMemo(() => computePositions(filtered, cx, cy), [filtered, cx, cy]);

  const initials = resource?.initials || resource?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      width: '100%',
      minHeight: 500,
      height: 'calc(100vh - 280px)',
      background: '#F8FAFC',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Zone labels */}
      <div style={{ position: 'absolute', left: 40, top: '50%', transform: 'translateY(-50%)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase' }}>TO DO</div>
      <div style={{ position: 'absolute', right: 40, top: '28%', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase' }}>IN PROGRESS</div>
      <div style={{ position: 'absolute', right: 40, bottom: '20%', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase' }}>DONE</div>

      {/* SVG lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {positions.map((pos, i) => {
          const nx = pos.x;
          const ny = pos.y;
          const cpx1 = cx + (nx - cx) * 0.3;
          const cpy1 = cy + (ny - cy) * 0.1;
          const cpx2 = cx + (nx - cx) * 0.7;
          const cpy2 = cy + (ny - cy) * 0.9;
          const isDashed = pos.item.resource_role === 'reported';
          return (
            <path
              key={i}
              d={`M ${cx} ${cy} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${nx} ${ny}`}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={1.5}
              strokeDasharray={isDashed ? '6 4' : 'none'}
            />
          );
        })}
      </svg>

      {/* Center avatar */}
      <div style={{
        position: 'absolute',
        left: cx - 36,
        top: cy - 36,
        width: 72, height: 72, borderRadius: '50%',
        background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#FFFFFF', fontSize: 24, fontWeight: 700,
        boxShadow: '0 0 0 3px #FFFFFF, 0 0 0 5px #2563EB, 0 4px 16px rgba(37,99,235,.25)',
        zIndex: 10,
      }}>
        {initials}
      </div>

      {/* Ticket nodes */}
      {positions.map((pos, i) => {
        const it = pos.item;
        const sc = STATUS_CATEGORY_COLORS[it.status_category as keyof typeof STATUS_CATEGORY_COLORS];
        const witStyle = WIT_STYLES[it.work_item_type] || { bg: '#F1F5F9', color: '#334155' };
        const hubColor = HUB_COLORS[it.source_hub] || '#64748B';
        const hubShort = HUB_SHORT[it.source_hub] || '';
        const isReported = it.resource_role === 'reported';

        return (
          <div
            key={it.id}
            onClick={() => onItemClick(it)}
            style={{
              position: 'absolute',
              left: pos.x - NODE_W / 2,
              top: pos.y - NODE_H / 2,
              width: NODE_W,
              background: '#FFFFFF',
              borderRadius: 8,
              borderLeft: `3.5px ${isReported ? 'dashed' : 'solid'} ${sc?.dot || '#64748B'}`,
              boxShadow: '0 1px 4px rgba(0,0,0,.08)',
              padding: '8px 10px',
              cursor: 'pointer',
              zIndex: 5,
              animation: `fadeSlideIn 300ms ease-out ${i * 40}ms both`,
              transition: 'box-shadow 150ms, transform 150ms',
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.14)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {/* Top row: key + badges */}
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

            {/* Title */}
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#0F172A',
              lineHeight: 1.3,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              marginBottom: 6,
            }}>
              {it.title}
            </div>

            {/* Bottom row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {sc && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                  background: sc.bg, color: sc.text,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                  {it.status}
                </span>
              )}
              <span style={{ fontSize: 10, color: it.age_days > 14 ? '#DC2626' : it.age_days > 7 ? '#D97706' : '#059669', fontWeight: 600, marginLeft: 'auto' }}>
                {it.age_days}d
              </span>
              <span style={{ fontSize: 11 }}>{PRIORITY_ICONS[it.priority] || ''}</span>
              {/* Role indicator */}
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                background: isReported ? 'transparent' : sc?.dot || '#64748B',
                color: isReported ? sc?.dot || '#64748B' : '#FFFFFF',
                border: isReported ? `1.5px solid ${sc?.dot || '#64748B'}` : 'none',
              }}>
                {isReported ? 'R' : 'A'}
              </span>
            </div>

            {/* Parent breadcrumb */}
            {it.parent_item_key && (
              <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 4, fontFamily: 'monospace' }}>
                ↳ {it.parent_item_key}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default TentacleView;
