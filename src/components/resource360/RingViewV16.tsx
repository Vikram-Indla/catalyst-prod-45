/**
 * Resource 360° — Ring View V16
 * Static polar ring with weekly chronological paging, inline detail panel,
 * completed toggle sidebar, type ribbons, date chips on spokes.
 * Catalyst V11 Carbon Precision — NO purple, NO warm backgrounds, NO rotation.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getStatusCategory, type StatusCategory } from '@/utils/statusCategory';
import { HUB_COLORS, HUB_SHORT, PRIORITY_COLORS } from '@/constants/resource360';
import { X, ChevronLeft, ChevronRight, Search } from 'lucide-react';

// ─── TOKENS ───
const T = {
  bg: '#F8FAFC', surface: '#FFFFFF', surfaceAlt: '#F8FAFC', hover: '#F1F5F9',
  ink1: '#0F172A', ink2: '#334155', ink3: '#64748B', ink4: '#94A3B8',
  border: '#E2E8F0', borderLt: '#F1F5F9',
  accent: '#2563EB',
  todo: '#1E293B', progress: '#2563EB', done: '#0E8A5F',
  danger: '#EF4444', warning: '#D97706', success: '#16A34A',
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  sora: "'Sora', 'Inter', sans-serif",
  inter: "'Inter', sans-serif",
};

const STATUS_SOLID: Record<StatusCategory, { bg: string; text: string }> = {
  todo: { bg: T.todo, text: '#FFFFFF' },
  progress: { bg: T.progress, text: '#FFFFFF' },
  done: { bg: T.done, text: '#FFFFFF' },
};

// ─── MOCK DATA ───
interface WorkItem {
  key: string; type: string; priority: string; status: StatusCategory;
  hub: string; assignedDate: string; parentKey: string;
  dueDate: string | null; releaseEnd: string | null;
  title: string;
}

const ACTIVE_ITEMS: WorkItem[] = [
  { key: 'BAU-5012', type: 'Bug', priority: 'High', status: 'todo', hub: 'PROJ', assignedDate: '2026-02-25', parentKey: 'BAU-4466', dueDate: '2026-02-28', releaseEnd: null, title: 'Login API 500 error on mobile Safari' },
  { key: 'BAU-5011', type: 'Bug', priority: 'Critical', status: 'progress', hub: 'PROJ', assignedDate: '2026-02-24', parentKey: 'BAU-4466', dueDate: '2026-02-26', releaseEnd: null, title: 'Payment gateway timeout in production' },
  { key: 'BAU-5009', type: 'Bug', priority: 'Medium', status: 'todo', hub: 'PROJ', assignedDate: '2026-02-23', parentKey: 'BAU-4390', dueDate: null, releaseEnd: null, title: 'Dashboard chart rendering glitch' },
  { key: 'IP-590', type: 'Task', priority: 'High', status: 'todo', hub: 'INFRA', assignedDate: '2026-02-23', parentKey: 'BAU-4400', dueDate: '2026-02-27', releaseEnd: null, title: 'Deploy Redis cluster to staging' },
  { key: 'BAU-5007', type: 'Bug', priority: 'Medium', status: 'todo', hub: 'PROJ', assignedDate: '2026-02-22', parentKey: 'BAU-4466', dueDate: null, releaseEnd: null, title: 'Notification badge count incorrect' },
  { key: 'BAU-5006', type: 'Bug', priority: 'Medium', status: 'todo', hub: 'PROJ', assignedDate: '2026-02-22', parentKey: 'BAU-4466', dueDate: null, releaseEnd: null, title: 'File upload progress not updating' },
  { key: 'BAU-5005', type: 'Task', priority: 'Medium', status: 'todo', hub: 'PROJ', assignedDate: '2026-02-22', parentKey: 'BAU-4466', dueDate: null, releaseEnd: null, title: 'Migrate user preferences to new schema' },
  { key: 'BAU-5003', type: 'Bug', priority: 'High', status: 'todo', hub: 'PROJ', assignedDate: '2026-02-20', parentKey: 'BAU-4466', dueDate: '2026-02-28', releaseEnd: null, title: 'Search results pagination broken' },
  { key: 'BAU-4995', type: 'Bug', priority: 'Medium', status: 'progress', hub: 'PROJ', assignedDate: '2026-02-20', parentKey: 'BAU-4466', dueDate: null, releaseEnd: null, title: 'CSS layout shift on page load' },
  { key: 'BAU-4980', type: 'Bug', priority: 'High', status: 'progress', hub: 'PROJ', assignedDate: '2026-02-18', parentKey: 'BAU-4466', dueDate: '2026-02-25', releaseEnd: null, title: 'Memory leak in real-time websocket' },
  { key: 'BAU-4965', type: 'Task', priority: 'High', status: 'progress', hub: 'PROJ', assignedDate: '2026-02-15', parentKey: 'BAU-4390', dueDate: null, releaseEnd: null, title: 'Implement license validation API' },
  { key: 'BAU-4950', type: 'Task', priority: 'Critical', status: 'todo', hub: 'INFRA', assignedDate: '2026-02-10', parentKey: 'BAU-4400', dueDate: '2026-02-20', releaseEnd: null, title: 'SSL certificate rotation for prod' },
  { key: 'BAU-4872', type: 'Task', priority: 'Medium', status: 'progress', hub: 'PROJ', assignedDate: '2026-02-03', parentKey: 'BAU-4390', dueDate: null, releaseEnd: null, title: 'Refactor permission middleware' },
];

const DONE_ITEMS: WorkItem[] = [
  { key: 'BAU-4799', type: 'Bug', priority: 'High', status: 'done', hub: 'PROJ', assignedDate: '2026-01-28', parentKey: 'BAU-4466', dueDate: null, releaseEnd: null, title: 'Fix user avatar upload crash' },
  { key: 'BAU-4780', type: 'Task', priority: 'Medium', status: 'done', hub: 'PROJ', assignedDate: '2026-01-26', parentKey: 'BAU-4390', dueDate: null, releaseEnd: null, title: 'Add audit logging for license changes' },
  { key: 'BAU-4760', type: 'Bug', priority: 'Low', status: 'done', hub: 'PROJ', assignedDate: '2026-01-24', parentKey: 'BAU-4466', dueDate: null, releaseEnd: null, title: 'Tooltip z-index overlap fix' },
  { key: 'BAU-4740', type: 'Task', priority: 'High', status: 'done', hub: 'PROJ', assignedDate: '2026-01-22', parentKey: 'BAU-4466', dueDate: null, releaseEnd: null, title: 'Migrate to React 18 concurrent' },
  { key: 'BAU-4720', type: 'Bug', priority: 'Medium', status: 'done', hub: 'PROJ', assignedDate: '2026-01-20', parentKey: 'BAU-4466', dueDate: null, releaseEnd: null, title: 'Form validation error messages' },
  { key: 'BAU-4700', type: 'Task', priority: 'Medium', status: 'done', hub: 'PROJ', assignedDate: '2026-01-18', parentKey: 'BAU-4390', dueDate: null, releaseEnd: null, title: 'Database index optimization' },
  { key: 'BAU-4680', type: 'Bug', priority: 'High', status: 'done', hub: 'PROJ', assignedDate: '2026-01-16', parentKey: 'BAU-4466', dueDate: null, releaseEnd: null, title: 'Session timeout handling fix' },
  { key: 'BAU-4660', type: 'Task', priority: 'Low', status: 'done', hub: 'PROJ', assignedDate: '2026-01-14', parentKey: 'BAU-4390', dueDate: null, releaseEnd: null, title: 'Update API documentation' },
  { key: 'IP-580', type: 'Task', priority: 'High', status: 'done', hub: 'INFRA', assignedDate: '2026-01-12', parentKey: 'BAU-4400', dueDate: null, releaseEnd: null, title: 'Configure load balancer health checks' },
];

const HIERARCHY: Record<string, { epicKey: string; epicTitle: string; epicAssignee: string; storyKey: string; storyTitle: string; storyAssignee: string; storyStatus: StatusCategory }> = {
  'BAU-4466': { epicKey: 'BAU-4200', epicTitle: 'Senaei Platform Q1 2026', epicAssignee: 'Dr. Ahmed Al-Rashid', storyKey: 'BAU-4466', storyTitle: 'Senaei App Revamp UI', storyAssignee: 'Yazeed Daraz', storyStatus: 'progress' },
  'BAU-4390': { epicKey: 'BAU-4200', epicTitle: 'Senaei Platform Q1 2026', epicAssignee: 'Dr. Ahmed Al-Rashid', storyKey: 'BAU-4390', storyTitle: 'License Module Overhaul', storyAssignee: 'Ahmed Hassan', storyStatus: 'progress' },
  'BAU-4400': { epicKey: 'BAU-4300', epicTitle: 'Infrastructure Hardening', epicAssignee: 'Eng. Fatima Al-Harbi', storyKey: 'BAU-4400', storyTitle: 'Infrastructure Q1', storyAssignee: 'Omar Saeed', storyStatus: 'todo' },
};

const SIBLINGS: Record<string, { name: string; status: StatusCategory; age: number; key: string }[]> = {
  'BAU-4466': [
    { name: 'Khalid Mahmoud', status: 'progress', age: 1, key: 'BAU-5010' },
    { name: 'Sara Al-Otaibi', status: 'todo', age: 2, key: 'BAU-5008' },
    { name: 'Mohammed Farooq', status: 'done', age: 4, key: 'BAU-5004' },
    { name: 'Nora Al-Sheikh', status: 'progress', age: 5, key: 'BAU-5002' },
  ],
  'BAU-4390': [
    { name: 'Khalid Mahmoud', status: 'progress', age: 7, key: 'BAU-4964' },
    { name: 'Sara Al-Otaibi', status: 'todo', age: 9, key: 'BAU-4960' },
  ],
  'BAU-4400': [
    { name: 'Mohammed Farooq', status: 'done', age: 12, key: 'IP-589' },
    { name: 'Nora Al-Sheikh', status: 'progress', age: 13, key: 'IP-588' },
    { name: 'Khalid Mahmoud', status: 'todo', age: 15, key: 'IP-587' },
  ],
};

// ─── HELPERS ───
const NOW = new Date('2026-02-25');

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = daysBetween(d, NOW);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff <= 6) return `${diff}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function itemAge(dateStr: string): number {
  return daysBetween(new Date(dateStr), NOW);
}

function getISOWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return mon.toISOString().slice(0, 10);
}

function staleLevel(age: number, status: StatusCategory): 'critical' | 'stale' | null {
  if (status === 'done') return null;
  if (age > 21) return 'critical';
  if (age > 14) return 'stale';
  return null;
}

function smartDue(item: WorkItem): { date: string; source: 'ticket' | 'release' } | null {
  if (item.dueDate) return { date: item.dueDate, source: 'ticket' };
  if (item.releaseEnd) return { date: item.releaseEnd, source: 'release' };
  return null;
}

function slaBadge(dueStr: string): { label: string; bg: string; color: string } {
  const diff = daysBetween(NOW, new Date(dueStr));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, bg: '#FEF2F2', color: T.danger };
  if (diff === 0) return { label: 'Due today', bg: '#FFFBEB', color: T.warning };
  if (diff <= 3) return { label: `${diff}d left`, bg: '#FFFBEB', color: T.warning };
  return { label: `${diff}d left`, bg: '#F0FDF4', color: T.success };
}

function ageHeatColor(age: number): string {
  if (age <= 7) return T.success;
  if (age <= 14) return T.warning;
  if (age <= 21) return '#EA580C';
  return T.danger;
}

// ─── GROUP BY WEEK ───
interface WeekGroup { weekStart: string; items: WorkItem[] }

function groupByWeek(items: WorkItem[]): WeekGroup[] {
  const map = new Map<string, WorkItem[]>();
  items.forEach(i => {
    const ws = getISOWeekStart(i.assignedDate);
    if (!map.has(ws)) map.set(ws, []);
    map.get(ws)!.push(i);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, items]) => ({ weekStart, items }));
}

function weekLabel(weekStart: string, idx: number): string {
  if (idx === 0) return '📍 This Week';
  return 'Week';
}

function weekRange(weekStart: string): string {
  const s = new Date(weekStart);
  const e = new Date(s); e.setDate(s.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`;
}

// ─── STATUS PILL ───
const StatusPill: React.FC<{ status: StatusCategory; small?: boolean }> = ({ status, small }) => {
  const c = STATUS_SOLID[status];
  const label = status === 'todo' ? 'To Do' : status === 'progress' ? 'In Progress' : 'Done';
  return (
    <span style={{
      display: 'inline-block', padding: small ? '1px 6px' : '2px 8px',
      borderRadius: 9999, fontSize: small ? 9 : 10, fontWeight: 700,
      background: c.bg, color: c.text, whiteSpace: 'nowrap',
      lineHeight: 1.5, letterSpacing: '0.02em',
    }}>{label}</span>
  );
};

// ─── HUB BADGE ───
const HubBadge: React.FC<{ hub: string }> = ({ hub }) => {
  const color = hub === 'INFRA' ? '#4F46E5' : (HUB_COLORS.ProjectHub || T.accent);
  return (
    <span style={{
      display: 'inline-block', padding: '1px 5px', borderRadius: 4,
      fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em',
      background: color, color: '#FFFFFF', lineHeight: 1.5,
    }}>{hub}</span>
  );
};

// ─── PRIORITY PILL ───
const PriorityPill: React.FC<{ priority: string }> = ({ priority }) => {
  const color = PRIORITY_COLORS[priority] || T.ink3;
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 4,
      fontSize: 9, fontWeight: 700, border: `1px solid ${color}`,
      color, background: 'transparent', lineHeight: 1.5,
    }}>{priority}</span>
  );
};

// ═══ MAIN COMPONENT ═══
interface RingViewV16Props {
  resource: any;
  items: any[];
  onItemClick?: (item: any) => void;
  onAiClick?: () => void;
}

type ActiveFilter = 'all' | 'todo' | 'progress';
type PanelMode = 'hidden' | 'completed' | 'detail';

const MAX_PER_PAGE = 8;

const RingViewV16: React.FC<RingViewV16Props> = ({ resource }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [statusFilter, setStatusFilter] = useState<ActiveFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [weekIdx, setWeekIdx] = useState(0);
  const [ringPage, setRingPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('hidden');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const searchRef = useRef<HTMLInputElement>(null);

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDims({ w: rect.width, h: rect.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Filter active items
  const filteredActive = useMemo(() => {
    let items = ACTIVE_ITEMS;
    if (statusFilter === 'todo') items = items.filter(i => i.status === 'todo');
    if (statusFilter === 'progress') items = items.filter(i => i.status === 'progress');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.key.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
    }
    return items;
  }, [statusFilter, searchQuery]);

  const weeks = useMemo(() => groupByWeek(filteredActive), [filteredActive]);
  const currentWeek = weeks[weekIdx] || null;
  const weekItems = currentWeek?.items || [];

  // Pagination within week
  const totalPages = Math.ceil(weekItems.length / MAX_PER_PAGE);
  const pageItems = weekItems.slice(ringPage * MAX_PER_PAGE, (ringPage + 1) * MAX_PER_PAGE);

  // Reset page on week change
  useEffect(() => { setRingPage(0); }, [weekIdx]);

  // Counts
  const todoCount = ACTIVE_ITEMS.filter(i => i.status === 'todo').length;
  const progressCount = ACTIVE_ITEMS.filter(i => i.status === 'progress').length;
  const doneCount = DONE_ITEMS.length;

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setPanelMode('hidden');
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (pageItems.length === 0) return;
        const curIdx = selectedId ? pageItems.findIndex(i => i.key === selectedId) : -1;
        const next = (curIdx + 1) % pageItems.length;
        setSelectedId(pageItems[next].key);
        setPanelMode('detail');
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (pageItems.length === 0) return;
        const curIdx = selectedId ? pageItems.findIndex(i => i.key === selectedId) : 0;
        const prev = (curIdx - 1 + pageItems.length) % pageItems.length;
        setSelectedId(pageItems[prev].key);
        setPanelMode('detail');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, pageItems]);

  const selectCard = useCallback((key: string) => {
    setSelectedId(key);
    setPanelMode('detail');
  }, []);

  const closePanel = useCallback(() => {
    setSelectedId(null);
    setPanelMode('hidden');
  }, []);

  const toggleCompleted = useCallback(() => {
    if (panelMode === 'completed') {
      setPanelMode('hidden');
    } else {
      setSelectedId(null);
      setPanelMode('completed');
    }
  }, [panelMode]);

  // Ring geometry
  const panelWidth = panelMode === 'detail' ? 360 : panelMode === 'completed' ? 280 : 0;
  const ringW = dims.w - panelWidth;
  const ringH = dims.h - 36; // minus week ribbon
  const cx = ringW / 2;
  const cy = ringH / 2;
  const R = Math.min(ringW, ringH) * 0.36;
  const N = pageItems.length;
  const cardW = N <= 4 ? 176 : N <= 6 ? 164 : 150;
  const cardH = 110;

  const initials = resource?.initials || resource?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'AA';
  const resourceName = resource?.full_name || 'Adnan Ali';
  const resourceRole = resource?.role || 'React Developer';

  const selectedItem = selectedId ? [...ACTIVE_ITEMS, ...DONE_ITEMS].find(i => i.key === selectedId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', fontFamily: T.inter }}>
      {/* ── FILTER BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 20px',
        background: T.surface, borderBottom: `1px solid ${T.border}`, height: 38, flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.ink4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ACTIVE</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {([
            { key: 'all' as const, label: `All (${ACTIVE_ITEMS.length})` },
            { key: 'todo' as const, label: `To Do (${todoCount})` },
            { key: 'progress' as const, label: `In Progress (${progressCount})` },
          ]).map(f => {
            const active = statusFilter === f.key;
            const bg = active ? (f.key === 'todo' ? T.todo : f.key === 'progress' ? T.progress : T.accent) : 'transparent';
            return (
              <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
                height: 26, padding: '0 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                background: bg, color: active ? '#FFFFFF' : T.ink3,
                border: active ? 'none' : `1px solid ${T.border}`, cursor: 'pointer',
              }}>{f.label}</button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 8, top: 6, width: 14, height: 14, color: T.ink4 }} />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search... (/)"
            style={{
              width: 180, height: 28, padding: '0 10px 0 28px', fontSize: 12,
              background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6,
              outline: 'none', color: T.ink1, fontFamily: T.inter,
            }}
            onFocus={e => e.target.style.borderColor = T.accent}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
      </div>

      {/* ── RING + PANEL LAYOUT ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Ring viewport */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Week Ribbon */}
          <div style={{
            height: 36, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
            background: 'linear-gradient(90deg, rgba(37,99,235,.06), transparent 60%)',
            borderBottom: `1px solid ${T.borderLt}`, flexShrink: 0,
          }}>
            <button onClick={() => setWeekIdx(Math.min(weekIdx + 1, weeks.length - 1))}
              disabled={weekIdx >= weeks.length - 1}
              style={{
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${T.border}`, borderRadius: 6, background: T.surface,
                cursor: weekIdx >= weeks.length - 1 ? 'not-allowed' : 'pointer', opacity: weekIdx >= weeks.length - 1 ? 0.4 : 1,
              }}>
              <ChevronLeft size={14} color={T.ink2} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.ink1, fontFamily: T.sora }}>
              {currentWeek ? weekLabel(currentWeek.weekStart, weekIdx) : 'No items'}
            </span>
            <span style={{ fontSize: 11, color: T.ink3 }}>
              {currentWeek ? weekRange(currentWeek.weekStart) : ''}
            </span>
            <button onClick={() => setWeekIdx(Math.max(weekIdx - 1, 0))}
              disabled={weekIdx <= 0}
              style={{
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${T.border}`, borderRadius: 6, background: T.surface,
                cursor: weekIdx <= 0 ? 'not-allowed' : 'pointer', opacity: weekIdx <= 0 ? 0.4 : 1,
              }}>
              <ChevronRight size={14} color={T.ink2} />
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10.5, color: T.ink4, fontWeight: 600 }}>
              {weekItems.length} items{totalPages > 1 ? ` · Page ${ringPage + 1}/${totalPages}` : ''}
            </span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={() => setRingPage(Math.max(0, ringPage - 1))} disabled={ringPage === 0}
                  style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', opacity: ringPage === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={12} />
                </button>
                <button onClick={() => setRingPage(Math.min(totalPages - 1, ringPage + 1))} disabled={ringPage >= totalPages - 1}
                  style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', opacity: ringPage >= totalPages - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>

          {/* SVG Ring Canvas */}
          <div style={{
            position: 'absolute', top: 36, left: 0, right: 0, bottom: 0,
            background: `radial-gradient(circle at center, #fff 0%, ${T.surfaceAlt} 55%, ${T.hover} 100%)`,
            backgroundImage: `radial-gradient(circle at center, #fff 0%, ${T.surfaceAlt} 55%, ${T.hover} 100%), radial-gradient(circle, ${T.border} 1px, transparent 1px)`,
            backgroundSize: 'cover, 24px 24px',
          }}>
            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Orbital ring */}
              <circle cx={cx} cy={cy} r={R} fill="none" stroke={T.border} strokeWidth={1}
                strokeDasharray="6 4" opacity={0.4} />

              {/* Spokes + date chips */}
              {pageItems.map((item, i) => {
                const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
                const ex = cx + R * Math.cos(ang);
                const ey = cy + R * Math.sin(ang);
                const isSelected = selectedId === item.key;
                const hasSel = selectedId !== null;
                const statusColor = STATUS_SOLID[item.status].bg;

                // Midpoint for date chip
                const mx = (cx + ex) / 2;
                const my = (cy + ey) / 2;

                return (
                  <g key={item.key}>
                    {/* Spoke line */}
                    <line x1={cx} y1={cy} x2={ex} y2={ey}
                      stroke={isSelected ? T.accent : statusColor}
                      strokeWidth={isSelected ? 2.5 : 1.2}
                      strokeDasharray={isSelected ? 'none' : '5 4'}
                      opacity={hasSel ? (isSelected ? 1 : 0.15) : 0.5}
                    />
                    {/* Date chip at midpoint */}
                    <g transform={`translate(${mx}, ${my})`}>
                      <rect x={-30} y={-10} width={60} height={20} rx={10}
                        fill={isSelected ? T.accent : '#FFFFFF'}
                        stroke={isSelected ? '#1D4ED8' : '#CBD5E1'}
                        strokeWidth={1}
                        opacity={hasSel && !isSelected ? 0.3 : 1}
                      />
                      <text x={0} y={4} textAnchor="middle" style={{
                        fontSize: 9.5, fontWeight: 600, fontFamily: T.inter,
                        fill: isSelected ? '#FFFFFF' : T.ink2,
                        opacity: hasSel && !isSelected ? 0.3 : 1,
                      }}>
                        {relativeDate(item.assignedDate)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* Center identity */}
            <div style={{
              position: 'absolute', left: cx - 38, top: cy - 50, width: 76, textAlign: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 76, height: 76, borderRadius: '50%', margin: '0 auto',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 4px #fff, 0 0 0 6px #2563EB, 0 0 20px rgba(37,99,235,.2)',
              }}>
                <span style={{ fontFamily: T.sora, fontSize: 24, fontWeight: 800, color: '#FFFFFF' }}>{initials}</span>
              </div>
              <div style={{ fontFamily: T.sora, fontSize: 12, fontWeight: 700, color: T.ink1, marginTop: 6 }}>{resourceName}</div>
              <div style={{ fontSize: 10, color: T.ink4 }}>{resourceRole}</div>
            </div>

            {/* Cards */}
            {pageItems.map((item, i) => {
              const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
              const ex = cx + R * Math.cos(ang);
              const ey = cy + R * Math.sin(ang);
              const left = ex - cardW / 2;
              const top = ey - cardH / 2;
              const isSelected = selectedId === item.key;
              const age = itemAge(item.assignedDate);
              const stale = staleLevel(age, item.status);

              return (
                <div
                  key={item.key}
                  onClick={() => selectCard(item.key)}
                  onMouseEnter={(e) => { setHoveredId(item.key); setTooltipPos({ x: e.clientX + 12, y: e.clientY - 20 }); }}
                  onMouseMove={(e) => setTooltipPos({ x: e.clientX + 12, y: e.clientY - 20 })}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: 'absolute', left, top, width: cardW,
                    cursor: 'pointer', transition: 'box-shadow 200ms, transform 200ms',
                    borderRadius: '0 0 8px 8px',
                    border: isSelected ? `2px solid ${T.accent}` : '2px solid transparent',
                    borderTop: 'none',
                    boxShadow: isSelected
                      ? `0 0 0 3px rgba(37,99,235,.25), 0 12px 40px rgba(37,99,235,.2)`
                      : '0 2px 12px rgba(0,0,0,.06)',
                    background: T.surface,
                    zIndex: isSelected ? 10 : 1,
                  }}
                  onMouseOver={e => { if (!isSelected) (e.currentTarget as any).style.boxShadow = '0 8px 28px rgba(0,0,0,.12)'; }}
                  onMouseOut={e => { if (!isSelected) (e.currentTarget as any).style.boxShadow = '0 2px 12px rgba(0,0,0,.06)'; }}
                >
                  {/* Type ribbon */}
                  <div style={{
                    height: 22, borderRadius: '8px 8px 0 0', background: '#334155',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 8px', fontSize: 10, fontWeight: 700, color: '#FFFFFF',
                  }}>
                    <span>{item.type.toUpperCase()}</span>
                    <span style={{ fontSize: 9, opacity: 0.8 }}>{item.priority}</span>
                  </div>
                  {/* Card body */}
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.accent }}>{item.key}</span>
                      <HubBadge hub={item.hub} />
                      <span style={{ fontFamily: T.mono, fontSize: 9, color: ageHeatColor(age), fontWeight: 700, marginLeft: 'auto' }}>
                        {age}d
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: T.ink1, lineHeight: 1.3,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', marginBottom: 6, minHeight: 28,
                    }}>{item.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StatusPill status={item.status} small />
                      {stale && (
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          color: stale === 'critical' ? T.danger : T.warning,
                        }}>
                          {stale === 'critical' ? 'CRITICAL' : 'STALE'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Completed toggle tab (only when panel hidden and no selection) */}
            {panelMode === 'hidden' && !selectedId && (
              <div
                onClick={toggleCompleted}
                style={{
                  position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 36, background: T.surface, cursor: 'pointer',
                  border: `1px solid ${T.border}`, borderRight: 'none',
                  borderRadius: '8px 0 0 8px', padding: '12px 6px', textAlign: 'center',
                  boxShadow: '-2px 0 8px rgba(0,0,0,.06)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 18, height: 18, borderRadius: 9, background: T.done,
                  color: '#FFFFFF', fontSize: 9, fontWeight: 800,
                }}>{doneCount}</span>
                <span style={{
                  writingMode: 'vertical-lr', fontSize: 10, fontWeight: 600, color: T.ink2,
                  letterSpacing: '0.02em',
                }}>Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{
          width: panelWidth, overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
          borderLeft: panelWidth > 0 ? `1px solid ${T.border}` : 'none',
          background: T.surface, flexShrink: 0,
        }}>
          {panelMode === 'completed' && (
            <div style={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
                borderBottom: `1px solid ${T.border}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.ink1 }}>Completed</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 20, height: 18, borderRadius: 9, background: T.done,
                  color: '#FFFFFF', fontSize: 9, fontWeight: 800, padding: '0 5px',
                }}>{doneCount}</span>
                <div style={{ flex: 1 }} />
                <button onClick={closePanel} style={{
                  width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`,
                  background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={14} color={T.ink3} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                {DONE_ITEMS.map(item => (
                  <div key={item.key} onClick={() => selectCard(item.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                    cursor: 'pointer', borderBottom: `1px solid ${T.borderLt}`,
                  }}
                    onMouseOver={e => (e.currentTarget.style.background = T.hover)}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 3, height: 28, borderRadius: 2, background: T.done, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.ink1 }}>{item.key}</span>
                        <HubBadge hub={item.hub} />
                      </div>
                      <div style={{ fontSize: 10, color: T.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {panelMode === 'detail' && selectedItem && (
            <div style={{ width: 360, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {/* Detail header */}
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 800, color: T.accent }}>{selectedItem.key}</span>
                    <StatusPill status={selectedItem.status} />
                    <PriorityPill priority={selectedItem.priority} />
                    <HubBadge hub={selectedItem.hub} />
                  </div>
                  <button onClick={closePanel} style={{
                    width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`,
                    background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <X size={16} color={T.ink3} />
                  </button>
                </div>
                <div style={{ fontFamily: T.sora, fontSize: 13, fontWeight: 700, color: T.ink1, lineHeight: 1.35 }}>{selectedItem.title}</div>
              </div>

              {/* Stale alert */}
              {(() => {
                const age = itemAge(selectedItem.assignedDate);
                const s = staleLevel(age, selectedItem.status);
                if (!s) return null;
                return (
                  <div style={{
                    margin: '8px 16px', padding: '8px 12px', borderRadius: 6,
                    background: s === 'critical' ? '#FEF2F2' : '#FFFBEB',
                    border: `1px solid ${s === 'critical' ? '#FECACA' : '#FDE68A'}`,
                    fontSize: 11, fontWeight: 600,
                    color: s === 'critical' ? T.danger : T.warning,
                  }}>
                    {s === 'critical' ? '🔴 Critical' : '⚠️ Stale'} — {age} days without resolution
                  </div>
                );
              })()}

              {/* SLA badge */}
              {(() => {
                const due = smartDue(selectedItem);
                if (!due) return null;
                const sla = slaBadge(due.date);
                return (
                  <div style={{ padding: '0 16px 8px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                      fontSize: 11, fontWeight: 700, background: sla.bg, color: sla.color,
                    }}>
                      {sla.label}
                      {due.source === 'release' && <span style={{ fontWeight: 400, marginLeft: 4, opacity: 0.7 }}>(Sprint 47)</span>}
                    </span>
                  </div>
                );
              })()}

              {/* Breadcrumb */}
              {(() => {
                const h = HIERARCHY[selectedItem.parentKey];
                if (!h) return null;
                return (
                  <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, flexWrap: 'wrap' }}>
                    <HubBadge hub={selectedItem.hub} />
                    <span style={{ color: T.ink4 }}>{'>'}</span>
                    <span style={{ fontFamily: T.mono, fontWeight: 600, color: T.ink3 }}>{h.epicKey}</span>
                    <span style={{ color: T.ink4 }}>{'>'}</span>
                    <span style={{ fontFamily: T.mono, fontWeight: 600, color: T.ink3 }}>{h.storyKey}</span>
                    <span style={{ color: T.ink4 }}>{'>'}</span>
                    <span style={{ fontFamily: T.mono, fontWeight: 700, color: T.accent }}>{selectedItem.key}</span>
                  </div>
                );
              })()}

              {/* Metadata grid */}
              <div style={{ margin: '0 16px', border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
                {[
                  [
                    { label: 'Reporter', value: 'Maali Alanazi' },
                    { label: 'Assigner', value: 'Eng. Fatima Al-Harbi' },
                  ],
                  [
                    { label: 'Assigned', value: `${relativeDate(selectedItem.assignedDate)} · ${new Date(selectedItem.assignedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` },
                    { label: 'Days Sitting', value: String(itemAge(selectedItem.assignedDate)), isAge: true },
                  ],
                  [
                    { label: 'Release', value: 'Sprint 47' },
                    { label: 'Due', value: (() => {
                      const due = smartDue(selectedItem);
                      if (!due) return '—';
                      return new Date(due.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                        (due.source === 'release' ? ' (Sprint 47)' : '');
                    })() },
                  ],
                ].map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', borderBottom: ri < 2 ? `1px solid ${T.border}` : 'none' }}>
                    {row.map((cell: any, ci: number) => {
                      const age = cell.isAge ? itemAge(selectedItem.assignedDate) : 0;
                      return (
                        <div key={ci} style={{
                          flex: 1, padding: '8px 12px',
                          borderRight: ci === 0 ? `1px solid ${T.border}` : 'none',
                        }}>
                          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: T.ink4, marginBottom: 3, letterSpacing: '0.05em' }}>{cell.label}</div>
                          <div style={{
                            fontSize: 11, fontWeight: cell.isAge ? 800 : 500,
                            color: cell.isAge ? ageHeatColor(age) : T.ink1,
                            fontFamily: cell.isAge ? T.mono : T.inter,
                          }}>
                            {cell.value}
                            {cell.isAge && (
                              <div style={{
                                marginTop: 4, height: 4, borderRadius: 2, background: T.borderLt,
                                overflow: 'hidden',
                              }}>
                                <div style={{
                                  height: '100%', borderRadius: 2, width: `${Math.min(100, (age / 30) * 100)}%`,
                                  background: ageHeatColor(age),
                                }} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Hierarchy */}
              {(() => {
                const h = HIERARCHY[selectedItem.parentKey];
                if (!h) return null;
                return (
                  <div style={{ margin: '12px 16px 0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.ink4, marginBottom: 8, letterSpacing: '0.05em' }}>HIERARCHY</div>
                    {/* Epic */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: T.surfaceAlt, borderRadius: 6, marginBottom: 2 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 8, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 8, color: '#FFFFFF', fontWeight: 800 }}>E</span>
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.ink2 }}>{h.epicKey}</span>
                      <span style={{ fontSize: 10, color: T.ink3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.epicTitle}</span>
                    </div>
                    <div style={{ width: 2, height: 10, background: T.border, marginLeft: 17 }} />
                    {/* Story */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: T.surfaceAlt, borderRadius: 6, marginBottom: 2 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 8, color: '#FFFFFF', fontWeight: 800 }}>S</span>
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.ink2 }}>{h.storyKey}</span>
                      <span style={{ fontSize: 10, color: T.ink3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.storyTitle}</span>
                      <StatusPill status={h.storyStatus} small />
                    </div>
                    <div style={{ width: 2, height: 10, background: T.border, marginLeft: 17 }} />
                    {/* Current */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#EFF6FF', border: `1px solid ${T.accent}`, borderRadius: 6 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 8, color: '#FFFFFF', fontWeight: 800 }}>T</span>
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.accent }}>{selectedItem.key}</span>
                      <span style={{ fontSize: 10, color: T.ink1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{selectedItem.title}</span>
                      <StatusPill status={selectedItem.status} small />
                    </div>
                  </div>
                );
              })()}

              {/* Siblings */}
              {(() => {
                const sibs = SIBLINGS[selectedItem.parentKey];
                if (!sibs || sibs.length === 0) return null;
                const doneCount = sibs.filter(s => s.status === 'done').length;
                return (
                  <div style={{ margin: '12px 16px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.ink4, letterSpacing: '0.05em' }}>SIBLINGS</span>
                      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.ink3 }}>{doneCount}/{sibs.length}</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: T.borderLt, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${(doneCount / sibs.length) * 100}%`, background: T.done }} />
                    </div>
                    {sibs.map(s => (
                      <div key={s.key} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                        borderBottom: `1px solid ${T.borderLt}`,
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                          background: STATUS_SOLID[s.status].bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 8, fontWeight: 800, color: '#FFFFFF' }}>{s.name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontFamily: T.mono, fontSize: 9.5, fontWeight: 700, color: T.ink2 }}>{s.key}</span>
                            <StatusPill status={s.status} small />
                            <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 700, color: ageHeatColor(s.age), marginLeft: 'auto' }}>{s.age}d</span>
                          </div>
                          <div style={{ fontSize: 10, color: T.ink3, marginTop: 1 }}>{s.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ── TOOLTIP ── */}
      {hoveredId && hoveredId !== selectedId && (() => {
        const item = [...ACTIVE_ITEMS, ...DONE_ITEMS].find(i => i.key === hoveredId);
        if (!item) return null;
        const age = itemAge(item.assignedDate);
        const due = smartDue(item);
        return (
          <div style={{
            position: 'fixed', left: Math.min(tooltipPos.x, window.innerWidth - 240), top: Math.min(tooltipPos.y, window.innerHeight - 160),
            width: 220, background: '#0F172A', color: '#FFFFFF', borderRadius: 8, padding: '10px 12px',
            fontSize: 11, zIndex: 1000, pointerEvents: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,.3)',
            transition: 'opacity 150ms', lineHeight: 1.4,
          }}>
            <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: '#60A5FA', marginBottom: 4 }}>
              {item.key} · {item.type}
            </div>
            <div style={{ color: '#F1F5F9', marginBottom: 6 }}>{item.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10, color: '#94A3B8' }}>
              <span>Priority: <span style={{ color: PRIORITY_COLORS[item.priority] || '#94A3B8', fontWeight: 600 }}>{item.priority}</span></span>
              <span>Assigned: {relativeDate(item.assignedDate)}</span>
              <span>Age: <span style={{ color: ageHeatColor(age), fontWeight: 700 }}>{age}d</span></span>
              {due && <span>Due: {new Date(due.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default RingViewV16;
