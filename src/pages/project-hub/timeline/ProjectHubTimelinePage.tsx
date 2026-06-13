import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { GanttChart, ChevronRight, ChevronDown, Calendar } from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';
import { useProjectHubTimeline, type TimelineIssue } from '@/hooks/useProjectHubTimeline';
import Spinner from '@atlaskit/spinner';

/* ─────────────────────────────── types ─────────────────────────────── */

type ZoomLevel = 'week' | 'month' | 'quarter';

interface FlatRow {
  issue: TimelineIssue;
  depth: number;
}

/* ─────────────────────────────── constants ──────────────────────────── */

const ROW_H = 40;
const SIDEBAR_W = 280;
const HEADER_H = 48;
const MIN_BAR_W = 16;
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

  const fallbackStart = new Date(TODAY.getFullYear(), 0, 1);
  const fallbackEnd = new Date(TODAY.getFullYear(), 11, 31);

  const rangeStart = isFinite(minMs) ? new Date(minMs) : fallbackStart;
  const rangeEnd = isFinite(maxMs) ? new Date(maxMs) : fallbackEnd;

  // pad 4 weeks on each side
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
  const totalDays = daysBetween(start, end);

  if (zoom === 'week') {
    let cur = startOfWeek(start);
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      const label = `${MONTHS[cur.getMonth()]} ${cur.getDate()}`;
      cols.push({ label, left, width: 7 * pxPerDay });
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

/* ─────────────────────────────── sub-header (day/week ticks) ───────── */

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
    // month ticks inside quarters
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

/* ─────────────────────────────── empty state ───────────────────────── */

function EmptyState({ projectKey }: { projectKey: string }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 48,
    }}>
      <GanttChart style={{ width: 48, height: 48, color: 'var(--ds-text-subtlest, #626F86)' }} />
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
  const gridRef = useRef<HTMLDivElement>(null);

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

  if (!hasAnyDates) {
    return <EmptyState projectKey={projectKey ?? ''} />;
  }

  const contentHeight = rows.length * ROW_H;

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
          {/* zoom controls */}
          <div style={{
            display: 'flex',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            {(['week', 'month', 'quarter'] as ZoomLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setZoom(level)}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  borderRight: level !== 'quarter' ? '1px solid var(--ds-border, #DFE1E6)' : 'none',
                  background: zoom === level
                    ? 'var(--ds-background-selected, #E9F2FE)'
                    : 'var(--ds-surface, #FFFFFF)',
                  color: zoom === level
                    ? 'var(--ds-link, #0052CC)'
                    : 'var(--ds-text-subtle, #42526E)',
                }}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          {/* today button */}
          <button
            onClick={scrollToToday}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 3,
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text-subtle, #42526E)',
            }}
          >
            <Calendar style={{ width: 12, height: 12 }} />
            Today
          </button>
        </div>
      </div>

      {/* ── body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* sidebar */}
        <div style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--ds-border, #DFE1E6)',
          overflow: 'hidden',
        }}>
          {/* sidebar header */}
          <div style={{
            height: HEADER_H * 2,
            flexShrink: 0,
            borderBottom: '1px solid var(--ds-border, #DFE1E6)',
            background: 'var(--ds-surface-sunken, #F7F8F9)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #626F86)', letterSpacing: '0.04em' }}>
              Issue
            </span>
          </div>
          {/* sidebar rows */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
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

        {/* grid */}
        <div
          ref={gridRef}
          style={{ flex: 1, overflow: 'auto', position: 'relative' }}
        >
          <div style={{ width: gridWidth, minHeight: '100%' }}>
            {/* header */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'var(--ds-surface-sunken, #F7F8F9)',
              borderBottom: '1px solid var(--ds-border, #DFE1E6)',
            }}>
              {/* main header row */}
              <div style={{ height: HEADER_H, position: 'relative', borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)' }}>
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
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #626F86)', whiteSpace: 'nowrap' }}>
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
                    <span style={{ fontSize: 10, color: 'var(--ds-text-subtlest, #626F86)', whiteSpace: 'nowrap' }}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* grid content */}
            <div style={{ position: 'relative', height: contentHeight }}>
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
                <div key={issue.issueKey} style={{
                  position: 'absolute',
                  top: idx * ROW_H,
                  left: 0,
                  right: 0,
                  height: ROW_H,
                  background: idx % 2 === 0
                    ? 'transparent'
                    : 'var(--ds-background-neutral-subtle, #F7F8F9)',
                }} />
              ))}

              {/* bars */}
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
                const top = idx * ROW_H + (ROW_H - 20) / 2;

                return (
                  <div
                    key={issue.issueKey}
                    title={`${issue.issueKey}: ${issue.summary}\n${issue.startDate ?? '?'} → ${issue.dueDate ?? '?'}`}
                    style={{
                      position: 'absolute',
                      top,
                      left,
                      width,
                      height: 20,
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
                );
              })}
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

function SidebarRow({ issue, depth, collapsed, onToggle }: SidebarRowProps) {
  const hasChildren = issue.children.length > 0;

  return (
    <div style={{
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
      <div style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {hasChildren && (
          collapsed
            ? <ChevronRight style={{ width: 12, height: 12, color: 'var(--ds-text-subtlest, #626F86)' }} />
            : <ChevronDown style={{ width: 12, height: 12, color: 'var(--ds-text-subtlest, #626F86)' }} />
        )}
      </div>

      {/* type icon */}
      <JiraIssueTypeIcon type={issue.issueType} size={14} />

      {/* summary */}
      <span style={{
        flex: 1,
        fontSize: 12,
        color: 'var(--ds-text, #172B4D)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: 1.2,
      }}>
        {issue.summary}
      </span>
    </div>
  );
}
