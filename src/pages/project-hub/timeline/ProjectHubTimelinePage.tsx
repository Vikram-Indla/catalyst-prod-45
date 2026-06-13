import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GanttChart, ChevronRight, ChevronDown, Calendar } from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';
import { useProjectHubTimeline, type TimelineIssue } from '@/hooks/useProjectHubTimeline';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import Avatar from '@atlaskit/avatar';

/* ─────────────────────────────── types ─────────────────────────────── */

type ZoomLevel = 'week' | 'month' | 'quarter';

interface FlatRow {
  issue: TimelineIssue;
  depth: number;
}

/* ─────────────────────────────── constants ──────────────────────────── */

const ROW_H = 40;
const SIDEBAR_W = 320;
const HEADER_H = 40;
const BAR_H = 22;
const MIN_BAR_W = 18;
const TODAY = new Date();

const ZOOM_PX_PER_DAY: Record<ZoomLevel, number> = {
  week: 28,
  month: 8,
  quarter: 3,
};

/* ─────────────────────────────── helpers ────────────────────────────── */

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─────────────────────────────── date range from data ───────────────── */

function computeDateRange(issues: TimelineIssue[]): { start: Date; end: Date } {
  let minMs = Infinity;
  let maxMs = -Infinity;

  function scan(list: TimelineIssue[]) {
    for (const i of list) {
      const s = parseDate(i.startDate);
      const e = parseDate(i.dueDate);
      if (s) { minMs = Math.min(minMs, s.getTime()); maxMs = Math.max(maxMs, s.getTime()); }
      if (e) { minMs = Math.min(minMs, e.getTime()); maxMs = Math.max(maxMs, e.getTime()); }
      if (i.children.length) scan(i.children);
    }
  }
  scan(issues);

  // FIX: fallback = today ±3 months so the today marker is always centred on screen
  const now = new Date();
  const fallbackStart = addDays(now, -90);
  const fallbackEnd = addDays(now, 90);

  const rangeStart = isFinite(minMs) ? new Date(minMs) : fallbackStart;
  const rangeEnd = isFinite(maxMs) ? new Date(maxMs) : fallbackEnd;

  return {
    start: addDays(rangeStart, -28),
    end: addDays(rangeEnd, 28),
  };
}

/* ─────────────────────────────── flatten tree ───────────────────────── */

function flattenTree(
  issues: TimelineIssue[],
  collapsed: Set<string>,
  depth = 0,
): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const issue of issues) {
    rows.push({ issue, depth });
    if (issue.children.length && !collapsed.has(issue.issueKey)) {
      rows.push(...flattenTree(issue.children, collapsed, depth + 1));
    }
  }
  return rows;
}

/* ─────────────────────────────── bar color ──────────────────────────── */

function barColor(issue: TimelineIssue): string {
  const cat = (issue.statusCategory ?? '').toLowerCase();
  if (cat.includes('done')) return 'var(--ds-background-success-bold, #1F845A)';
  if (cat.includes('progress')) return 'var(--ds-background-information-bold, #0055CC)';
  return 'var(--ds-background-neutral-bold, #626F86)';
}

/* ─────────────────────────────── header columns ────────────────────── */

interface HeaderCol {
  label: string;
  left: number;
  width: number;
}

function buildHeaderCols(
  start: Date,
  end: Date,
  zoom: ZoomLevel,
  pxPerDay: number,
): HeaderCol[] {
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
      const days = daysBetween(cur, next);
      cols.push({ label: `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`, left, width: days * pxPerDay });
      cur = next;
    }
  } else {
    let cur = startOfQuarter(start);
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      const q = Math.floor(cur.getMonth() / 3) + 1;
      const next = new Date(cur.getFullYear(), cur.getMonth() + 3, 1);
      const days = daysBetween(cur, next);
      cols.push({ label: `Q${q} ${cur.getFullYear()}`, left, width: days * pxPerDay });
      cur = next;
    }
  }

  return cols;
}

/* ─────────────────────────────── sub-header ────────────────────────── */

function buildSubHeaderCols(
  start: Date,
  end: Date,
  zoom: ZoomLevel,
  pxPerDay: number,
): HeaderCol[] {
  const cols: HeaderCol[] = [];

  if (zoom === 'week') {
    let cur = new Date(start);
    const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      cols.push({ label: DAYS[cur.getDay()], left, width: pxPerDay });
      cur = addDays(cur, 1);
    }
  } else if (zoom === 'month') {
    let cur = startOfWeek(start);
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      cols.push({ label: `${cur.getDate()}`, left, width: 7 * pxPerDay });
      cur = addDays(cur, 7);
    }
  } else {
    let cur = startOfMonth(start);
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const days = daysBetween(cur, next);
      cols.push({ label: MONTHS[cur.getMonth()], left, width: days * pxPerDay });
      cur = next;
    }
  }

  return cols;
}

/* ─────────────────────────────── grid lines ────────────────────────── */

function buildGridLines(
  start: Date,
  end: Date,
  zoom: ZoomLevel,
  pxPerDay: number,
): number[] {
  const lines: number[] = [];
  if (zoom === 'week') {
    let cur = startOfWeek(start);
    while (cur <= end) {
      lines.push(daysBetween(start, cur) * pxPerDay);
      cur = addDays(cur, 7);
    }
  } else if (zoom === 'month') {
    let cur = startOfMonth(start);
    while (cur <= end) {
      lines.push(daysBetween(start, cur) * pxPerDay);
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else {
    let cur = startOfQuarter(start);
    while (cur <= end) {
      lines.push(daysBetween(start, cur) * pxPerDay);
      cur = new Date(cur.getFullYear(), cur.getMonth() + 3, 1);
    }
  }
  return lines;
}

/* ─────────────────────────────── inline empty overlay ──────────────── */

// FIX: position:absolute inside the grid — never a full-page replacement
function InlineEmptyOverlay({ projectKey }: { projectKey: string }) {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      padding: 32,
      background: 'var(--ds-surface-overlay, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)',
      borderRadius: 8,
      boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.15))',
      zIndex: 20,
      minWidth: 280,
    }}>
      <GanttChart style={{ width: 40, height: 40, color: 'var(--ds-text-subtlest, #626F86)' }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          No issues with dates
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--ds-text-subtle, #42526E)' }}>
          Add start or due dates to issues in {projectKey} to see them on the timeline.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────── main component ────────────────────── */

export default function ProjectHubTimelinePage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const { data: tree = [], isLoading, error } = useProjectHubTimeline(projectKey);

  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // FIX: 3-ref scroll sync architecture
  const gridRef = useRef<HTMLDivElement>(null);
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const pxPerDay = ZOOM_PX_PER_DAY[zoom];

  const dateRange = useMemo(() => computeDateRange(tree), [tree]);
  const totalDays = daysBetween(dateRange.start, dateRange.end);
  const gridWidth = Math.max(totalDays * pxPerDay, 800);

  const rows = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);
  const todayLeft = daysBetween(dateRange.start, TODAY) * pxPerDay;

  const headerCols = useMemo(
    () => buildHeaderCols(dateRange.start, dateRange.end, zoom, pxPerDay),
    [dateRange, zoom, pxPerDay],
  );
  const subHeaderCols = useMemo(
    () => buildSubHeaderCols(dateRange.start, dateRange.end, zoom, pxPerDay),
    [dateRange, zoom, pxPerDay],
  );
  const gridLines = useMemo(
    () => buildGridLines(dateRange.start, dateRange.end, zoom, pxPerDay),
    [dateRange, zoom, pxPerDay],
  );

  const hasAnyDates = useMemo(() => {
    function check(list: TimelineIssue[]): boolean {
      for (const i of list) {
        if (i.startDate || i.dueDate) return true;
        if (i.children.length && check(i.children)) return true;
      }
      return false;
    }
    return check(tree);
  }, [tree]);

  // FIX: scroll sync — grid drives both header (horizontal) and sidebar (vertical)
  const handleGridScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    const grid = gridRef.current;
    if (!grid) return;
    isSyncingScroll.current = true;
    requestAnimationFrame(() => {
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = grid.scrollLeft;
      if (sidebarBodyRef.current) sidebarBodyRef.current.scrollTop = grid.scrollTop;
      isSyncingScroll.current = false;
    });
  }, []);

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
    const grid = gridRef.current;
    const sidebar = sidebarBodyRef.current;
    if (grid) grid.addEventListener('scroll', handleGridScroll, { passive: true });
    if (sidebar) sidebar.addEventListener('scroll', handleSidebarScroll, { passive: true });
    return () => {
      if (grid) grid.removeEventListener('scroll', handleGridScroll);
      if (sidebar) sidebar.removeEventListener('scroll', handleSidebarScroll);
    };
  }, [handleGridScroll, handleSidebarScroll]);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const scrollToToday = useCallback(() => {
    if (!gridRef.current) return;
    gridRef.current.scrollLeft = todayLeft - gridRef.current.clientWidth / 2;
  }, [todayLeft]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--ds-text-danger, #AE2A19)', fontSize: 14 }}>
          Failed to load timeline data.
        </p>
      </div>
    );
  }

  // FIX: NEVER early-return for !hasAnyDates — timeline skeleton always renders
  const contentHeight = Math.max(rows.length * ROW_H, 240);
  const doubleHeaderH = HEADER_H * 2;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--ds-surface, #FFFFFF)',
      overflow: 'hidden',
    }}>
      {/* ── toolbar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GanttChart style={{ width: 16, height: 16, color: 'var(--ds-text-subtle, #42526E)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
            Timeline
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* FIX: @atlaskit/button for zoom — not bare <button> */}
          <div style={{
            display: 'flex',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            {(['week', 'month', 'quarter'] as ZoomLevel[]).map((level, i, arr) => (
              <Button
                key={level}
                appearance={zoom === level ? 'primary' : 'subtle'}
                isSelected={zoom === level}
                onClick={() => setZoom(level)}
                style={{
                  borderRadius: 0,
                  borderRight: i < arr.length - 1 ? '1px solid var(--ds-border, #DFE1E6)' : 'none',
                }}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Button>
            ))}
          </div>
          {/* FIX: @atlaskit/Tooltip + @atlaskit/button for today */}
          <Tooltip content="Scroll to today" position="bottom">
            <Button
              appearance="default"
              onClick={scrollToToday}
              iconBefore={<Calendar style={{ width: 12, height: 12 }} />}
            >
              Today
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── body: sidebar + grid ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── sidebar panel ── */}
        <div style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '2px solid var(--ds-border, #DFE1E6)',
          overflow: 'hidden',
        }}>
          {/* sidebar header — static, must match doubleHeaderH of grid header */}
          <div style={{
            height: doubleHeaderH,
            flexShrink: 0,
            borderBottom: '1px solid var(--ds-border, #DFE1E6)',
            background: 'var(--ds-surface-sunken, #F7F8F9)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '0 8px 8px',
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ds-text-subtlest, #626F86)',
              letterSpacing: '0.04em',
            }}>
              Issue
            </span>
          </div>
          {/* FIX: sidebar body ref — synced vertically with grid */}
          <div
            ref={sidebarBodyRef}
            style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
          >
            {rows.map(({ issue, depth }) => (
              <SidebarRow
                key={issue.issueKey}
                issue={issue}
                depth={depth}
                collapsed={collapsed.has(issue.issueKey)}
                onToggle={toggleCollapse}
              />
            ))}
          </div>
        </div>

        {/* ── grid panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* FIX: header in its own div — overflow:hidden, synced horizontally by JS */}
          <div
            ref={headerScrollRef}
            style={{
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--ds-surface-sunken, #F7F8F9)',
              borderBottom: '1px solid var(--ds-border, #DFE1E6)',
            }}
          >
            <div style={{ width: gridWidth }}>
              {/* main header row */}
              <div style={{
                height: HEADER_H,
                position: 'relative',
                borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)',
              }}>
                {headerCols.map((col, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: col.left,
                    width: col.width,
                    height: HEADER_H,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 8,
                    borderRight: '1px solid var(--ds-border-subtle, #EBECF0)',
                    overflow: 'hidden',
                  }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--ds-text-subtlest, #626F86)',
                      whiteSpace: 'nowrap',
                    }}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* sub-header row */}
              <div style={{ height: HEADER_H, position: 'relative' }}>
                {subHeaderCols.map((col, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: col.left,
                    width: col.width,
                    height: HEADER_H,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 4,
                    borderRight: '1px solid var(--ds-border-subtle, #EBECF0)',
                    overflow: 'hidden',
                  }}>
                    <span style={{
                      fontSize: 10,
                      color: 'var(--ds-text-subtlest, #626F86)',
                      whiteSpace: 'nowrap',
                    }}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FIX: grid body — separate scrollable div, source of truth for scroll position */}
          <div
            ref={gridRef}
            style={{ flex: 1, overflow: 'auto', position: 'relative' }}
          >
            <div style={{ width: gridWidth, height: contentHeight, position: 'relative' }}>

              {/* vertical grid lines */}
              {gridLines.map((x, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: x,
                  width: 1,
                  background: 'var(--ds-border-subtle, #EBECF0)',
                  pointerEvents: 'none',
                }} />
              ))}

              {/* today marker */}
              {todayLeft >= 0 && todayLeft <= gridWidth && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: todayLeft,
                  width: 2,
                  background: 'var(--ds-text-danger, #AE2A19)',
                  zIndex: 5,
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: -2,
                    left: -4,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'var(--ds-text-danger, #AE2A19)',
                  }} />
                </div>
              )}

              {/* row backgrounds */}
              {rows.map(({ issue }, idx) => (
                <div key={issue.issueKey + '_bg'} style={{
                  position: 'absolute',
                  top: idx * ROW_H,
                  left: 0,
                  right: 0,
                  height: ROW_H,
                  background: idx % 2 !== 0
                    ? 'var(--ds-background-neutral-subtle, #F7F8F9)'
                    : 'transparent',
                }} />
              ))}

              {/* FIX: bars wrapped in @atlaskit/Tooltip — no native title= attribute */}
              {rows.map(({ issue }, idx) => {
                const start = parseDate(issue.startDate);
                const end = parseDate(issue.dueDate);
                if (!start && !end) return null;

                const effectiveStart = start ?? end!;
                const effectiveEnd = end ?? start!;

                const left = daysBetween(dateRange.start, effectiveStart) * pxPerDay;
                const width = Math.max(
                  daysBetween(effectiveStart, effectiveEnd) * pxPerDay + pxPerDay,
                  MIN_BAR_W,
                );
                const barTop = idx * ROW_H + (ROW_H - BAR_H) / 2;

                const tooltipContent = (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {issue.issueKey}: {issue.summary}
                    </div>
                    <div style={{ opacity: 0.85 }}>
                      {issue.startDate ?? '–'} → {issue.dueDate ?? '–'}
                    </div>
                    {issue.assigneeDisplayName && (
                      <div style={{ opacity: 0.85 }}>{issue.assigneeDisplayName}</div>
                    )}
                  </div>
                );

                return (
                  <Tooltip key={issue.issueKey} content={tooltipContent} position="top">
                    <div
                      style={{
                        position: 'absolute',
                        top: barTop,
                        left,
                        width,
                        height: BAR_H,
                        borderRadius: 4,
                        background: barColor(issue),
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 8,
                        paddingRight: 8,
                        overflow: 'hidden',
                        cursor: 'default',
                        zIndex: 2,
                        boxShadow: 'var(--ds-shadow-raised, 0 1px 2px rgba(9,30,66,0.15))',
                      }}
                    >
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: 'var(--ds-text-inverse, #FFFFFF)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1,
                      }}>
                        {issue.summary}
                      </span>
                    </div>
                  </Tooltip>
                );
              })}

              {/* FIX: inline overlay — never a full-page replacement */}
              {!hasAnyDates && <InlineEmptyOverlay projectKey={projectKey ?? ''} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── sidebar row ────────────────────────── */

interface SidebarRowProps {
  issue: TimelineIssue;
  depth: number;
  collapsed: boolean;
  onToggle: (key: string) => void;
}

// FIX: enhanced sidebar row — 2-line text + CatalystStatusPill + Avatar
function SidebarRow({ issue, depth, collapsed, onToggle }: SidebarRowProps) {
  const hasChildren = issue.children.length > 0;

  return (
    <div
      style={{
        height: ROW_H,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 8 + depth * 16,
        paddingRight: 8,
        gap: 4,
        borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)',
        overflow: 'hidden',
        cursor: hasChildren ? 'pointer' : 'default',
      }}
      onClick={hasChildren ? () => onToggle(issue.issueKey) : undefined}
    >
      {/* collapse toggle */}
      <div style={{
        width: 16,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {hasChildren && (
          collapsed
            ? <ChevronRight style={{ width: 12, height: 12, color: 'var(--ds-text-subtlest, #626F86)' }} />
            : <ChevronDown style={{ width: 12, height: 12, color: 'var(--ds-text-subtlest, #626F86)' }} />
        )}
      </div>

      {/* type icon */}
      <div style={{ flexShrink: 0 }}>
        <JiraIssueTypeIcon type={issue.issueType} size={14} />
      </div>

      {/* FIX: two-line text block — summary (primary) + key as link (secondary) */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--ds-text, #172B4D)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>
          {issue.summary}
        </span>
        <span
          role="link"
          tabIndex={0}
          onClick={e => {
            e.stopPropagation();
            window.open(`/project-hub/${issue.projectKey}/backlog?issue=${issue.issueKey}`, '_blank');
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              window.open(`/project-hub/${issue.projectKey}/backlog?issue=${issue.issueKey}`, '_blank');
            }
          }}
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: 'var(--ds-link, #0052CC)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
            cursor: 'pointer',
          }}
        >
          {issue.issueKey}
        </span>
      </div>

      {/* FIX: status pill — CatalystStatusPill, not bare span */}
      {issue.status && (
        <div
          style={{ flexShrink: 0, maxWidth: 72, overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          <CatalystStatusPill
            status={issue.status}
            statusCategory={issue.statusCategory}
          />
        </div>
      )}

      {/* FIX: Avatar with initials — no src (assignee_display_name only in DB, no avatarUrl) */}
      {issue.assigneeDisplayName && (
        <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <Avatar
            name={issue.assigneeDisplayName}
            size="xsmall"
          />
        </div>
      )}
    </div>
  );
}
