/**
 * R360 Member Detail Page
 * Route: /project-hub/resources/:resourceId
 * Contains: Profile Header, Week Nav, Ring/Chronology/Board views, Detail Panel
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useR360Overview, useR360WorkItems, useR360Siblings } from '@/hooks/useR360';
import { R360_DEPT_COLORS, R360_PROJECT_COLORS } from '@/constants/r360';
import { initials, slugify, ageBarPercent, ageBarColor, formatRelativeDate, formatDate } from '@/utils/r360Utils';
import { getJiraIcon } from '@/components/r360/R360JiraIcons';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, X, ChevronDown } from 'lucide-react';
import type { R360WorkItem, R360ViewType, R360Filters } from '@/types/r360';
import '@/styles/r360.css';

// ── Week helpers ──
function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const sun = new Date(now);
  sun.setDate(now.getDate() - day + offset * 7);
  sun.setHours(0, 0, 0, 0);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  sat.setHours(23, 59, 59, 999);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = offset === 0 ? 'This Week' : offset === -1 ? 'Last Week' : offset === 1 ? 'Next Week' : `Week ${offset > 0 ? '+' : ''}${offset}`;
  const range = `${M[sun.getMonth()]} ${sun.getDate()} – ${M[sat.getMonth()]} ${sat.getDate()}, ${sat.getFullYear()}`;
  return { start: sun, end: sat, label, range };
}

// ── Status pill component ──
function StatusPill({ label, color, bg, dot }: { label: string; color: string; bg: string; dot: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600, background: bg, color }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: dot }} />
      {label}
    </span>
  );
}

// ── Project tag ──
function ProjTag({ projectKey }: { projectKey: string }) {
  const bg = R360_PROJECT_COLORS[projectKey] || '#64748B';
  return <span className="r3-proj-tag" style={{ background: bg }}>{projectKey}</span>;
}

// ── Age badge ──
function AgeBadge({ days, ageClass }: { days: number; ageClass: string }) {
  return <span className={`r3-age r3-age--${ageClass}`} style={{ fontSize: 12 }}>{days}d</span>;
}

// ── Priority dot color ──
function priorityDotColor(p: string) {
  const l = p?.toLowerCase();
  if (l === 'highest' || l === 'critical') return '#EF4444';
  if (l === 'high') return '#F97316';
  if (l === 'medium') return '#D97706';
  return '#94A3B8';
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function R360MemberDetail() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get('view') as R360ViewType) || 'ring';
  const [view, setView] = useState<R360ViewType>(initialView);
  const [weekOffset, setWeekOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<R360WorkItem | null>(null);

  const { data: overview, isLoading: overviewLoading } = useR360Overview(resourceId || '');

  const filters: R360Filters = useMemo(() => {
    const f: R360Filters = {};
    if (statusFilter) f.status_categories = [statusFilter];
    if (searchTerm.trim()) f.search = searchTerm;
    return f;
  }, [statusFilter, searchTerm]);

  const { data: workItems = [], isLoading: itemsLoading } = useR360WorkItems(resourceId || '', filters);

  const week = getWeekRange(weekOffset);

  // Filter items by week for ring/board (chronology shows all with date grouping)
  const weekItems = useMemo(() => {
    if (view === 'chronology') return workItems;
    return workItems.filter(item => {
      const effectiveDate = item.status_category === 'done'
        ? new Date(item.resolved_at || item.updated_at)
        : new Date(item.updated_at);
      return effectiveDate >= week.start && effectiveDate <= week.end;
    });
  }, [workItems, week.start, week.end, view]);

  // Auto-skip empty weeks: find nearest week with data in the navigation direction
  const skipDirection = useRef<-1 | 1 | 0>(0);
  const skipAttempts = useRef(0);
  const MAX_SKIP = 12;

  useEffect(() => {
    if (itemsLoading || !workItems.length || view === 'chronology') return;
    if (skipDirection.current === 0) return; // no skip if user hasn't navigated

    if (weekItems.length === 0 && skipAttempts.current < MAX_SKIP) {
      skipAttempts.current += 1;
      setWeekOffset(prev => prev + skipDirection.current);
    } else {
      // Found data or exhausted attempts — reset
      skipDirection.current = 0;
      skipAttempts.current = 0;
    }
  }, [weekItems.length, itemsLoading, workItems.length, view, weekOffset]);

  const navigateWeek = useCallback((dir: -1 | 1) => {
    skipDirection.current = dir;
    skipAttempts.current = 0;
    setWeekOffset(prev => prev + dir);
  }, []);

  // Status counts
  const counts = useMemo(() => {
    const c = { all: weekItems.length, to_do: 0, in_progress: 0, in_qa: 0, done: 0, blocked: 0 };
    weekItems.forEach(i => { (c as any)[i.status_category] = ((c as any)[i.status_category] || 0) + 1; });
    return c;
  }, [weekItems]);

  // Avg age of open items
  const avgAge = useMemo(() => {
    const openItems = workItems.filter(i => i.status_category !== 'done');
    if (openItems.length === 0) return 0;
    return Math.round(openItems.reduce((s, i) => s + (i.age_days || 0), 0) / openItems.length);
  }, [workItems]);

  // Close panel on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedItem(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (overviewLoading) {
    return (
      <div id="r360-root">
        <div className="r3-page">
          <div className="r3-skeleton" style={{ height: 120, marginBottom: 20 }} />
          <div className="r3-skeleton" style={{ height: 400 }} />
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div id="r360-root">
        <div className="r3-page"><div className="r3-empty">Resource not found.</div></div>
      </div>
    );
  }

  const deptColor = R360_DEPT_COLORS[overview.department] || '#64748B';

  return (
    <div id="r360-root">
      <div className="r3-page">
        {/* ── Profile Header ── */}
        <div className="r3-profile">
          <div className="r3-profile-top">
            <div className="r3-profile-avatar" style={{ background: `linear-gradient(135deg, ${deptColor}, #0D9488)` }}>
              {overview.avatar_url ? (
                <img src={overview.avatar_url} alt={overview.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : null}
              <span style={{ position: 'absolute', pointerEvents: 'none', ...(overview.avatar_url ? { display: 'none' } : {}) }}>{initials(overview.name)}</span>
            </div>
            <div>
              <div className="r3-profile-name">{overview.name}</div>
              <div className="r3-profile-role">{overview.role_name} · {overview.department}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ padding: '8px 22px', borderRadius: '8px', minWidth: '76px', textAlign: 'center' as const, border: '1px solid #FDE68A', background: '#FFFBEB' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#78350F' }}>{overview.open_items}</div>
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#78350F', textTransform: 'uppercase' as const, letterSpacing: '.03em' }}>OPEN</div>
              </div>
              <div style={{ padding: '8px 22px', borderRadius: '8px', minWidth: '76px', textAlign: 'center' as const, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>{overview.stale_items}</div>
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#334155', textTransform: 'uppercase' as const, letterSpacing: '.03em' }}>STALE</div>
              </div>
            </div>
          </div>

          {/* ── Tabs + Actions ── */}
          <div className="r3-tabs">
            {(['ring', 'chronology', 'board'] as R360ViewType[]).map(v => (
              <button key={v} className={`r3-tab ${view === v ? 'r3-tab--active' : ''}`} onClick={() => setView(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <div className="r3-tab-spacer" />
            <button className="r3-btn" onClick={() => navigate('/project-hub/resources')}>
              <ChevronLeft size={14} /> Back
            </button>
            <button className="r3-btn">
              <Calendar size={14} /> Q1-2026
            </button>
            <button className="r3-btn r3-btn--primary">
              <Sparkles size={14} /> Intelligence
            </button>
          </div>
        </div>

        {/* ── Week Navigation ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 0', borderBottom: '1px solid #F1F5F9', flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>📅 {week.label}</span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>{week.range}</span>
          <button style={{ width: '28px', height: '28px', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#FFF', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigateWeek(-1)}>‹</button>
          <button style={{ width: '28px', height: '28px', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#FFF', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigateWeek(1)}>›</button>
          <div style={{ width: '1px', height: '20px', background: '#E2E8F0', margin: '0 4px' }} />
          {([
            { key: null, label: `All (${counts.all})` },
            { key: 'to_do', label: `To Do (${counts.to_do})` },
            { key: 'in_progress', label: `In Prog (${counts.in_progress})` },
          ] as const).map(f => (
            <span key={f.key ?? 'all'} onClick={() => setStatusFilter(statusFilter === f.key ? null : f.key)} style={{ padding: '5px 14px', fontSize: '12.5px', fontWeight: (statusFilter === f.key || (f.key === null && !statusFilter)) ? 600 : 500, border: (statusFilter === f.key || (f.key === null && !statusFilter)) ? '1px solid #2563EB' : '1px solid #E2E8F0', borderRadius: '20px', background: (statusFilter === f.key || (f.key === null && !statusFilter)) ? '#EFF6FF' : '#FFF', color: (statusFilter === f.key || (f.key === null && !statusFilter)) ? '#2563EB' : '#334155', cursor: 'pointer' }}>{f.label}</span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '12.5px', color: '#64748B' }}>{weekItems.length} items</span>
        </div>

        {/* ── Views ── */}
        {itemsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="r3-skeleton" style={{ height: 60 }} />)}
          </div>
        ) : weekItems.length === 0 ? (
          <div className="r3-empty">No work items found for this period.</div>
        ) : (
          <>
            {view === 'ring' && <RingView items={weekItems} name={overview.name} role={overview.role_name} avatarUrl={overview.avatar_url} onSelect={setSelectedItem} selected={selectedItem} />}
            {view === 'chronology' && <ChronologyView items={weekItems} onSelect={setSelectedItem} />}
            {view === 'board' && <BoardView items={weekItems} onSelect={setSelectedItem} />}
          </>
        )}

        {/* ── Detail Panel ── */}
        {selectedItem && (
          <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} onSelectItem={setSelectedItem} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// RING VIEW
// ═══════════════════════════════════════════
// ═══ PIXEL-BASED RING VIEW ═══
// All coordinates in pixels. Cards, spokes, labels — same coordinate space.
const CANVAS_H = 720;
const CARD_W = 230;
const CARD_H = 155;

// ═══ TIGHT ORBIT SLOTS ═══
function computeSlots(W: number) {
  const H = CANVAS_H;
  const badge = 72;
  const rEdge = W - badge - CARD_W - 8;
  return [
    { left: W * 0.02,              top: H * 0.015 },
    { left: W * 0.50 - CARD_W / 2, top: 0          },
    { left: rEdge,                  top: H * 0.015 },
    { left: W * 0.01,              top: H * 0.35  },
    { left: rEdge,                  top: H * 0.33  },
    { left: W * 0.02,              top: H * 0.61  },
    { left: W * 0.50 - CARD_W / 2, top: H * 0.65  },
    { left: rEdge,                  top: H * 0.59  },
  ];
}

function computeGeometry(W: number, count: number, ages: number[]) {
  const CX = W / 2;
  const CY = CANVAS_H * 0.42;
  const slots = computeSlots(W);
  const spokes: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const labels: { x: number; y: number; age: number }[] = [];
  for (let i = 0; i < Math.min(count, 8); i++) {
    const ccx = slots[i].left + CARD_W / 2;
    const ccy = slots[i].top + CARD_H / 2;
    spokes.push({ x1: CX, y1: CY, x2: ccx, y2: ccy });
    labels.push({ x: (CX + ccx) / 2, y: (CY + ccy) / 2, age: ages[i] || 0 });
  }
  return { slots, spokes, labels, center: { x: CX, y: CY } };
}

const SC_MAP: Record<string, { dot: string; bg: string; tx: string; label: string; accent: string }> = {
  'To Do':          { dot:'#D97706', bg:'#FFFBEB', tx:'#78350F', label:'To Do',       accent:'#D97706' },
  'Open':           { dot:'#D97706', bg:'#FFFBEB', tx:'#78350F', label:'To Do',       accent:'#D97706' },
  'Backlog':        { dot:'#D97706', bg:'#FFFBEB', tx:'#78350F', label:'Backlog',     accent:'#D97706' },
  'In Progress':    { dot:'#2563EB', bg:'#EFF6FF', tx:'#1E3A5F', label:'In Progress', accent:'#2563EB' },
  'In Development': { dot:'#2563EB', bg:'#EFF6FF', tx:'#1E3A5F', label:'In Progress', accent:'#2563EB' },
  'In Review':      { dot:'#0D9488', bg:'#F0FDFA', tx:'#134E4A', label:'In Review',   accent:'#0D9488' },
  'Code Review':    { dot:'#0D9488', bg:'#F0FDFA', tx:'#134E4A', label:'In Review',   accent:'#0D9488' },
  'Ready for QA':   { dot:'#0D9488', bg:'#F0FDFA', tx:'#134E4A', label:'In QA',       accent:'#0D9488' },
  'In UAT':         { dot:'#0D9488', bg:'#F0FDFA', tx:'#134E4A', label:'In UAT',      accent:'#0D9488' },
  'Done':           { dot:'#16A34A', bg:'#F0FDF4', tx:'#14532D', label:'Done',        accent:'#16A34A' },
  'Closed':         { dot:'#16A34A', bg:'#F0FDF4', tx:'#14532D', label:'Done',        accent:'#16A34A' },
  'Resolved':       { dot:'#16A34A', bg:'#F0FDF4', tx:'#14532D', label:'Done',        accent:'#16A34A' },
  'Blocked':        { dot:'#EF4444', bg:'#FEF2F2', tx:'#7F1D1D', label:'Blocked',     accent:'#EF4444' },
};
const SC_DEFAULT = { dot:'#64748B', bg:'#F1F5F9', tx:'#334155', label:'Unknown', accent:'#64748B' };
const scLookup = (s: string) => SC_MAP[s] || SC_DEFAULT;
const PC_MAP: Record<string, string> = { BAU:'#2563EB', SEN:'#D97706', FAC:'#16A34A', OPS:'#0D9488', SUP:'#64748B', LND:'#7C3AED' };
const ageColor = (d: number) => d <= 7 ? '#16A34A' : d <= 14 ? '#D97706' : '#EF4444';

function RingPill({ status }: { status: string }) {
  const s = scLookup(status);
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 10px', borderRadius:'4px', fontSize:'11.5px', fontWeight:600, lineHeight:'1', background:s.bg, color:s.tx }}>
      <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:s.dot, flexShrink:0 }} />
      {s.label}
    </span>
  );
}

function RingView({ items, name, role, avatarUrl, onSelect, selected }: {
  items: R360WorkItem[]; name: string; role: string; avatarUrl?: string | null;
  onSelect: (i: R360WorkItem) => void; selected: R360WorkItem | null;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1000);
  const [showDone, setShowDone] = useState(false);

  const measure = useCallback(() => {
    if (canvasRef.current) setW(canvasRef.current.offsetWidth);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Close on outside click
  useEffect(() => {
    if (!showDone) return;
    const handler = (e: MouseEvent) => {
      if (doneRef.current && !doneRef.current.contains(e.target as Node)) setShowDone(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDone]);

  // Close on Escape
  useEffect(() => {
    if (!showDone) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDone(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showDone]);

  const nonDone = items.filter(i => i.status_category !== 'done');
  // `items` is already week-scoped by the parent filter
  const doneItems = items.filter(i => i.status_category === 'done');
  const doneCount = doneItems.length;
  const visible = nonDone.slice(0, 8);
  const ages = visible.map(i => i.age_days);
  const { slots, spokes, labels, center } = computeGeometry(W, visible.length, ages);

  return (
    <div ref={canvasRef} style={{ position:'relative', width:'100%', height:`${CANVAS_H}px`, overflow:'visible', boxSizing:'border-box' as const, marginTop:'8px' }}>
      {/* SVG SPOKES — pixel coordinates */}
      <svg width={W} height={CANVAS_H} style={{ position:'absolute', top:0, left:0, zIndex:1, pointerEvents:'none' }}>
        {spokes.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke="#94A3B8" strokeWidth={2} strokeDasharray="8 5" strokeLinecap="round" />
        ))}
      </svg>

      {/* SPOKE LABELS — pixel midpoints */}
      {labels.map((l, i) => (
        <div key={`label-${i}`} style={{
          position:'absolute', left:`${l.x}px`, top:`${l.y}px`,
          transform:'translate(-50%,-50%)', zIndex:4, pointerEvents:'none',
          fontSize:'11px', fontWeight:600, color:'#334155', background:'#F8FAFC',
          padding:'2px 8px', borderRadius:'10px', border:'1px solid #E2E8F0',
          whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums',
        }}>{l.age}d ago</div>
      ))}

      {/* CENTER AVATAR */}
      <div style={{
        position:'absolute', left:`${center.x}px`, top:`${center.y}px`,
        transform:'translate(-50%,-50%)', textAlign:'center', zIndex:5,
      }}>
        <div style={{
          width:'96px', height:'96px', borderRadius:'50%', border:'3px solid #2563EB',
          overflow:'hidden', margin:'0 auto 6px',
          boxShadow:'0 0 0 6px rgba(37,99,235,.12)',
          background: avatarUrl ? '#FFFFFF' : 'linear-gradient(135deg,#2563EB,#0D9488)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <span style={{ fontSize:'32px', fontWeight:700, color:'white' }}>{initials(name)}</span>
          )}
        </div>
        <div style={{ fontSize:'13px', fontWeight:600, color:'#020617' }}>{name}</div>
        <div style={{ fontSize:'11px', fontWeight:500, color:'#334155' }}>{role}</div>
      </div>

      {/* ORBITAL CARDS — pixel positions */}
      {visible.map((item, i) => {
        const pos = slots[i];
        if (!pos) return null;
        const s = scLookup(item.status_label || '');
        const isSelected = selected?.id === item.id;
        return (
          <div key={item.id} onClick={() => onSelect(item)} style={{
            position:'absolute', left:`${pos.left}px`, top:`${pos.top}px`,
            width:`${CARD_W}px`, background:'#FFF',
            border: isSelected ? '1px solid #2563EB' : '1px solid #E2E8F0',
            borderRadius:'8px', padding:'10px 12px 10px 15px',
            cursor:'pointer', zIndex:3,
            boxShadow: isSelected ? '0 0 0 2px rgba(37,99,235,.15)' : '0 1px 3px rgba(15,23,42,.05)',
          }}>
            <div style={{ position:'absolute', left:0, top:'8px', bottom:'8px', width:'3px', borderRadius:'0 2px 2px 0', background:s.accent }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                {getJiraIcon(item.item_type)}
                <span style={{ fontSize:'10.5px', fontWeight:700, textTransform:'uppercase', color:'#334155' }}>{item.item_type}</span>
              </div>
              <span style={{ fontSize:'10.5px', fontWeight:500, color:'#64748B' }}>{item.priority}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px' }}>
              <span style={{ fontSize:'11px', fontWeight:600, color:'#2563EB', fontFamily:"'JetBrains Mono',monospace" }}>{item.item_key}</span>
              <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 6px', borderRadius:'3px', color:'#FFF', background: PC_MAP[item.project_key] || '#64748B' }}>{item.project_key}</span>
              <span style={{ marginLeft:'auto', fontSize:'11px', fontWeight:600, color: ageColor(item.age_days), fontVariantNumeric:'tabular-nums' }}>{item.age_days}d</span>
            </div>
            <div style={{ fontSize:'12.5px', fontWeight:500, color:'#020617', lineHeight:'1.35', marginBottom:'5px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' } as React.CSSProperties}>{item.title}</div>
            <RingPill status={item.status_label || ''} />
          </div>
        );
      })}

      {/* COMPLETED BADGE — CLICKABLE WITH DROPDOWN */}
      {doneCount > 0 && (
        <div ref={doneRef} style={{ position:'absolute', right:'16px', top:`${center.y}px`, transform:'translateY(-50%)', zIndex:10 }}>
          {/* Badge */}
          <div
            onClick={() => setShowDone(prev => !prev)}
            title="Click to view completed items"
            style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:'6px',
              cursor:'pointer', transition:'transform .15s',
              transform: showDone ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <div style={{
              width:'48px', height:'48px', borderRadius:'50%', background:'#16A34A', color:'#FFF',
              fontSize:'18px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: showDone
                ? '0 0 0 3px rgba(22,163,74,.25), 0 2px 8px rgba(22,163,74,.3)'
                : '0 2px 8px rgba(22,163,74,.3)',
              transition:'box-shadow .15s', fontVariantNumeric:'tabular-nums',
            }}>{doneCount}</div>
            <span style={{ fontSize:'9.5px', fontWeight:700, color:'#14532D', textTransform:'uppercase', letterSpacing:'.06em', writingMode:'vertical-rl' } as React.CSSProperties}>COMPLETED</span>
          </div>

          {/* POPOVER DROPDOWN */}
          {showDone && (
            <div style={{
              position:'absolute', right:'64px', top:'50%', transform:'translateY(-50%)',
              width:'340px', maxHeight:'420px', background:'#FFFFFF',
              border:'1px solid #E2E8F0', borderRadius:'12px',
              boxShadow:'0 8px 30px rgba(15,23,42,.12), 0 2px 8px rgba(15,23,42,.06)',
              overflow:'hidden', zIndex:11,
            }}>
              {/* Header */}
              <div style={{
                padding:'14px 16px', borderBottom:'1px solid #F1F5F9',
                display:'flex', alignItems:'center', justifyContent:'space-between',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{
                    width:'22px', height:'22px', borderRadius:'50%', background:'#16A34A',
                    color:'#FFF', fontSize:'12px', fontWeight:700,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>✓</div>
                  <span style={{ fontSize:'13.5px', fontWeight:600, color:'#020617' }}>
                    Completed Items
                  </span>
                </div>
                <span style={{
                  fontSize:'11px', fontWeight:700, color:'#14532D',
                  background:'#F0FDF4', padding:'2px 10px', borderRadius:'10px',
                }}>{doneCount}</span>
              </div>

              {/* Scrollable list */}
              <div style={{ maxHeight:'340px', overflowY:'auto', scrollbarWidth:'thin', padding:'4px 0' }}>
                {doneItems.map(item => {
                  const closedDate = item.resolved_at || item.updated_at;
                  const closedLabel = closedDate
                    ? new Date(closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => { e.stopPropagation(); onSelect(item); setShowDone(false); }}
                      style={{
                        display:'flex', alignItems:'flex-start', gap:'10px',
                        padding:'10px 16px', cursor:'pointer',
                        borderBottom:'1px solid #F1F5F9', transition:'background .1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F0FDF4')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width:'20px', height:'20px', borderRadius:'50%',
                        background:'#DCFCE7', color:'#16A34A', fontSize:'11px', fontWeight:700,
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'2px',
                      }}>✓</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                          <span style={{ fontSize:'11px', fontWeight:600, color:'#2563EB', fontFamily:"'JetBrains Mono',monospace" }}>{item.item_key}</span>
                          <span style={{ fontSize:'10px', color:'#64748B' }}>{item.project_name || item.project_key}</span>
                          <span style={{ marginLeft:'auto', fontSize:'10px', color:'#16A34A', fontWeight:500, whiteSpace:'nowrap' }}>{closedLabel}</span>
                        </div>
                        <div style={{ fontSize:'12px', fontWeight:400, color:'#334155', lineHeight:'1.35', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' } as React.CSSProperties}>{item.title}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* EMPTY STATE */}
      {items.length === 0 && (
        <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', textAlign:'center', color:'#64748B', fontSize:'14px' }}>
          No work items found for this week
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// CHRONOLOGY VIEW
// ═══════════════════════════════════════════
function ChronologyView({ items, onSelect }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: R360WorkItem[] }>();
    items.forEach(item => {
      if (!map.has(item.group_date)) map.set(item.group_date, { label: item.date_label, items: [] });
      map.get(item.group_date)!.items.push(item);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [items]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

  const accentColor = (cat: string) => cat === 'in_progress' ? '#2563EB' : cat === 'in_qa' ? '#0D9488' : cat === 'blocked' ? '#EF4444' : cat === 'done' ? '#16A34A' : '#D97706';

  return (
    <div className="r3-chrono">
      <div className="r3-chrono-line" />
      {groups.map(([dateKey, group]) => {
        const isCollapsed = collapsed.has(dateKey);
        const dotClass = dateKey === todayStr ? 'r3-date-dot--today' : dateKey === yesterdayStr ? 'r3-date-dot--yesterday' : 'r3-date-dot--other';
        const statusDist = { done: 0, in_progress: 0, to_do: 0, blocked: 0 };
        group.items.forEach(i => {
          if (i.status_category === 'done') statusDist.done++;
          else if (i.status_category === 'in_progress' || i.status_category === 'in_qa') statusDist.in_progress++;
          else if (i.status_category === 'blocked') statusDist.blocked++;
          else statusDist.to_do++;
        });
        const total = group.items.length;

        return (
          <div key={dateKey} className="r3-date-group">
            <div className="r3-date-header" onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has(dateKey) ? n.delete(dateKey) : n.add(dateKey); return n; })}>
              <span className={`r3-date-dot ${dotClass}`} />
              <span className="r3-date-label">{group.label}</span>
              <span className="r3-date-count">{total} items</span>
              <div className="r3-minibar">
                {statusDist.done > 0 && <div style={{ width: `${statusDist.done / total * 100}%`, background: '#16A34A' }} />}
                {statusDist.in_progress > 0 && <div style={{ width: `${statusDist.in_progress / total * 100}%`, background: '#2563EB' }} />}
                {statusDist.to_do > 0 && <div style={{ width: `${statusDist.to_do / total * 100}%`, background: '#D97706' }} />}
                {statusDist.blocked > 0 && <div style={{ width: `${statusDist.blocked / total * 100}%`, background: '#EF4444' }} />}
              </div>
              <ChevronDown size={16} className={`r3-date-chevron ${isCollapsed ? 'r3-date-chevron--collapsed' : ''}`} />
            </div>
            {!isCollapsed && (
              <div className="r3-chrono-items">
                {group.items.map(item => (
                  <div key={item.id} className="r3-chrono-card" onClick={() => onSelect(item)}>
                    <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 2px 2px 0', background: accentColor(item.status_category) }} />
                    <div style={{ width: 24, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{getJiraIcon(item.item_type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span className="r3-card-key">{item.item_key}</span>
                        <ProjTag projectKey={item.project_key} />
                      </div>
                      <div className="r3-card-title r3-card-title--lg">{item.title}</div>
                      {item.parent_key && (
                        <div className="r3-parent-ref" style={{ marginTop: 4 }}>
                          ↳ <span className="r3-parent-key">{item.parent_key}</span> {item.parent_title}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12.5, color: '#334155' }}>{item.assignee_name}</span>
                        <StatusPill label={item.status_label} color={item.status_color} bg={item.status_bg} dot={item.status_dot} />
                      </div>
                      <AgeBadge days={item.age_days} ageClass={item.age_class} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// BOARD VIEW
// ═══════════════════════════════════════════
function BoardView({ items, onSelect }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void }) {
  const columns = [
    { key: 'to_do', label: 'TO DO', color: '#D97706', items: items.filter(i => i.status_category === 'to_do' || i.status_category === 'blocked') },
    { key: 'in_progress', label: 'IN PROGRESS', color: '#2563EB', items: items.filter(i => i.status_category === 'in_progress' || i.status_category === 'in_qa') },
    { key: 'done', label: 'DONE', color: '#16A34A', items: items.filter(i => i.status_category === 'done') },
  ];

  const accentColor = (cat: string) => cat === 'in_progress' ? '#2563EB' : cat === 'in_qa' ? '#0D9488' : cat === 'blocked' ? '#EF4444' : cat === 'done' ? '#16A34A' : '#D97706';

  return (
    <div className="r3-board">
      {columns.map(col => (
        <div key={col.key}>
          <div className="r3-board-col-header" style={{ borderBottom: `2px solid ${col.color}` }}>
            <span className="r3-board-col-dot" style={{ background: col.color }} />
            <span className="r3-board-col-title">{col.label}</span>
            <span className="r3-board-col-count" style={{ background: col.color }}>{col.items.length}</span>
          </div>
          <div className="r3-board-cards">
            {col.items.map(item => (
              <div key={item.id} className="r3-board-card" onClick={() => onSelect(item)}>
                <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 2px 2px 0', background: accentColor(item.status_category) }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="r3-card-key">{item.item_key}</span>
                  <ProjTag projectKey={item.project_key} />
                  <span style={{ marginLeft: 'auto' }}><AgeBadge days={item.age_days} ageClass={item.age_class} /></span>
                </div>
                <div className="r3-card-title" style={{ fontSize: 13.5, marginBottom: 8 }}>{item.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="r3-priority-dot" style={{ background: priorityDotColor(item.priority) }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#334155' }}>{item.priority}</span>
                  </div>
                  <span style={{ fontSize: 12.5, color: '#334155' }}>{item.assignee_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════
function DetailPanel({ item, onClose, onSelectItem }: {
  item: R360WorkItem; onClose: () => void; onSelectItem: (i: R360WorkItem) => void;
}) {
  // Siblings are only valid when the parent is a Story.
  // In Jira hierarchy this maps to current item being a Sub-task.
  const normalizedItemType = (item.item_type || '').toLowerCase().replace(/[-_\s]/g, '');
  const canHaveStoryParent = normalizedItemType === 'subtask';

  const { data: siblings = [] } = useR360Siblings(canHaveStoryParent ? item.parent_key : null);
  const doneCount = siblings.filter((s: any) => s.status_category === 'done').length;

  return (
    <>
      <div className="r3-overlay" onClick={onClose} />
      <div className="r3-panel r3-panel--open">
        {/* Header */}
        <div className="r3-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="r3-card-key" style={{ fontSize: 14 }}>{item.item_key}</span>
            <button className="r3-panel-close" onClick={onClose}><X size={14} /></button>
          </div>
          <div className="r3-panel-pills">
            <StatusPill label={item.status_label} color={item.status_color} bg={item.status_bg} dot={item.status_dot} />
            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#F1F5F9', color: '#334155' }}>{item.priority}</span>
            <span className="r3-type-badge">{getJiraIcon(item.item_type)} {item.item_type}</span>
            <ProjTag projectKey={item.project_key} />
          </div>
          <div className="r3-panel-title">{item.title}</div>
        </div>

        {/* Body */}
        <div className="r3-panel-body">
          {/* Meta Grid */}
          <div className="r3-meta">
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Project</div>
              <div className="r3-meta-value">{item.project_name}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Reporter</div>
              <div className="r3-meta-value">{item.reporter_name || '—'}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Assigned</div>
              <div className="r3-meta-value">{formatRelativeDate(item.created_at)}</div>
              <div style={{ fontSize: 11, color: '#334155' }}>{formatDate(item.created_at)}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Days Sitting</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`r3-age r3-age--${item.age_class}`} style={{ fontSize: 13, fontWeight: 600 }}>{item.age_days}</span>
                <div style={{ width: 60, height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden' }}>
                  <div style={{ width: `${ageBarPercent(item.age_days)}%`, height: '100%', background: ageBarColor(item.age_days), borderRadius: 2 }} />
                </div>
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Release</div>
              <div className="r3-meta-value">
                {item.fix_version ? item.fix_version
                  : item.item_type === 'Sub-task' && item.parent_key ? <span style={{ color: '#2563EB', fontSize: 12 }}>Inherited from {item.parent_key}</span>
                  : '—'}
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Due</div>
              <div className="r3-meta-value">
                {item.due_date ? formatDate(item.due_date)
                  : item.item_type === 'Sub-task' && item.parent_key ? <span style={{ color: '#2563EB', fontSize: 12 }}>Inherited from {item.parent_key}</span>
                  : '—'}
              </div>
            </div>
          </div>

          {/* Hierarchy */}
          {item.parent_key && (
            <div className="r3-hierarchy">
              <div className="r3-hierarchy-title">Hierarchy</div>
              <div className="r3-hier-item" style={{ padding: '6px 8px' }}>
                {getJiraIcon('Epic')}
                <span className="r3-card-key r3-card-key--sm">{item.parent_key}</span>
                <span style={{ fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.parent_title}</span>
              </div>
              <div className="r3-hier-connector">↳</div>
              <div className="r3-hier-item r3-hier-item--current">
                {getJiraIcon(item.item_type)}
                <span className="r3-card-key r3-card-key--sm">{item.item_key}</span>
                <span style={{ fontSize: 12, color: '#020617', fontWeight: 500 }}>{item.title}</span>
              </div>
            </div>
          )}

          {/* Siblings */}
          {canHaveStoryParent && item.parent_key && siblings.length > 0 && (
            <div className="r3-siblings">
              <div className="r3-siblings-header">
                <span className="r3-siblings-title">Siblings</span>
                <span className="r3-siblings-count">{doneCount}/{siblings.length} done</span>
              </div>

              {siblings.map((s: any) => (
                <div
                  key={s.id}
                  className={`r3-sibling-row ${s.item_key === item.item_key ? 'r3-sibling-row--current' : ''}`}
                  onClick={() => {
                    if (s.item_key !== item.item_key) {
                      // Create a minimal work item for navigation
                      onSelectItem({
                        ...item,
                        id: s.id,
                        item_key: s.item_key,
                        title: s.title,
                        status_label: s.status_label,
                        status_color: s.status_color,
                        status_bg: s.status_bg,
                        status_dot: s.status_dot,
                        status_category: s.status_category,
                        age_days: s.age_days,
                        age_class: s.age_class,
                      });
                    }
                  }}
                >
                  <span className="r3-card-key r3-card-key--sm" style={{ width: 72, flexShrink: 0 }}>{s.item_key}</span>
                  <StatusPill label={s.status_label} color={s.status_color} bg={s.status_bg} dot={s.status_dot} />
                  <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.title}</span>
                  <AgeBadge days={s.age_days} ageClass={s.age_class} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
