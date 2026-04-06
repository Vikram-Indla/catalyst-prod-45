import React, { useMemo, useState, useEffect, useRef } from 'react';
import { HUB_COLORS, HUB_SHORT } from '@/constants/resource360';
import { getStatusCategory, type StatusCategory } from '@/utils/statusCategory';
import type { RoleFilter } from './Toolbar';

interface TentacleViewProps {
  resource: any;
  items: any[];
  roleFilter: RoleFilter;
  onItemClick: (item: any) => void;
}

const MAX_PER_PAGE = 8;

// Ring-fenced tokens
const T = {
  bg: '#F5F0EB', surface: 'var(--bg-app)', text1: 'var(--fg-1)', text2: '#1A1A2E',
  text3: '#3D3D56', text4: 'var(--fg-3)', border: 'var(--divider)', borderStrong: 'var(--divider)',
  todo: '#E23636', progress: 'var(--cp-blue)', done: '#0E8A5F',
  shadow: '0 2px 8px rgba(0,0,0,.12)', shadowHover: '0 6px 20px rgba(0,0,0,.15)',
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

type ActiveFilter = 'all' | 'todo' | 'progress';

const TentacleView: React.FC<TentacleViewProps> = ({ resource, items, roleFilter, onItemClick }) => {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ActiveFilter>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 700, h: 680 });

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = Math.min(rect.width * 0.65, 720);
        setDims({ w, h: Math.max(640, w * 0.95) });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Split: active vs done
  const activeItems = useMemo(() =>
    items.filter(i => {
      const cat = getStatusCategory(i.status_category || i.status);
      if (statusFilter !== 'all' && cat !== statusFilter) return false;
      return cat !== 'done';
    }).sort((a: any, b: any) => (b.age_days ?? 0) - (a.age_days ?? 0)),
    [items, statusFilter]
  );

  const doneItems = useMemo(() =>
    items.filter(i => getStatusCategory(i.status_category || i.status) === 'done')
      .sort((a: any, b: any) => new Date(b.assigned_at || 0).getTime() - new Date(a.assigned_at || 0).getTime()),
    [items]
  );

  // Pagination for ring
  const totalPages = Math.max(1, Math.ceil(activeItems.length / MAX_PER_PAGE));
  useEffect(() => { setPage(0); }, [statusFilter]);
  const visibleItems = activeItems.slice(page * MAX_PER_PAGE, (page + 1) * MAX_PER_PAGE);

  // Geometry
  const { w: W, h: H } = dims;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 100;

  const resourceName = resource?.full_name || 'Unknown';
  const jobRole = resource?.job_role || '';
  const initials = resourceName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const placeOnRing = (i: number, total: number) => {
    const angle = (-90 + (360 / Math.max(total, 1)) * i) * (Math.PI / 180);
    return { x: cx + Math.cos(angle) * R, y: cy + Math.sin(angle) * R };
  };

  const todoCount = items.filter(i => getStatusCategory(i.status_category || i.status) === 'todo').length;
  const progCount = items.filter(i => getStatusCategory(i.status_category || i.status) === 'progress').length;

  return (
    <div ref={containerRef} style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>

      {/* ═══ LEFT: Ring Area ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Filter bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.text1, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
            ACTIVE WORK
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: T.text4, marginRight: 8 }}>
            {activeItems.length} items
          </span>
          <div style={{ width: 1, height: 18, background: T.borderStrong }} />

          {(['all', 'todo', 'progress'] as ActiveFilter[]).map(f => {
            const active = statusFilter === f;
            const label = f === 'all' ? `All (${todoCount + progCount})` :
              f === 'todo' ? `To Do (${todoCount})` : `In Progress (${progCount})`;
            return (
              <button key={f} onClick={() => setStatusFilter(f)}
                style={{
                  padding: '4px 12px', fontSize: 10, fontWeight: 700,
                  borderRadius: 6, cursor: 'pointer', transition: 'all .12s',
                  background: active ? 'var(--cp-blue)' : T.surface,
                  color: active ? '#fff' : T.text3,
                  border: active ? 'none' : `1px solid ${T.borderStrong}`,
                }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Ring canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* SVG rings and spokes */}
          <svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
            {/* Outer ring band */}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.border} strokeWidth={1.5} opacity={0.5} />
            <circle cx={cx} cy={cy} r={R + 60} fill="none" stroke={T.border} strokeWidth={0.5} opacity={0.2} />

            {/* Status arc: todo portion */}
            {activeItems.length > 0 && (() => {
              const todoPct = activeItems.filter(i => getStatusCategory(i.status_category || i.status) === 'todo').length / activeItems.length;
              const circumference = 2 * Math.PI * R;
              return (
                <>
                  <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.todo} strokeWidth={3}
                    strokeDasharray={`${todoPct * circumference} ${circumference}`}
                    strokeDashoffset={circumference * 0.25} opacity={0.4} />
                  <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.progress} strokeWidth={3}
                    strokeDasharray={`${(1 - todoPct) * circumference} ${circumference}`}
                    strokeDashoffset={circumference * 0.25 - todoPct * circumference} opacity={0.4} />
                </>
              );
            })()}

            {/* Spokes */}
            {visibleItems.map((_: any, i: number) => {
              const { x, y } = placeOnRing(i, visibleItems.length);
              const angle = Math.atan2(y - cy, x - cx);
              return (
                <line key={i} x1={cx + Math.cos(angle) * 44} y1={cy + Math.sin(angle) * 44}
                  x2={cx + Math.cos(angle) * (R - 10)} y2={cy + Math.sin(angle) * (R - 10)}
                  stroke={T.border} strokeWidth={1} opacity={0.3} />
              );
            })}
          </svg>

          {/* Center avatar */}
          <div style={{
            position: 'absolute', left: cx, top: cy, transform: 'translate(-50%, -50%)',
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1A1A2E, #2D2D4A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 24, fontWeight: 800, zIndex: 10,
            boxShadow: '0 0 0 4px #FFFFFF, 0 0 0 6px #1A1A2E, 0 4px 16px rgba(0,0,0,.2)',
            overflow: 'hidden',
          }}>
            {!resource?.avatar_url && initials}
          </div>

          {/* Name + role below avatar */}
          <div style={{
            position: 'absolute', left: cx, top: cy + 56,
            transform: 'translateX(-50%)', textAlign: 'center', zIndex: 10,
          }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: T.text1, margin: 0 }}>{resourceName}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: T.text4, margin: 0 }}>{jobRole}</p>
          </div>

          {/* Item cards on ring */}
          {visibleItems.map((item: any, i: number) => {
            const { x, y } = placeOnRing(i, visibleItems.length);
            const cat = getStatusCategory(item.status_category || item.status);
            const statusColor = cat === 'todo' ? T.todo : T.progress;
            const hubColor = HUB_COLORS[item.hub || item.source_hub] ?? '#64748B';
            const hub = item.hub || item.source_hub || 'ProjectHub';
            const key = item.item_key || item.key || '—';
            const title = item.title || '';
            const status = item.status || '';
            const ageDays = item.age_days ?? 0;

            return (
              <div key={item.id || i} onClick={() => onItemClick(item)}
                style={{
                  position: 'absolute', zIndex: 5, cursor: 'pointer',
                  left: x, top: y, transform: 'translate(-50%, -50%)',
                  width: 162, background: T.surface,
                  borderRadius: 8, padding: '8px 10px 8px 13px',
                  border: `1px solid ${T.border}`,
                  boxShadow: T.shadow, transition: 'all .15s',
                  borderLeft: `4px solid ${statusColor}`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = T.shadowHover;
                  e.currentTarget.style.zIndex = '20';
                  e.currentTarget.style.transform = 'translate(-50%, -50%) translateY(-3px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = T.shadow;
                  e.currentTarget.style.zIndex = '5';
                  e.currentTarget.style.transform = 'translate(-50%, -50%)';
                }}>
                {/* Row 1: Key + Hub */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.text1 }}>
                    {key}
                  </span>
                  <span style={{
                    fontSize: 8, fontWeight: 800, color: '#fff', padding: '1px 5px',
                    borderRadius: 4, background: hubColor, textTransform: 'uppercase' as const,
                  }}>
                    {HUB_SHORT[hub] ?? hub.replace('Hub', '').slice(0, 4).toUpperCase()}
                  </span>
                </div>

                {/* Row 2: Title */}
                <div style={{
                  fontSize: 11, fontWeight: 600, color: T.text2, lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                }}>
                  {title}
                </div>

                {/* Row 3: Status + Age */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: '#fff', padding: '1px 6px',
                    borderRadius: 4, background: statusColor,
                  }}>
                    {status.length > 14 ? status.slice(0, 12) + '…' : status}
                  </span>
                  <span style={{
                    fontFamily: T.mono, fontSize: 9, fontWeight: 700,
                    color: ageDays > 14 ? T.todo : T.text4, marginLeft: 'auto',
                  }}>
                    {ageDays}d
                  </span>
                </div>
              </div>
            );
          })}

          {/* Pagination — bottom center */}
          <div style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 8, zIndex: 15,
          }}>
            {totalPages > 1 && (
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: page === 0 ? T.bg : T.text1, color: page === 0 ? T.text4 : '#fff',
                  border: `1px solid ${T.borderStrong}`, cursor: page === 0 ? 'default' : 'pointer',
                  fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                ‹
              </button>
            )}
            {totalPages > 1 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: T.text3 }}>
                {page + 1} / {totalPages}
              </span>
            )}
            {totalPages > 1 && (
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: page === totalPages - 1 ? T.bg : T.text1, color: page === totalPages - 1 ? T.text4 : '#fff',
                  border: `1px solid ${T.borderStrong}`, cursor: page === totalPages - 1 ? 'default' : 'pointer',
                  fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                ›
              </button>
            )}
          </div>

          {/* Empty state */}
          {visibleItems.length === 0 && (
            <div style={{
              position: 'absolute', left: cx, top: cy + 100, transform: 'translateX(-50%)',
              textAlign: 'center', zIndex: 10,
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.text3, margin: 0 }}>No active items</p>
              <p style={{ fontSize: 11, color: T.text4, margin: '4px 0 0' }}>All work is completed</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: Completed Sidebar ═══ */}
      <div style={{
        width: 260, borderLeft: `1px solid ${T.borderStrong}`,
        background: T.surface, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 14px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: T.done, letterSpacing: '0.03em' }}>
            ✓ Completed
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800, color: '#fff',
            background: T.done, borderRadius: 12, padding: '2px 8px',
          }}>
            {doneItems.length}
          </span>
        </div>

        {/* Done items list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {doneItems.map((item: any, idx: number) => {
            const hub = item.hub || item.source_hub || 'ProjectHub';
            const hubColor = HUB_COLORS[hub] ?? '#64748B';
            const key = item.item_key || item.key || '—';
            const title = item.title || '';
            return (
              <div key={item.id || idx} onClick={() => onItemClick(item)}
                style={{
                  padding: '8px 12px', cursor: 'pointer',
                  borderBottom: `1px solid ${T.border}`,
                  background: idx % 2 === 0 ? T.surface : '#FAF8F5',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#EDE7E0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? T.surface : '#FAF8F5'; }}>
                {/* Key + Hub + Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.text1 }}>
                    {key}
                  </span>
                  <span style={{
                    fontSize: 8, fontWeight: 800, color: '#fff', padding: '1px 5px',
                    borderRadius: 4, background: hubColor,
                  }}>
                    {HUB_SHORT[hub] ?? hub.replace('Hub', '').slice(0, 4).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 9, color: T.text4, marginLeft: 'auto', fontFamily: T.mono }}>
                    {item.assigned_at?.slice(5, 10) || ''}
                  </span>
                </div>
                {/* Title */}
                <div style={{
                  fontSize: 11, fontWeight: 500, color: T.text3, lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}>
                  {title}
                </div>
              </div>
            );
          })}

          {doneItems.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: T.text4 }}>
              No completed items
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TentacleView;
