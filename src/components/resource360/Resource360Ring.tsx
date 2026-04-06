import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Resource360Item, StatusCategory } from '@/types/resource360';
import { getStatusCategory, getStaleIndicator, WH_HUB_COLORS, WH_HUB_SHORT, STATUS_COLORS } from '@/types/resource360';

const MAX_PER_PAGE = 8;
const T = {
  bg: '#F5F0EB', surface: '#FFFFFF', text1: '#0A0A0A', text2: '#1A1A2E',
  text3: '#3D3D56', text4: '#6B6B80', border: '#D9D2C9', borderStrong: '#C5BDB3',
  todo: '#E23636', progress: '#2563EB', done: '#0E8A5F',
  shadow: '0 2px 10px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.04)',
  shadowHover: '0 8px 24px rgba(0,0,0,.18)',
  mono: "'JetBrains Mono','SF Mono',monospace",
};

interface Props {
  items: Resource360Item[];
  resourceName: string;
  resourceAvatar: string | null;
  jobRole: string;
  department: string;
  statusFilter: StatusCategory;
  onStatusFilterChange: (filter: StatusCategory) => void;
  onItemClick: (item: Resource360Item) => void;
}

export function Resource360Ring({ items, resourceName, resourceAvatar, jobRole, department, statusFilter, onStatusFilterChange, onItemClick }: Props) {
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 680, h: 640 });

  useEffect(() => {
    const m = () => {
      if (containerRef.current) {
        const w = Math.min(containerRef.current.offsetWidth * 0.65, 720);
        setDims({ w, h: Math.max(600, w * 0.9) });
      }
    };
    m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m);
  }, []);

  const activeItems = useMemo(() =>
    items.filter(i => {
      const cat = getStatusCategory(i.status, i.status_category);
      if (cat === 'done') return false;
      if (statusFilter !== 'all' && statusFilter !== 'todo' && statusFilter !== 'progress') return true;
      if (statusFilter === 'todo' && cat !== 'todo') return false;
      if (statusFilter === 'progress' && cat !== 'progress') return false;
      return true;
    }).sort((a, b) => b.age_days - a.age_days), [items, statusFilter]);

  const doneItems = useMemo(() =>
    items.filter(i => getStatusCategory(i.status, i.status_category) === 'done')
      .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()), [items]);

  const totalPages = Math.max(1, Math.ceil(activeItems.length / MAX_PER_PAGE));
  useEffect(() => { setPage(0); }, [statusFilter]);
  const visible = activeItems.slice(page * MAX_PER_PAGE, (page + 1) * MAX_PER_PAGE);

  const { w: W, h: H } = dims;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - 100;
  const initials = resourceName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const placeOnRing = (i: number, total: number) => {
    const angle = (-90 + (360 / Math.max(total, 1)) * i) * (Math.PI / 180);
    return { x: cx + Math.cos(angle) * R, y: cy + Math.sin(angle) * R };
  };

  const todoCount = items.filter(i => getStatusCategory(i.status, i.status_category) === 'todo').length;
  const progCount = items.filter(i => getStatusCategory(i.status, i.status_category) === 'progress').length;

  return (
    <div ref={containerRef} style={{ display: 'flex', fontFamily: "'Inter', sans-serif", height: '100%' }}>
      {/* LEFT: Ring */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* D14: ACTIVE WORK header with visual weight */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          background: T.surface, borderBottom: `2px solid ${T.text2}`,
          boxShadow: '0 2px 4px rgba(0,0,0,.04)',
        }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: T.text2, letterSpacing: '.08em', textTransform: 'uppercase' }}>Active Work</span>
          {/* D14: Item count as dark pill */}
          <span style={{
            background: '#2563EB', color: '#fff', padding: '2px 8px', borderRadius: 12,
            fontSize: 10, fontWeight: 700,
          }}>{activeItems.length} Items</span>
          {/* D15: Filter buttons with visible borders when inactive */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {(['all', 'todo', 'progress'] as const).map(f => {
              const active = statusFilter === f;
              const label = f === 'all' ? `All (${todoCount + progCount})` : f === 'todo' ? `To Do (${todoCount})` : `In Progress (${progCount})`;
              return (
                <button key={f} onClick={() => onStatusFilterChange(f as StatusCategory)}
                  style={{
                    padding: '4px 12px', fontSize: 10, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                    background: active ? '#2563EB' : T.surface,
                    color: active ? '#fff' : T.text3,
                    border: active ? 'none' : `1.5px solid ${T.borderStrong}`,
                    transition: 'all .12s',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.bg; e.currentTarget.style.borderColor = T.text2; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.borderStrong; } }}
                >{label}</button>
              );
            })}
          </div>
        </div>

        {/* D01/D02: Ring canvas with warm ivory radial gradient */}
        <div style={{
          position: 'relative', width: W, height: H, margin: '0 auto',
          background: 'radial-gradient(ellipse at center, #FAF7F3 0%, #F5F0EB 40%, #EDE7E0 100%)',
        }}>
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* D05: Atmospheric depth — subtle shadow behind ring */}
            <circle cx={cx} cy={cy} r={R + 20} fill="none" stroke="#E8E2DA" strokeWidth={40} opacity={0.3} />
            {/* D04: Visible dashed orbital track */}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.border} strokeWidth={2} strokeDasharray="8,4"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.06))' }} />
            {/* D03: Spokes with visible weight */}
            {visible.map((_, i) => {
              const { x, y } = placeOnRing(i, visible.length);
              const a = Math.atan2(y - cy, x - cx);
              return (
                <line key={i}
                  x1={cx + Math.cos(a) * 46} y1={cy + Math.sin(a) * 46}
                  x2={cx + Math.cos(a) * (R - 20)} y2={cy + Math.sin(a) * (R - 20)}
                  stroke={T.borderStrong} strokeWidth={1.5} />
              );
            })}
          </svg>

          {/* D23: Avatar with 3-ring glow */}
          <div style={{
            position: 'absolute', left: cx - 36, top: cy - 36, width: 72, height: 72,
            borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 4px #FFFFFF, 0 0 0 6px #2563EB, 0 4px 20px rgba(37,99,235,.25)',
            zIndex: 10, overflow: 'hidden',
          }}>
            {resourceAvatar ? <img src={resourceAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : null}
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>
              {!resourceAvatar && initials}
            </span>
          </div>
          <div style={{ position: 'absolute', left: cx - 80, top: cy + 44, width: 160, textAlign: 'center', zIndex: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.text1, margin: 0 }}>{resourceName}</p>
            <p style={{ fontSize: 10, color: T.text4, margin: 0 }}>{jobRole}</p>
          </div>

          {/* D06/D07/D08/D09: Cards with proper shadows, hover lift, top bevel, status truncation */}
          {visible.map((item, i) => {
            const { x, y } = placeOnRing(i, visible.length);
            const cat = getStatusCategory(item.status, item.status_category);
            const sc = cat === 'todo' ? T.todo : T.progress;
            const hc = WH_HUB_COLORS[item.hub] ?? '#64748B';
            const hs = WH_HUB_SHORT[item.hub] ?? item.hub?.slice(0, 4).toUpperCase();
            const stale = getStaleIndicator(item.age_days, item.status, item.status_category);
            const statusLabel = item.status.length > 12 ? item.status.slice(0, 12) + '…' : item.status;
            return (
              <div key={item.work_item_id} onClick={() => onItemClick(item)} style={{
                position: 'absolute', zIndex: 5, cursor: 'pointer', left: x, top: y, transform: 'translate(-50%,-50%)',
                width: 162, background: T.surface, borderRadius: 8, padding: '8px 10px 8px 13px',
                border: `1px solid ${stale ? stale.color : T.border}`, borderLeft: `4px solid ${sc}`,
                borderTop: '1px solid rgba(255,255,255,.8)',
                boxShadow: T.shadow, transition: 'all .15s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = T.shadowHover;
                  e.currentTarget.style.zIndex = '20';
                  e.currentTarget.style.transform = 'translate(-50%,-50%) translateY(-4px) scale(1.03)';
                  e.currentTarget.style.borderColor = 'var(--cp-blue)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = T.shadow;
                  e.currentTarget.style.zIndex = '5';
                  e.currentTarget.style.transform = 'translate(-50%,-50%)';
                  e.currentTarget.style.borderColor = stale ? stale.color : T.border;
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.text1 }}>{item.item_key}</span>
                  <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', padding: '1px 5px', borderRadius: 4, background: hc }}>{hs}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.text2, lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{item.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: sc, padding: '1px 6px', borderRadius: 4, minWidth: 70, textAlign: 'center' }}>
                    {statusLabel}
                  </span>
                  <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 700, color: item.age_days > 14 ? T.todo : T.text4 }}>{item.age_days}d</span>
                  {stale && <span title={stale.label} style={{ fontSize: 10 }}>{stale.icon}</span>}
                </div>
              </div>
            );
          })}

          {/* D19: Pagination as floating frosted-glass pill */}
          {totalPages > 1 && (
            <div style={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 8, zIndex: 20,
              background: 'rgba(255,255,255,.95)', borderRadius: 12, padding: '6px 16px',
              boxShadow: '0 4px 16px rgba(0,0,0,.15)', backdropFilter: 'blur(8px)',
            }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{
                width: 36, height: 50, borderRadius: 6,
                background: page === 0 ? T.bg : '#2563EB', color: page === 0 ? T.text4 : '#fff',
                border: 'none', cursor: page === 0 ? 'default' : 'pointer', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>‹</button>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.text3 }}>{page + 1}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{
                width: 36, height: 50, borderRadius: 6,
                background: page === totalPages - 1 ? T.bg : '#2563EB', color: page === totalPages - 1 ? T.text4 : '#fff',
                border: 'none', cursor: page === totalPages - 1 ? 'default' : 'pointer', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>›</button>
            </div>
          )}
          {visible.length === 0 && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 14, fontWeight: 600, color: T.text4 }}>No active items</p></div>}
        </div>
      </div>

      {/* D10/D11/D12/D13: Completed sidebar with warm bg, shadow, green header, alternating rows */}
      <div style={{
        width: 260, borderLeft: `2px solid ${T.border}`, background: '#FAF8F5',
        overflowY: 'auto', flexShrink: 0,
        boxShadow: '-4px 0 12px rgba(0,0,0,.06)',
      }}>
        {/* D11: Strong green header */}
        <div style={{
          padding: '10px 12px', borderBottom: '2px solid #0E8A5F',
          background: '#E8F5E9', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.done }}>✓ Completed</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.text4, marginLeft: 'auto' }}>{doneItems.length}</span>
        </div>
        {doneItems.map((item, idx) => {
          const hc = WH_HUB_COLORS[item.hub] ?? '#64748B';
          const hs = WH_HUB_SHORT[item.hub] ?? item.hub?.slice(0, 4).toUpperCase();
          return (
            <div key={item.work_item_id} onClick={() => onItemClick(item)} style={{
              padding: '8px 12px', cursor: 'pointer',
              borderBottom: `1px solid ${T.border}`,
              borderLeft: '3px solid #0E8A5F',
              background: idx % 2 === 0 ? '#FAF8F5' : T.surface,
              transition: 'background .1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EDE7E0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? '#FAF8F5' : T.surface; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.text3 }}>{item.item_key}</span>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', padding: '1px 5px', borderRadius: 4, background: hc }}>{hs}</span>
                {/* D13: Monospace dates with distinct style */}
                <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: 'var(--fg-3)', marginLeft: 'auto' }}>{item.assigned_at?.slice(5, 10)}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
            </div>
          );
        })}
        {doneItems.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: T.text4 }}>No completed items</div>}
      </div>
    </div>
  );
}