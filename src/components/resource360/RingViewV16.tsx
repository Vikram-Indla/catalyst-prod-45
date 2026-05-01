/**
 * Resource 360° — Ring View V16
 * Static polar ring with weekly chronological paging, inline detail panel,
 * completed toggle sidebar, type ribbons, date chips on spokes.
 * ALL DATA from Jira via props — ZERO hardcoded mock items.
 *
 * Gate 9 fixes: DEF-02 through DEF-16
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { HUB_COLORS, HUB_SHORT, PRIORITY_COLORS } from '@/constants/resource360';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { Resource360Item } from '@/types/resource360';

// ─── TOKENS ───
const T = {
  bg: 'var(--bg-1)', surface: 'var(--bg-app)', surfaceAlt: 'var(--bg-1)', hover: 'var(--bg-3)',
  ink1: 'var(--fg-1)', ink2: 'var(--fg-2)', ink3: 'var(--fg-3)', ink4: 'var(--fg-4)',
  border: 'var(--divider)', borderLt: 'var(--bg-3)',
  accent: 'var(--cp-blue)',
  todo: '#1E293B', progress: 'var(--cp-blue)', done: '#0E8A5F',
  danger: 'var(--sem-danger)', warning: 'var(--sem-warning)', success: 'var(--sem-success)',
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  sora: "'Sora', 'Inter', sans-serif",
  inter: "'Inter', sans-serif",
};

type StatusCat = 'todo' | 'progress' | 'done';

// ─── CG-05 STATUS COLORS (DEF-02 fix) ───
const STATUS_CG05: Record<StatusCat, { dot: string; bg: string; text: string }> = {
  todo:     { dot: 'var(--ds-text-warning, #D97706)', bg: '#FFFBEB', text: '#78350F' },
  progress: { dot: 'var(--ds-text-brand, #2563EB)', bg: 'var(--ds-background-selected, #EFF6FF)', text: '#1E3A5F' },
  done:     { dot: 'var(--ds-text-success, #16A34A)', bg: '#F0FDF4', text: '#14532D' },
};

const STATUS_SOLID: Record<StatusCat, { bg: string; text: string }> = {
  todo:     { bg: 'var(--ds-text-warning, #D97706)', text: 'var(--ds-text-inverse, #FFFFFF)' },
  progress: { bg: 'var(--ds-text-brand, #2563EB)', text: 'var(--ds-text-inverse, #FFFFFF)' },
  done:     { bg: 'var(--ds-text-success, #16A34A)', text: 'var(--ds-text-inverse, #FFFFFF)' },
};

// ─── JIRA ICON HELPER — delegates to canonical guardrail ───
function getJiraIconForType(typeStr: string) {
  return <JiraIssueTypeIcon type={typeStr} />;
}

// ─── JIRA TYPE BADGE STYLES (DEF-05) ───
function getTypeBadgeStyle(typeStr: string): { bg: string; color: string } {
  const lower = (typeStr || '').toLowerCase();
  if (lower.includes('bug')) return { bg: 'var(--ds-background-danger, #FEF2F2)', color: '#7F1D1D' };
  if (lower.includes('epic')) return { bg: '#F5F3FF', color: '#4C1D95' };
  if (lower.includes('story')) return { bg: '#F0FDF4', color: '#14532D' };
  if (lower.includes('sub')) return { bg: '#F0FDFA', color: '#134E4A' };
  return { bg: 'var(--ds-background-selected, #EFF6FF)', color: '#1E3A5F' };
}

// ─── INTERNAL WORK ITEM ───
interface WorkItem {
  key: string; type: string; priority: string; status: StatusCat;
  hub: string; assignedDate: string; dateLabel: 'Assigned' | 'Created'; parentKey: string | null;
  parentTitle: string | null; parentType: string | null;
  dueDate: string | null; releaseEnd: string | null;
  releaseName: string | null;
  title: string;
  assignerName: string | null;
  projectName: string | null;
  projectKey: string | null;
  projectColor: string | null;
  ageDays: number;
}

function mapStatusCategory(raw: string): StatusCat {
  const lower = raw?.toLowerCase() || '';
  if (lower.includes('done') || lower.includes('closed') || lower.includes('resolved') || lower.includes('complete')) return 'done';
  if (lower.includes('progress') || lower.includes('in_progress') || lower.includes('review') || lower.includes('qa')) return 'progress';
  return 'todo';
}

function mapHubShort(hub: string): string {
  if (!hub) return 'PROJ';
  const s = HUB_SHORT as Record<string, string>;
  if (s[hub]) return s[hub];
  return hub.replace('Hub', '').toUpperCase().slice(0, 4);
}

function mapItemType(raw: string): string {
  if (!raw) return 'Task';
  const lower = raw.toLowerCase();
  if (lower.includes('bug') || lower.includes('defect')) return 'Bug';
  if (lower.includes('epic')) return 'Epic';
  if (lower.includes('story')) return 'Story';
  if (lower.includes('sub')) return 'Sub-task';
  return 'Task';
}

function mapItem(r: Resource360Item): WorkItem {
  const hasAssigned = !!r.assigned_at;
  return {
    key: r.item_key,
    type: mapItemType(r.item_type),
    priority: r.priority || 'Medium',
    status: mapStatusCategory(r.status_category),
    hub: mapHubShort(r.hub),
    assignedDate: r.assigned_at?.slice(0, 10) || r.item_created_at?.slice(0, 10) || '2026-01-01',
    dateLabel: hasAssigned ? 'Assigned' : 'Created',
    parentKey: r.parent_key || null,
    parentTitle: r.parent_title || null,
    parentType: r.parent_type || null,
    dueDate: r.release_end_date || null,
    releaseEnd: r.release_end_date || null,
    releaseName: r.release_name || null,
    title: r.title,
    assignerName: r.assigner_name || null,
    projectName: r.project_name || null,
    projectKey: r.project_key || null,
    projectColor: (r as any).project_color || null,
    ageDays: r.age_days ?? 0,
  };
}

// ─── PROJECT COLOR MAP (DEF-06 fallback) ───
const PROJECT_COLOR_FALLBACK: Record<string, string> = {
  BAU: 'var(--ds-text-brand, #2563EB)',
  SEN: 'var(--ds-text-warning, #D97706)',
  FAC: 'var(--ds-text-success, #16A34A)',
  OPS: '#0D9488',
  SUP: 'var(--ds-text-subtlest, #64748B)',
  LND: '#7C3AED',
};

function getProjectColor(item: WorkItem): string {
  if (item.projectColor) return item.projectColor;
  if (item.projectKey && PROJECT_COLOR_FALLBACK[item.projectKey]) return PROJECT_COLOR_FALLBACK[item.projectKey];
  return 'var(--ds-text-subtlest, #64748B)';
}

// ─── HELPERS ───
const NOW = new Date();

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

function getISOWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return mon.toISOString().slice(0, 10);
}

function staleLevel(age: number, status: StatusCat): 'critical' | 'stale' | null {
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
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, bg: 'var(--ds-background-danger, #FEF2F2)', color: T.danger };
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

function weekLabel(_weekStart: string, idx: number): string {
  if (idx === 0) return 'This Week';
  return 'Week';
}

function weekRange(weekStart: string): string {
  const s = new Date(weekStart);
  const e = new Date(s); e.setDate(s.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`;
}

// ─── STATUS PILL — CG-05 Desaturated (DEF-02 fix) ───
const StatusPill: React.FC<{ status: StatusCat; small?: boolean }> = ({ status, small }) => {
  const c = STATUS_CG05[status];
  const label = status === 'todo' ? 'To Do' : status === 'progress' ? 'In Progress' : 'Done';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '1px 6px' : '2px 8px',
      borderRadius: 6, fontSize: small ? 9 : 10, fontWeight: 600,
      background: c.bg, color: c.text, whiteSpace: 'nowrap',
      lineHeight: 1.5,
    }}>
      <span style={{ width: small ? 5 : 6, height: small ? 5 : 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
};

// ─── HUB BADGE ───
const HubBadge: React.FC<{ hub: string }> = ({ hub }) => {
  const color = (HUB_COLORS as Record<string, string>)[hub] || T.accent;
  return (
    <span style={{
      display: 'inline-block', padding: '1px 5px', borderRadius: 4,
      fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em',
      background: color, color: 'var(--ds-text-inverse, #FFFFFF)', lineHeight: 1.5,
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
  items: Resource360Item[];
  onItemClick?: (item: any) => void;
  onAiClick?: () => void;
}

type ActiveFilter = 'all' | 'todo' | 'progress';
type PanelMode = 'hidden' | 'completed' | 'detail';

const MAX_PER_PAGE = 8;

const CARD_POSITIONS = [
  { x: 2,  y: 2  },   // slot 0: top-left
  { x: 33, y: 0  },   // slot 1: top-center
  { x: 62, y: 2  },   // slot 2: top-right
  { x: 0,  y: 33 },   // slot 3: mid-left
  { x: 65, y: 31 },   // slot 4: mid-right
  { x: 2,  y: 60 },   // slot 5: bottom-left
  { x: 33, y: 63 },   // slot 6: bottom-center
  { x: 62, y: 58 },   // slot 7: bottom-right
];

const RingViewV16: React.FC<RingViewV16Props> = ({ resource, items: rawItems, onItemClick }) => {
  const { isDark } = useTheme();
  const ringCanvasRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [statusFilter, setStatusFilter] = useState<ActiveFilter>('all');
  const [weekIdx, setWeekIdx] = useState(0);
  const [ringPage, setRingPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('hidden');
  const [spokes, setSpokes] = useState<Array<{ key: string; x1: number; y1: number; x2: number; y2: number; age: number }>>([]);

  const allItems = useMemo(() => rawItems.map(mapItem), [rawItems]);
  const activeItems = useMemo(() => allItems.filter(i => i.status !== 'done'), [allItems]);
  const doneItems = useMemo(() => allItems.filter(i => i.status === 'done'), [allItems]);

  const siblingMap = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    allItems.forEach(i => {
      if (i.parentKey) {
        if (!map.has(i.parentKey)) map.set(i.parentKey, []);
        map.get(i.parentKey)!.push(i);
      }
    });
    return map;
  }, [allItems]);

  // No ResizeObserver needed — fixed 720px canvas with percentage positions

  const filteredActive = useMemo(() => {
    let items = activeItems;
    if (statusFilter === 'todo') items = items.filter(i => i.status === 'todo');
    if (statusFilter === 'progress') items = items.filter(i => i.status === 'progress');
    return items;
  }, [activeItems, statusFilter]);

  const weeks = useMemo(() => groupByWeek(filteredActive), [filteredActive]);
  const currentWeek = weeks[weekIdx] || null;
  const weekItems = currentWeek?.items || [];

  // Paginate filtered items across the ring
  const totalPages = Math.max(1, Math.ceil(filteredActive.length / MAX_PER_PAGE));
  const pageItems = filteredActive.slice(ringPage * MAX_PER_PAGE, (ringPage + 1) * MAX_PER_PAGE);

  useEffect(() => { setRingPage(0); }, [weekIdx]);

  const todoCount = activeItems.filter(i => i.status === 'todo').length;
  const progressCount = activeItems.filter(i => i.status === 'progress').length;
  const doneCount = doneItems.length;

  const computeSpokes = useCallback(() => {
    const canvasEl = ringCanvasRef.current;
    const centerEl = centerRef.current;
    if (!canvasEl || !centerEl) return;

    const canvasRect = canvasEl.getBoundingClientRect();
    const centerRect = centerEl.getBoundingClientRect();
    const avatarCx = centerRect.left + centerRect.width / 2 - canvasRect.left;
    const avatarCy = centerRect.top + centerRect.height / 2 - canvasRect.top;

    // Use spoke hub slightly below avatar center (matches reference layout)
    const hubX = avatarCx;
    const hubY = avatarCy + 92;

    const next = pageItems
      .map((item) => {
        const cardEl = cardRefs.current[item.key];
        if (!cardEl) return null;

        const cardRect = cardEl.getBoundingClientRect();
        const cardCx = cardRect.left + cardRect.width / 2 - canvasRect.left;
        const cardCy = cardRect.top + cardRect.height / 2 - canvasRect.top;

        // Precise line-rectangle intersection so spoke lands exactly on card border
        const dx = cardCx - hubX;
        const dy = cardCy - hubY;
        const left = cardRect.left - canvasRect.left;
        const right = left + cardRect.width;
        const top = cardRect.top - canvasRect.top;
        const bottom = top + cardRect.height;

        const candidates: number[] = [];
        if (dx !== 0) {
          candidates.push((left - hubX) / dx, (right - hubX) / dx);
        }
        if (dy !== 0) {
          candidates.push((top - hubY) / dy, (bottom - hubY) / dy);
        }

        let bestT = Number.POSITIVE_INFINITY;
        for (const t of candidates) {
          if (t <= 0 || t > 1) continue;
          const x = hubX + dx * t;
          const y = hubY + dy * t;
          const onVerticalEdge = x >= left - 0.5 && x <= right + 0.5;
          const onHorizontalEdge = y >= top - 0.5 && y <= bottom + 0.5;
          if (onVerticalEdge && onHorizontalEdge && t < bestT) bestT = t;
        }

        const x2 = Number.isFinite(bestT) ? hubX + dx * bestT : cardCx;
        const y2 = Number.isFinite(bestT) ? hubY + dy * bestT : cardCy;

        return { key: item.key, x1: hubX, y1: hubY, x2, y2, age: item.ageDays };
      })
      .filter((s): s is { key: string; x1: number; y1: number; x2: number; y2: number; age: number } => !!s);

    setSpokes(next);
  }, [pageItems]);

  useEffect(() => {
    if (!ringCanvasRef.current) return;
    const raf = requestAnimationFrame(() => computeSpokes());
    const timer = window.setTimeout(() => computeSpokes(), 60);
    const ro = new ResizeObserver(() => computeSpokes());
    ro.observe(ringCanvasRef.current);
    window.addEventListener('resize', computeSpokes);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      ro.disconnect();
      window.removeEventListener('resize', computeSpokes);
    };
  }, [computeSpokes, panelMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedId(null); setPanelMode('hidden'); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (pageItems.length === 0) return;
        const curIdx = selectedId ? pageItems.findIndex(i => i.key === selectedId) : -1;
        const next = (curIdx + 1) % pageItems.length;
        setSelectedId(pageItems[next].key); setPanelMode('detail');
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (pageItems.length === 0) return;
        const curIdx = selectedId ? pageItems.findIndex(i => i.key === selectedId) : 0;
        const prev = (curIdx - 1 + pageItems.length) % pageItems.length;
        setSelectedId(pageItems[prev].key); setPanelMode('detail');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, pageItems]);

  const selectCard = useCallback((key: string) => {
    setSelectedId(key); setPanelMode('detail');
    // Also notify parent to open the item detail drawer
    if (onItemClick) {
      const original = rawItems.find(r => r.item_key === key);
      if (original) onItemClick(original);
    }
  }, [onItemClick, rawItems]);
  const closePanel = useCallback(() => { setSelectedId(null); setPanelMode('hidden'); }, []);
  const toggleCompleted = useCallback(() => {
    if (panelMode === 'completed') { setPanelMode('hidden'); } else { setSelectedId(null); setPanelMode('completed'); }
  }, [panelMode]);

  const panelWidth = panelMode === 'detail' ? 460 : panelMode === 'completed' ? 280 : 0;

  const initials = resource?.initials || resource?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';
  const resourceName = resource?.name || resource?.full_name || 'Resource';
  const resourceRole = resource?.role || '';

  const selectedItem = selectedId ? allItems.find(i => i.key === selectedId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', fontFamily: T.inter }}>
      {/* §5 FILTER BAR — 38px */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px',
        background: 'var(--bg-app)', borderBottom: `1px solid ${T.border}`, height: 38, flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ACTIVE</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {([
            { key: 'all' as const, label: `All (${activeItems.length})` },
            { key: 'todo' as const, label: `To Do (${todoCount})` },
            { key: 'progress' as const, label: `In Progress (${progressCount})` },
          ]).map(f => {
            const active = statusFilter === f.key;
            return (
              <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
                height: 26, padding: '0 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                background: active ? 'transparent' : 'transparent',
                color: active ? 'var(--cp-blue)' : 'var(--fg-2)',
                border: `1px solid ${active ? 'var(--cp-blue)' : T.border}`, cursor: 'pointer',
                fontFamily: T.inter,
              }}>{f.label}</button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 26,
          border: `1px solid ${T.border}`, borderRadius: 6, background: 'var(--bg-app)', fontSize: 11, color: 'var(--fg-4)',
        }}>
          <span>Q</span>
          <span>Search… (/)</span>
        </div>
        {/* Pagination */}
        <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600, fontFamily: T.inter }}>
          {filteredActive.length} items · Page {ringPage + 1}/{Math.max(1, Math.ceil(filteredActive.length / MAX_PER_PAGE))}
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={() => setRingPage(Math.max(0, ringPage - 1))} disabled={ringPage <= 0} style={{
            width: 24, height: 24, border: `1px solid ${T.border}`, borderRadius: 4,
            background: 'var(--bg-app)', cursor: ringPage <= 0 ? 'not-allowed' : 'pointer',
            opacity: ringPage <= 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><ChevronLeft size={12} color={T.ink2} /></button>
          <button onClick={() => setRingPage(Math.min(Math.ceil(filteredActive.length / MAX_PER_PAGE) - 1, ringPage + 1))}
            disabled={ringPage >= Math.ceil(filteredActive.length / MAX_PER_PAGE) - 1}
            style={{
              width: 24, height: 24, border: `1px solid ${T.border}`, borderRadius: 4,
              background: 'var(--bg-app)', cursor: ringPage >= Math.ceil(filteredActive.length / MAX_PER_PAGE) - 1 ? 'not-allowed' : 'pointer',
              opacity: ringPage >= Math.ceil(filteredActive.length / MAX_PER_PAGE) - 1 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><ChevronRight size={12} color={T.ink2} /></button>
        </div>
      </div>

      {/* §6 WEEK RIBBON — 36px (DEF-10: Calendar icon, not pin) */}
      <div style={{
        height: 50, display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px',
        borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        background: 'linear-gradient(90deg, rgba(37,99,235,0.06), transparent 60%)',
      }}>
        <button onClick={() => setWeekIdx(Math.min(weekIdx + 1, weeks.length - 1))}
          disabled={weekIdx >= weeks.length - 1}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${T.border}`, borderRadius: 6, background: 'var(--bg-app)',
            cursor: weekIdx >= weeks.length - 1 ? 'not-allowed' : 'pointer',
            opacity: weekIdx >= weeks.length - 1 ? 0.35 : 1,
          }}>
          <ChevronLeft size={14} color={T.ink2} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} color="var(--ds-text-brand, #2563EB)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', fontFamily: T.sora }}>
            {currentWeek ? weekLabel(currentWeek.weekStart, weekIdx) : 'No items'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>
            {currentWeek ? weekRange(currentWeek.weekStart) : ''}
          </span>
        </div>
        <button onClick={() => setWeekIdx(Math.max(weekIdx - 1, 0))}
          disabled={weekIdx <= 0}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${T.border}`, borderRadius: 6, background: 'var(--bg-app)',
            cursor: weekIdx <= 0 ? 'not-allowed' : 'pointer',
            opacity: weekIdx <= 0 ? 0.35 : 1,
          }}>
          <ChevronRight size={14} color={T.ink2} />
        </button>
      </div>

      {/* §7 RING + PANEL LAYOUT */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Ring column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* §7 VIEWPORT — fixed 720px, hard clip */}
          <div ref={ringCanvasRef} style={{
            position: 'relative', height: 720, overflow: 'hidden',
            background: isDark
              ? 'radial-gradient(circle at center, var(--ds-surface, #0A0A0A) 0%, var(--ds-surface, #0A0A0A) 55%, var(--ds-surface-raised, #1A1A1A) 100%)'
              : 'radial-gradient(circle at center, var(--ds-surface, #fff) 0%, var(--ds-surface-sunken, #F8FAFC) 55%, var(--ds-surface-sunken, #F1F5F9) 100%)',
            backgroundImage: isDark
              ? 'radial-gradient(circle at center, var(--ds-surface, #0A0A0A) 0%, var(--ds-surface, #0A0A0A) 55%, var(--ds-surface-raised, #1A1A1A) 100%), radial-gradient(circle, var(--ds-border, #292929) 1px, transparent 1px)'
              : 'radial-gradient(circle at center, var(--ds-surface, #fff) 0%, var(--ds-surface-sunken, #F8FAFC) 55%, var(--ds-surface-sunken, #F1F5F9) 100%), radial-gradient(circle, var(--ds-text-disabled, #CBD5E1) 1px, transparent 1px)',
            backgroundSize: 'cover, 24px 24px',
            boxSizing: 'border-box',
            padding: 20,
          }}>
            {/* SVG spokes — pixel-aligned to rendered cards */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, overflow: 'hidden', pointerEvents: 'none' }}>
              {spokes.map((s) => {
                const item = pageItems.find((p) => p.key === s.key);
                if (!item) return null;
                const isSelected = selectedId === item.key;
                const hasSel = selectedId !== null;
                const statusColor = STATUS_CG05[item.status].dot;
                return (
                  <line key={item.key}
                    x1={s.x1} y1={s.y1}
                    x2={s.x2} y2={s.y2}
                    stroke={isSelected ? T.accent : statusColor}
                    strokeWidth={isSelected ? 2.5 : 1.2}
                    strokeDasharray={isSelected ? 'none' : '8 5'}
                    strokeLinecap="round"
                    opacity={hasSel ? (isSelected ? 1 : 0.15) : 0.5}
                  />
                );
              })}
            </svg>

            {/* Date chips on spokes */}
            {spokes.map((s) => {
              const isSelected = selectedId === s.key;
              const hasSel = selectedId !== null;
              const midLeft = (s.x1 + s.x2) / 2;
              const midTop = (s.y1 + s.y2) / 2;
              return (
                <div key={`chip-${s.key}`} style={{
                  position: 'absolute',
                  left: `${midLeft}px`, top: `${midTop}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2, pointerEvents: 'none',
                  background: isSelected ? T.accent : 'var(--bg-app)',
                  border: `1px solid ${isSelected ? 'var(--ds-background-brand-bold-hovered, #1D4ED8)' : 'var(--divider)'}`,
                  borderRadius: 12, padding: '2px 8px',
                  fontSize: 9.5, fontWeight: 600, fontFamily: T.mono,
                  color: isSelected ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--fg-2)',
                  opacity: hasSel && !isSelected ? 0.3 : 1,
                  whiteSpace: 'nowrap',
                }}>
                  {s.age}d ago
                </div>
              );
            })}

            {/* CENTER IDENTITY */}
            <div style={{
              position: 'absolute', left: '50%', top: '48%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center', pointerEvents: 'none', zIndex: 3,
            }}>
              <div ref={centerRef} style={{
                width: 76, height: 76, borderRadius: '50%', margin: '0 auto',
                background: 'linear-gradient(135deg, var(--cp-blue), var(--ds-background-brand-bold-hovered, #1D4ED8))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 4px var(--ds-surface, #fff), 0 0 0 6px var(--cp-blue), 0 0 20px rgba(37,99,235,.2)',
              }}>
                <span style={{ fontFamily: T.sora, fontSize: 24, fontWeight: 800, color: 'var(--ds-text-inverse, #FFFFFF)' }}>{initials}</span>
              </div>
              <div style={{ fontFamily: T.sora, fontSize: 12, fontWeight: 700, color: 'var(--fg-1)', marginTop: 6 }}>{resourceName}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-3)', fontWeight: 500 }}>{resourceRole}</div>
            </div>

            {/* Orbital cards — percentage positioned */}
            {pageItems.map((item, i) => {
              const pos = CARD_POSITIONS[i];
              if (!pos) return null;
              const isSelected = selectedId === item.key;
              const age = item.ageDays;
              const stale = staleLevel(age, item.status);
              const statusColors = STATUS_CG05[item.status];
              const projColor = getProjectColor(item);
              const typeBadge = getTypeBadgeStyle(item.type);

              return (
                <div
                  key={item.key}
                  ref={(el) => { cardRefs.current[item.key] = el; }}
                  onClick={() => selectCard(item.key)}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%`, top: `${pos.y}%`,
                    width: 195,
                    cursor: 'pointer', transition: 'box-shadow 200ms, transform 200ms',
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    boxShadow: isSelected
                      ? '0 0 0 3px rgba(37,99,235,.25), 0 12px 40px rgba(37,99,235,.2)'
                      : '0 4px 16px rgba(0,0,0,0.08)',
                    background: 'var(--bg-app)',
                    zIndex: isSelected ? 10 : 4,
                    overflow: 'hidden',
                  }}
                  onMouseOver={e => { if (!isSelected) (e.currentTarget as any).style.boxShadow = '0 8px 28px rgba(0,0,0,.12)'; (e.currentTarget as any).style.borderColor = 'var(--fg-4)'; }}
                  onMouseOut={e => { if (!isSelected) (e.currentTarget as any).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; (e.currentTarget as any).style.borderColor = T.border; }}
                >
                  {/* 3px left accent bar */}
                  <div style={{
                    position: 'absolute', left: 0, top: 8, bottom: 8,
                    width: 3, borderRadius: '0 2px 2px 0',
                    background: statusColors.dot,
                  }} />

                  <div style={{ padding: '8px 10px 10px 13px' }}>
                    {/* Row 1: Jira icon + type + priority */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 6px', borderRadius: 4, background: typeBadge.bg }}>
                        {getJiraIconForType(item.type)}
                        <span style={{ fontSize: 9, fontWeight: 700, color: typeBadge.color, textTransform: 'uppercase' }}>{item.type}</span>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'capitalize' }}>{item.priority}</span>
                    </div>

                    {/* Row 2: key + project tag + age */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: 'var(--cp-blue)' }}>{item.key}</span>
                      {item.projectKey && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                          background: projColor, color: 'var(--ds-text-inverse, #FFFFFF)', letterSpacing: '0.02em',
                        }}>{item.projectKey}</span>
                      )}
                      <span style={{ fontFamily: T.mono, fontSize: 9, color: ageHeatColor(age), fontWeight: 700, marginLeft: 'auto' }}>{age}d</span>
                    </div>

                    {/* Title: 2-line clamp */}
                    <div style={{
                      fontSize: 12.5, fontWeight: 500, color: '#020617', lineHeight: 1.35,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', marginBottom: 6, minHeight: 28,
                    }}>{item.title}</div>

                    {/* Status pill — inline colors */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StatusPill status={item.status} small />
                      {stale && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: stale === 'critical' ? T.danger : T.warning }}>
                          {stale === 'critical' ? 'CRITICAL' : 'STALE'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Completed badge — always visible */}
            {doneCount > 0 && (
              <div
                onClick={toggleCompleted}
                style={{
                  position: 'absolute', right: 20, top: '48%', transform: 'translateY(-50%)',
                  zIndex: 6, textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  cursor: 'pointer',
                }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--sem-success)', color: 'var(--ds-text-inverse, #FFFFFF)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.mono, fontSize: 18, fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(22,163,74,.3)',
                }}>{doneCount}</div>
                <span style={{
                  fontSize: 9.5, fontWeight: 700, color: '#14532D',
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  writingMode: 'vertical-rl',
                }}>COMPLETED</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          width: panelWidth, overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
          borderLeft: panelWidth > 0 ? `1px solid ${T.border}` : 'none',
          background: 'var(--bg-1)', flexShrink: 0,
        }}>
          {panelMode === 'completed' && (
            <div style={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
                borderBottom: `1px solid ${T.border}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>Completed</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 20, height: 18, borderRadius: 8, background: T.done,
                  color: 'var(--ds-text-inverse, #FFFFFF)', fontSize: 9, fontWeight: 800, padding: '0 5px',
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
                {doneItems.map(item => (
                  <div key={item.key} onClick={() => selectCard(item.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                    cursor: 'pointer', borderBottom: `1px solid ${T.borderLt}`,
                  }}
                    onMouseOver={e => (e.currentTarget.style.background = T.hover)}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 3, height: 28, borderRadius: 4, background: T.done, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: 'var(--fg-1)' }}>{item.key}</span>
                        <HubBadge hub={item.hub} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {panelMode === 'detail' && selectedItem && (
            <div style={{ width: 460, height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* STICKY HEADER */}
              <div style={{
                padding: '16px 20px', borderBottom: `1px solid ${T.border}`, background: 'var(--bg-1)',
                position: 'sticky', top: 0, zIndex: 2, flexShrink: 0,
              }}>
                {/* Close button */}
                <button onClick={closePanel} style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`,
                  background: 'var(--bg-app)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: T.ink3, transition: 'background 120ms',
                }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-3)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'var(--bg-app)')}
                >
                  <X size={14} />
                </button>

                {/* Key — mono blue */}
                <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: 'var(--cp-blue)', marginBottom: 8 }}>
                  {selectedItem.key}
                </div>

                {/* Badges row — CG-05 status pill + Jira type badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <StatusPill status={selectedItem.status} />
                  <PriorityPill priority={selectedItem.priority} />
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4,
                    background: getTypeBadgeStyle(selectedItem.type).bg, fontSize: 10, fontWeight: 600,
                    color: getTypeBadgeStyle(selectedItem.type).color,
                  }}>
                    {getJiraIconForType(selectedItem.type)}
                    <span style={{ textTransform: 'capitalize' }}>{selectedItem.type}</span>
                  </span>
                  {selectedItem.projectKey && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: getProjectColor(selectedItem), color: 'var(--ds-text-inverse, #FFFFFF)',
                    }}>
                      {selectedItem.projectKey}
                    </span>
                  )}
                </div>

                {/* Title */}
                <div style={{
                  fontFamily: T.inter, fontSize: 16, fontWeight: 600, color: '#020617',
                  lineHeight: 1.4,
                }}>{selectedItem.title}</div>

                {/* Stale/overdue alert */}
                {(() => {
                  const age = selectedItem.ageDays;
                  const s = staleLevel(age, selectedItem.status);
                  if (!s) return null;
                  return (
                    <div style={{
                      marginTop: 10, padding: '8px 12px', borderRadius: 8,
                      background: 'var(--ds-background-danger, #FEF2F2)', border: '1px solid #FECACA',
                      fontSize: 12, fontWeight: 600, color: 'var(--sem-danger)',
                    }}>
                      {s === 'critical' ? 'Critical' : 'Stale'} — {age} days without resolution
                    </div>
                  );
                })()}
              </div>

              {/* SCROLLABLE CONTENT */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>

                {/* Breadcrumb */}
                {selectedItem.parentKey && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', fontSize: 11 }}>
                    <HubBadge hub={selectedItem.hub} />
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: 'var(--fg-3)' }}>{selectedItem.parentKey}</span>
                    <span style={{ color: 'var(--fg-4)', fontSize: 10 }}>›</span>
                    <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: 'var(--cp-blue)' }}>{selectedItem.key}</span>
                  </div>
                )}

                {/* Metadata grid */}
                <div style={{ marginTop: 16, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  {[
                    [
                      { label: 'PROJECT', value: selectedItem.projectName || selectedItem.projectKey || '—' },
                      { label: 'ASSIGNER', value: selectedItem.assignerName || 'Unassigned' },
                    ],
                    [
                      { label: 'ASSIGNED', value: `${relativeDate(selectedItem.assignedDate)} · ${new Date(selectedItem.assignedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` },
                      { label: 'DAYS SITTING', value: String(selectedItem.ageDays), isAge: true },
                    ],
                    [
                      { label: 'RELEASE', value: selectedItem.releaseName || (selectedItem.parentKey ? `Inherited from ${selectedItem.parentKey}` : '—'), isInherited: !selectedItem.releaseName && !!selectedItem.parentKey },
                      { label: 'DUE', value: (() => {
                        const due = smartDue(selectedItem);
                        if (!due) return selectedItem.parentKey ? `Inherited from ${selectedItem.parentKey}` : '—';
                        return new Date(due.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                          (due.source === 'release' && selectedItem.releaseName ? ` (${selectedItem.releaseName})` : '');
                      })(), isInherited: !smartDue(selectedItem) && !!selectedItem.parentKey },
                    ],
                  ].map((row, ri) => (
                    <div key={ri} style={{
                      display: 'flex',
                      borderBottom: ri < 2 ? `1px solid ${T.border}` : 'none',
                      background: ri % 2 === 1 ? 'var(--bg-1)' : 'var(--bg-app)',
                    }}>
                      {row.map((cell: any, ci: number) => {
                        const age = cell.isAge ? selectedItem.ageDays : 0;
                        return (
                          <div key={ci} style={{
                            flex: 1, padding: '12px 14px',
                            borderRight: ci === 0 ? `1px solid ${T.border}` : 'none',
                          }}>
                            <div style={{
                              fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)',
                              marginBottom: 4, letterSpacing: '0.04em',
                            }}>{cell.label}</div>
                            <div style={{
                              fontSize: cell.isAge ? 18 : 13,
                              fontWeight: cell.isAge ? 800 : 500,
                              color: cell.isAge ? ageHeatColor(age) : cell.isInherited ? 'var(--cp-blue)' : 'var(--fg-1)',
                              fontFamily: cell.isAge ? T.mono : T.inter,
                              cursor: cell.isInherited ? 'pointer' : 'default',
                            }}>
                              {cell.value}
                              {cell.isAge && (
                                <div style={{
                                  marginTop: 6, height: 4, borderRadius: 4, background: 'var(--divider)',
                                  overflow: 'hidden',
                                }}>
                                  <div style={{
                                    height: '100%', borderRadius: 4,
                                    width: `${Math.min(100, (age / 21) * 100)}%`,
                                    background: ageHeatColor(age),
                                    minWidth: age > 0 ? 2 : 0,
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
                {selectedItem.parentKey && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8, letterSpacing: '0.05em' }}>HIERARCHY</div>
                    {/* Parent node */}
                    <div style={{
                      padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, marginBottom: 0,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      {getJiraIconForType(selectedItem.type === 'Sub-task' ? 'Story' : 'Epic')}
                      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: 'var(--fg-2)' }}>{selectedItem.parentKey}</span>
                      <span style={{ fontSize: 12, color: 'var(--fg-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedItem.parentTitle || ''}
                      </span>
                    </div>
                    {/* Connector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 20, color: 'var(--fg-4)', fontSize: 12 }}>
                      <div style={{ width: 2, height: 12, background: 'var(--divider)' }} />
                    </div>
                    {/* Current node — blue border highlight */}
                    <div style={{
                      padding: '10px 12px', borderRadius: 8,
                      border: `1px solid ${T.accent}`, background: 'rgba(37,99,235,0.03)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      {getJiraIconForType(selectedItem.type)}
                      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: 'var(--cp-blue)' }}>{selectedItem.key}</span>
                      <span style={{ fontSize: 12, color: '#020617', fontWeight: 500 }}>Current</span>
                      <div style={{ marginLeft: 'auto' }}><StatusPill status={selectedItem.status} small /></div>
                    </div>
                  </div>
                )}

                {/* Siblings — only show when parent is a Story */}
                {(() => {
                  if (!selectedItem.parentKey) return null;
                  const pt = (selectedItem.parentType || '').toLowerCase();
                  if (!pt.includes('story')) return null;
                  const sibs = (siblingMap.get(selectedItem.parentKey) || []).filter(s => s.key !== selectedItem.key);
                  if (sibs.length === 0) return (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.05em', marginBottom: 8 }}>SIBLINGS</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>No sibling items</div>
                    </div>
                  );
                  const sibDoneCount = sibs.filter(s => s.status === 'done').length;
                  return (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.05em' }}>SIBLINGS</span>
                        <span style={{ fontFamily: T.mono, fontSize: 10, color: 'var(--fg-3)', marginLeft: 'auto' }}>{sibDoneCount}/{sibs.length} done</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 4, background: 'var(--divider)', overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ height: '100%', borderRadius: 4, width: `${(sibDoneCount / sibs.length) * 100}%`, background: 'var(--sem-success)' }} />
                      </div>
                      {sibs.slice(0, 6).map(s => {
                        return (
                          <div key={s.key} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                            borderRadius: 8, border: `1px solid ${T.borderLt}`, marginBottom: 4,
                            cursor: 'pointer', transition: 'background 80ms',
                          }}
                            onClick={() => selectCard(s.key)}
                            onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span style={{ flexShrink: 0 }}>{getJiraIconForType(s.type)}</span>
                            <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: 'var(--cp-blue)', width: 72, flexShrink: 0 }}>{s.key}</span>
                            <StatusPill status={s.status} small />
                            <span style={{ flex: 1, fontSize: 11, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                            <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: ageHeatColor(s.ageDays) }}>{s.ageDays}d</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RingViewV16;
