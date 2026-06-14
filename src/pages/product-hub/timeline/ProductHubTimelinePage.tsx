/**
 * ProductHubTimelinePage — /product-hub/:key/timeline
 *
 * Renders a timeline view for business requests in a product.
 * Mirrors ProjectHubTimelinePage structure and interactions, but:
 *   - Data source: business_requests (filtered by product_id)
 *   - Flat structure: no parent-child hierarchy (all items are top-level)
 *   - Date field: end_date only (no start date in business_requests schema)
 *   - Types: request_type (feature/gap/integration/data_request)
 *
 * All other features (zoom, filters, date editing, side panel detail) are
 * inherited from the project hub timeline pattern.
 */

import React, { useState, useMemo, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { AtlaskitPageShell } from '@/components/ads';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import SearchIcon from '@atlaskit/icon/glyph/search';
import { GanttChart, Calendar } from '@/lib/atlaskit-icons';
import { useProductHubTimeline, type TimelineBusinessRequest } from '@/hooks/useProductHubTimeline';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import Avatar from '@atlaskit/avatar';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import AkCalendar from '@atlaskit/calendar';
import Checkbox from '@atlaskit/checkbox';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatusPill } from '@/components/shared/JiraTable/cells';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

/* ─────────────────────────────── types ─────────────────────────────── */

type ZoomLevel = 'week' | 'month' | 'quarter';
type OpenDropdown = 'more' | null;

interface FlatRow {
  item: TimelineBusinessRequest;
}

/* ─────────────────────────────── constants ──────────────────────────── */

const ROW_H = 40;
const DEFAULT_SIDEBAR_W = 384;
const MIN_SIDEBAR_W = 160;
const MAX_SIDEBAR_W = 560;
const HEADER_H = 40;
const BAR_H = 24;
const BAR_RADIUS = 3;
const MIN_BAR_W = 18;
const TODAY = new Date();

const ZOOM_PX_PER_DAY: Record<ZoomLevel, number> = { week: 28, month: 8, quarter: 3 };

const STATUS_CAT_OPTIONS = [
  { value: 'planning', label: 'Planning', color: 'var(--ds-chart-categorical-1, #8590A2)' },
  { value: 'in_progress', label: 'In Progress', color: 'var(--ds-chart-information-bold, #8FB8F6)' },
  { value: 'done', label: 'Done', color: 'var(--ds-chart-success-bold, #94C748)' },
];

const REQUEST_TYPES = [
  'Feature', 'Gap', 'Integration', 'Data Request',
];

function requestTypeToIconType(requestType: string | null): string | null {
  if (!requestType) return null;
  // Map request_type to JiraIssueTypeIcon type prop
  const typeMap: Record<string, string> = {
    'Feature': 'Feature',
    'Gap': 'Business Gap',
    'Integration': 'Integration',
    'Data Request': 'Business Request',
  };
  return typeMap[requestType] ?? null;
}

/* ─────────────────────────────── date helpers ───────────────────────── */

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─────────────────────────────── date range ────────────────────────── */

function computeDateRange(items: TimelineBusinessRequest[]): { start: Date; end: Date } {
  let minMs = Infinity, maxMs = -Infinity;
  for (const item of items) {
    const e = parseDate(item.endDate);
    if (e) { minMs = Math.min(minMs, e.getTime()); maxMs = Math.max(maxMs, e.getTime()); }
  }
  const now = new Date();
  const rangeStart = isFinite(minMs) ? new Date(minMs) : addDays(now, -90);
  const rangeEnd = isFinite(maxMs) ? new Date(maxMs) : addDays(now, 90);
  return { start: addDays(rangeStart, -28), end: addDays(rangeEnd, 28) };
}

/* ─────────────────────────────── header/grid builders ───────────────── */

interface HeaderCol { label: string; left: number; width: number; }

function buildHeaderCols(start: Date, end: Date, zoom: ZoomLevel, pxPerDay: number): HeaderCol[] {
  const cols: HeaderCol[] = [];
  if (zoom === 'week') {
    let cur = startOfWeek(start);
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      cols.push({ label: `${MONTHS[cur.getMonth()]} ${cur.getDate()}`, left, width: 7 * pxPerDay });
      cur = addDays(cur, 7);
    }
  } else if (zoom === 'month') {
    let cur = startOfMonth(start);
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      cols.push({ label: `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`, left, width: daysBetween(cur, next) * pxPerDay });
      cur = next;
    }
  } else {
    let cur = startOfQuarter(start);
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      const q = Math.floor(cur.getMonth() / 3) + 1;
      const next = new Date(cur.getFullYear(), cur.getMonth() + 3, 1);
      cols.push({ label: `Q${q} ${cur.getFullYear()}`, left, width: daysBetween(cur, next) * pxPerDay });
      cur = next;
    }
  }
  return cols;
}

function buildSubHeaderCols(start: Date, end: Date, zoom: ZoomLevel, pxPerDay: number): HeaderCol[] {
  const cols: HeaderCol[] = [];
  if (zoom === 'week') {
    const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    let cur = new Date(start);
    while (cur <= end) {
      cols.push({ label: DAYS[cur.getDay()], left: daysBetween(start, cur) * pxPerDay, width: pxPerDay });
      cur = addDays(cur, 1);
    }
  } else if (zoom === 'month') {
    let cur = startOfWeek(start);
    while (cur <= end) {
      cols.push({ label: `${cur.getDate()}`, left: daysBetween(start, cur) * pxPerDay, width: 7 * pxPerDay });
      cur = addDays(cur, 7);
    }
  } else {
    let cur = startOfMonth(start);
    while (cur <= end) {
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      cols.push({ label: MONTHS[cur.getMonth()], left: daysBetween(start, cur) * pxPerDay, width: daysBetween(cur, next) * pxPerDay });
      cur = next;
    }
  }
  return cols;
}

function buildGridLines(start: Date, end: Date, zoom: ZoomLevel, pxPerDay: number): number[] {
  const lines: number[] = [];
  if (zoom === 'quarter') {
    let cur = startOfQuarter(start);
    while (cur <= end) { lines.push(daysBetween(start, cur) * pxPerDay); cur = new Date(cur.getFullYear(), cur.getMonth() + 3, 1); }
  } else {
    let cur = startOfMonth(start);
    while (cur <= end) { lines.push(daysBetween(start, cur) * pxPerDay); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
  }
  return lines;
}

/* ─────────────────────────────── portal menu ──────────────────────────── */

interface PortalMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  minWidth?: number;
  children: React.ReactNode;
}

function PortalMenu({ isOpen, onClose, triggerRef, minWidth = 200, children }: PortalMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [isOpen, onClose, triggerRef]);
  if (!isOpen || !triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: '0 8px 28px var(--ds-shadow-overlay, rgba(9,30,66,0.25))',
        padding: '4px 0',
        minWidth,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function MenuItemRow({
  label, onClick, disabled = false, danger = false,
}: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <div
      role="menuitem"
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 14,
        color: danger ? 'var(--ds-text-danger, #AE2A19)' : disabled ? 'var(--ds-text-disabled, #A5ADBA)' : 'var(--ds-text, #172B4D)',
        fontFamily: 'var(--ds-font-family-body)',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </div>
  );
}

/* ─────────────────────────────── empty state ───────────────────────── */

function EmptyTimelineState({ productKey }: { productKey: string }) {
  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32,
      background: 'var(--ds-surface-overlay, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8,
      boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.15))',
      zIndex: 20, minWidth: 280,
    }}>
      <GanttChart style={{ width: 40, height: 40, color: 'var(--ds-text-subtlest, #626F86)' }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          No requests with target dates
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--ds-text-subtle, #42526E)' }}>
          Add target dates to requests to see them on the timeline.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────── main component ────────────────────── */

export default function ProductHubTimelinePage() {
  const { key: productKey } = useParams<{ key: string }>();
  const queryClient = useQueryClient();

  // Resolve product ID from product key
  const [productId, setProductId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!productKey) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('products')
        .select('id')
        .eq('code', productKey.toUpperCase())
        .maybeSingle();
      setProductId(data?.id);
    })();
  }, [productKey]);

  const { data: items = [], isLoading, error } = useProductHubTimeline(productId);

  /* detail side panel */
  const navigate = useNavigate();
  const [panelItem, setPanelItem] = useState<{ id: string; itemType: string; displayType: string } | null>(null);
  const closePanel = useCallback(() => setPanelItem(null), []);
  const openDetail = useCallback((item: TimelineBusinessRequest) => {
    setPanelItem({ id: item.requestKey, itemType: 'business_request', displayType: item.requestType ?? 'Feature' });
  }, []);

  /* date edit modal */
  const [dateEditItem, setDateEditItem] = useState<TimelineBusinessRequest | null>(null);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const closeDateModal = useCallback(() => { setDateEditItem(null); setEditDate(null); }, []);
  const openDateModal = useCallback((item: TimelineBusinessRequest) => {
    setDateEditItem(item);
    setEditDate(item.endDate ? parseDate(item.endDate) : null);
  }, []);
  const saveDateEdit = useCallback(async () => {
    if (!dateEditItem || !editDate) return;
    try {
      const isoDate = editDate.toISOString().split('T')[0];
      await (supabase as any)
        .from('business_requests')
        .update({ end_date: isoDate })
        .eq('id', dateEditItem.id);
      queryClient.invalidateQueries({ queryKey: ['product-hub-timeline', productId] });
      closeDateModal();
    } catch (e) {
      console.error('Date edit failed:', e);
    }
  }, [dateEditItem, editDate, productId, queryClient, closeDateModal]);

  /* responsive container */
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const isNarrow = containerWidth > 0 && containerWidth < 640;

  /* sidebar drag-resize */
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_SIDEBAR_W);
  const sidebarPanelRef = useRef<HTMLDivElement>(null);
  const [sidebarResizing, setSidebarResizing] = useState<{ originX: number; originWidth: number } | null>(null);

  useEffect(() => {
    if (!sidebarResizing) return;
    const clamp = (w: number) => Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, w));
    const onMove = (e: MouseEvent) => {
      const next = clamp(sidebarResizing.originWidth + e.clientX - sidebarResizing.originX);
      if (sidebarPanelRef.current) sidebarPanelRef.current.style.width = next + 'px';
    };
    const onUp = (e: MouseEvent) => {
      const final = clamp(sidebarResizing.originWidth + e.clientX - sidebarResizing.originX);
      setSidebarWidth(final);
      setSidebarResizing(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [sidebarResizing]);

  /* zoom */
  const [zoom, setZoom] = useState<ZoomLevel>('month');

  /* filters */
  const [searchQuery, setSearchQuery] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const pxPerDay = ZOOM_PX_PER_DAY[zoom];
  const dateRange = useMemo(() => computeDateRange(items), [items]);
  const totalDays = daysBetween(dateRange.start, dateRange.end);
  const gridWidth = Math.max(totalDays * pxPerDay, 800);
  const todayLeft = daysBetween(dateRange.start, TODAY) * pxPerDay;

  const todayLineRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  /* filtered rows */
  const rows = useMemo(() => {
    let result = items;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(q) || item.requestKey.toLowerCase().includes(q)
      );
    }
    if (requestTypeFilter.length > 0) {
      result = result.filter(item => requestTypeFilter.includes(item.requestType ?? ''));
    }
    return result;
  }, [items, searchQuery, requestTypeFilter]);

  const headerCols = useMemo(() => buildHeaderCols(dateRange.start, dateRange.end, zoom, pxPerDay), [dateRange, zoom, pxPerDay]);
  const subHeaderCols = useMemo(() => buildSubHeaderCols(dateRange.start, dateRange.end, zoom, pxPerDay), [dateRange, zoom, pxPerDay]);
  const gridLines = useMemo(() => buildGridLines(dateRange.start, dateRange.end, zoom, pxPerDay), [dateRange, zoom, pxPerDay]);

  const hasAnyDates = useMemo(() => items.some(i => i.endDate), [items]);

  const visibleRowCount = rows.length;
  const contentHeight = Math.max(visibleRowCount * ROW_H, 240);
  const doubleHeaderH = HEADER_H * 2;

  /* scroll sync */
  const handleGridScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    const grid = gridRef.current;
    if (!grid) return;
    isSyncingScroll.current = true;
    requestAnimationFrame(() => {
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = grid.scrollLeft;
      if (sidebarBodyRef.current) sidebarBodyRef.current.scrollTop = grid.scrollTop;
      if (todayLineRef.current) {
        const x = todayLeft - grid.scrollLeft;
        todayLineRef.current.style.left = x + 'px';
        todayLineRef.current.style.display = (x >= 0 && x <= grid.clientWidth) ? 'block' : 'none';
      }
      isSyncingScroll.current = false;
    });
  }, [todayLeft]);

  const handleSidebarScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    const sidebar = sidebarBodyRef.current;
    if (!sidebar) return;
    isSyncingScroll.current = true;
    requestAnimationFrame(() => {
      if (gridRef.current) gridRef.current.scrollTop = sidebar.scrollTop;
      isSyncingScroll.current = false;
    });
  }, []);

  useEffect(() => {
    const grid = gridRef.current, sidebar = sidebarBodyRef.current;
    if (grid) grid.addEventListener('scroll', handleGridScroll, { passive: true });
    if (sidebar) sidebar.addEventListener('scroll', handleSidebarScroll, { passive: true });
    return () => {
      if (grid) grid.removeEventListener('scroll', handleGridScroll);
      if (sidebar) sidebar.removeEventListener('scroll', handleSidebarScroll);
    };
  }, [handleGridScroll, handleSidebarScroll]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <p style={{ color: 'var(--ds-text-danger, #AE2A19)', fontSize: 14 }}>Failed to load timeline data.</p>
      </div>
    );
  }

  const barColor = (item: TimelineBusinessRequest): string => {
    const step = (item.processStep ?? '').toLowerCase();
    if (step.includes('done')) return 'var(--ds-background-success-bold, #1F845A)';
    if (step.includes('progress')) return 'var(--ds-background-information-bold, #0055CC)';
    return 'var(--ds-background-neutral-bold, #626F86)';
  };

  return (
    <AtlaskitPageShell flush chromeBand={<ProjectPageHeader projectKey={productKey} hubType="product" />}>
      <div
        ref={containerRef}
        role="application"
        aria-label="Product timeline"
        style={{
          display: 'flex', flexDirection: 'column',
          height: 'calc(100vh - 124px)',
          background: 'var(--ds-surface, #FFFFFF)', overflow: 'hidden',
          border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 3,
        }}
      >
        {/* toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', flexShrink: 0, gap: 8,
        }}>
          <div style={{ position: 'relative', width: 180, flexShrink: 0 }}>
            <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', lineHeight: 0, pointerEvents: 'none', color: 'var(--ds-text-subtlest, #626F86)' }}>
              <SearchIcon label="" size="small" />
            </div>
            <input
              type="text"
              placeholder="Search timeline"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', height: 32, padding: '0 8px 0 32px', boxSizing: 'border-box',
                border: '1px solid var(--ds-border-input, #DFE1E6)', borderRadius: 3,
                fontSize: 14, color: 'var(--ds-text, #172B4D)',
                background: 'var(--ds-background-input, #FFFFFF)',
                fontFamily: 'var(--ds-font-family-body)',
              }}
            />
          </div>
          <Button appearance="subtle" onClick={() => setFilterModalOpen(true)}>Filters</Button>
        </div>

        {/* main content */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* sidebar */}
          <div
            ref={sidebarPanelRef}
            style={{
              width: sidebarWidth, flexShrink: 0, borderRight: '1px solid var(--ds-border, #DFE1E6)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              height: doubleHeaderH, padding: '0 8px', borderBottom: '1px solid var(--ds-border, #DFE1E6)',
              background: 'var(--ds-surface-sunken, #F7F8F9)',
              fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)',
            }}>
              <span>Request</span>
              <div
                onMouseDown={e => setSidebarResizing({ originX: e.clientX, originWidth: sidebarWidth })}
                style={{ position: 'absolute', right: 0, top: 0, width: 1, height: '100%', cursor: 'col-resize' }}
              />
            </div>
            <div
              ref={sidebarBodyRef}
              style={{
                flex: 1, overflow: 'auto', fontSize: 13,
              }}
            >
              {rows.map((item, i) => {
                const iconType = requestTypeToIconType(item.requestType);
                return (
                  <div
                    key={item.id}
                    onClick={() => openDetail(item)}
                    style={{
                      height: ROW_H, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6,
                      borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                      cursor: 'pointer',
                      background: i % 2 === 0 ? 'var(--ds-surface, #FFFFFF)' : 'var(--ds-surface-sunken, #F7F8F9)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'var(--ds-surface, #FFFFFF)' : 'var(--ds-surface-sunken, #F7F8F9)'; }}
                  >
                    {iconType && <JiraIssueTypeIcon type={iconType} size={14} />}
                    {item.deliveryManagerAvatarUrl && (
                      <Avatar size="xsmall" src={item.deliveryManagerAvatarUrl} name={item.deliveryManagerName ?? ''} />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ds-text, #172B4D)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {item.requestKey}
                        {item.processStep && <StatusPill status={item.processStep} />}
                      </div>
                      <div style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ds-text-subtle, #44546F)' }}>
                        {item.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* grid */}
          <div
            ref={gridRef}
            style={{
              flex: 1, overflow: 'auto', position: 'relative',
            }}
          >
            {/* header */}
            <div
              ref={headerScrollRef}
              style={{
                position: 'sticky', top: 0, zIndex: 10,
                height: doubleHeaderH, overflow: 'hidden',
                background: 'var(--ds-surface-sunken, #F7F8F9)',
                borderBottom: '1px solid var(--ds-border, #DFE1E6)',
              }}
            >
              <div style={{ width: gridWidth, height: '100%', position: 'relative' }}>
                {/* main header */}
                <div style={{ height: HEADER_H, display: 'flex', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                  {headerCols.map((col, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute', left: col.left, width: col.width, height: HEADER_H,
                        display: 'flex', alignItems: 'center', padding: '0 4px',
                        fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)',
                        borderRight: '1px solid var(--ds-border, #DFE1E6)',
                      }}
                    >
                      {col.label}
                    </div>
                  ))}
                </div>

                {/* sub-header */}
                <div style={{ height: HEADER_H, display: 'flex' }}>
                  {subHeaderCols.map((col, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute', left: col.left, width: col.width, height: HEADER_H,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)',
                        borderRight: '1px solid var(--ds-border, #DFE1E6)',
                      }}
                    >
                      {col.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* content */}
            <div style={{ position: 'relative', height: contentHeight, width: gridWidth }}>
              {/* grid lines */}
              {gridLines.map((left, i) => (
                <div key={i} style={{ position: 'absolute', left, top: 0, width: 1, height: contentHeight, background: 'var(--ds-border, #DFE1E6)' }} />
              ))}

              {/* today line */}
              <div
                ref={todayLineRef}
                style={{
                  position: 'absolute', top: 0, left: todayLeft, width: 2, height: contentHeight,
                  background: 'var(--ds-text-danger, #AE2A19)', zIndex: 5,
                }}
              />

              {/* rows */}
              {rows.map((item, i) => {
                const endDate = parseDate(item.endDate);
                const endLeft = endDate ? daysBetween(dateRange.start, endDate) * pxPerDay : null;
                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute', top: i * ROW_H, left: 0, width: '100%', height: ROW_H,
                      display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                      background: i % 2 === 0 ? 'var(--ds-surface, #FFFFFF)' : 'var(--ds-surface-sunken, #F7F8F9)',
                    }}
                  >
                    {endDate && endLeft !== null && (
                      <div
                        onClick={e => { e.stopPropagation(); openDateModal(item); }}
                        style={{
                          position: 'absolute', left: endLeft, top: (ROW_H - BAR_H) / 2, width: Math.max(MIN_BAR_W, 40), height: BAR_H,
                          background: barColor(item),
                          borderRadius: BAR_RADIUS,
                          cursor: 'pointer',
                        }}
                        title="Click to edit end date"
                      />
                    )}
                  </div>
                );
              })}

              {!hasAnyDates && <EmptyTimelineState productKey={productKey ?? ''} />}
            </div>
          </div>
        </div>

        {/* footer with zoom controls */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '8px 12px', borderTop: '1px solid var(--ds-border, #DFE1E6)', flexShrink: 0, gap: 6, background: 'var(--ds-surface-sunken, #F7F8F9)',
        }}>
          <Button appearance="subtle" onClick={() => setZoom('week')}>Week</Button>
          <Button appearance={zoom === 'month' ? 'primary' : 'subtle'} onClick={() => setZoom('month')}>Month</Button>
          <Button appearance="subtle" onClick={() => setZoom('quarter')}>Quarter</Button>
        </div>
      </div>

      {/* filter modal */}
      <ModalTransition>
        {filterModalOpen && (
          <Modal onClose={() => setFilterModalOpen(false)}>
            <ModalHeader>
              <ModalTitle>Filter requests</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ padding: '16px 0' }}>
                <label style={{ display: 'block', marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>Request type</label>
                {REQUEST_TYPES.map(type => (
                  <div key={type} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Checkbox
                      isChecked={requestTypeFilter.includes(type)}
                      onChange={() => {
                        setRequestTypeFilter(prev =>
                          prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                        );
                      }}
                      label={type}
                    />
                  </div>
                ))}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setFilterModalOpen(false)}>Done</Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* date edit modal */}
      <ModalTransition>
        {dateEditItem && (
          <Modal onClose={closeDateModal}>
            <ModalHeader>
              <ModalTitle>Edit end date — {dateEditItem.requestKey}</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ padding: '16px 0' }}>
                <AkCalendar onChange={(v: any) => setEditDate(v)} defaultValue={editDate ?? undefined} />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={closeDateModal}>Cancel</Button>
              <Button appearance="primary" onClick={saveDateEdit}>Save</Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* side panel detail */}
      {panelItem && (
        <Suspense fallback={<Spinner />}>
          <CatalystDetailRouter
            itemId={panelItem.id}
            itemType={panelItem.itemType}
            displayType={panelItem.displayType}
            onClose={closePanel}
          />
        </Suspense>
      )}
    </AtlaskitPageShell>
  );
}
