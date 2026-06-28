/**
 * Pure helper functions for the shared Timeline.
 * Hub-agnostic — no React state, no Supabase, no React Query.
 *
 * Covers: date math, tree traversal, epic progress, date-range, bar coloring,
 * header column generation, grid line generation, label formatting.
 */

import type * as React from 'react';
import type { TimelineIssue, EpicProgress, FlatRow, HeaderCol, ZoomLevel } from './types';
import { MONTHS, BAR_H } from './types';

/* ─────────────────────────────── date helpers ───────────────────────── */

export function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

export function formatDateCompact(d: string | null): string {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─────────────────────────────── tree helpers ───────────────────────── */

export function computeEpicProgress(issue: TimelineIssue): EpicProgress {
  function countAll(items: TimelineIssue[]): EpicProgress {
    let done = 0, inProgress = 0, toDo = 0;
    for (const i of items) {
      const cat = (i.statusCategory ?? '').toLowerCase();
      if (cat.includes('done')) done++;
      else if (cat.includes('progress')) inProgress++;
      else toDo++;
      if (i.children.length) {
        const sub = countAll(i.children);
        done += sub.done; inProgress += sub.inProgress; toDo += sub.toDo;
      }
    }
    return { done, inProgress, toDo, total: done + inProgress + toDo };
  }
  return countAll(issue.children);
}

export function computeDateRange(issues: TimelineIssue[]): { start: Date; end: Date } {
  let minMs = Infinity, maxMs = -Infinity;
  function scan(list: TimelineIssue[]) {
    for (const i of list) {
      const s = parseDate(i.startDate), e = parseDate(i.dueDate);
      if (s) { minMs = Math.min(minMs, s.getTime()); maxMs = Math.max(maxMs, s.getTime()); }
      if (e) { minMs = Math.min(minMs, e.getTime()); maxMs = Math.max(maxMs, e.getTime()); }
      if (i.children.length) scan(i.children);
    }
  }
  scan(issues);
  const now = new Date();
  const rangeStart = isFinite(minMs) ? new Date(minMs) : addDays(now, -90);
  const rangeEnd = isFinite(maxMs) ? new Date(maxMs) : addDays(now, 90);
  return { start: addDays(rangeStart, -28), end: addDays(rangeEnd, 28) };
}

export function flattenTree(issues: TimelineIssue[], collapsed: Set<string>, depth = 0): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const issue of issues) {
    rows.push({ issue, depth });
    if (issue.children.length && !collapsed.has(issue.issueKey)) {
      rows.push(...flattenTree(issue.children, collapsed, depth + 1));
    }
  }
  return rows;
}

export function collectParentKeys(issues: TimelineIssue[]): string[] {
  const keys: string[] = [];
  function collect(list: TimelineIssue[]) {
    for (const i of list) {
      if (i.children.length) { keys.push(i.issueKey); collect(i.children); }
    }
  }
  collect(issues);
  return keys;
}

export function flattenAll(issues: TimelineIssue[]): TimelineIssue[] {
  return issues.flatMap(i => [i, ...flattenAll(i.children)]);
}

export function hasAnyDates(issues: TimelineIssue[]): boolean {
  for (const i of issues) {
    if (i.startDate || i.dueDate) return true;
    if (i.children.length && hasAnyDates(i.children)) return true;
  }
  return false;
}

/* ─────────────────────────────── bar color ─────────────────────────── */

export function barColor(issue: TimelineIssue): string {
  if (issue.epicColor) return issue.epicColor;
  const cat = (issue.statusCategory ?? '').toLowerCase();
  if (cat.includes('done')) return 'var(--ds-background-success-bold, var(--ds-background-success-bold))';
  if (cat.includes('progress')) return 'var(--ds-background-information-bold)';
  return 'var(--ds-background-neutral-bold)';
}

/* ─────────────────────────────── header/grid builders ───────────────── */

export function buildHeaderCols(start: Date, end: Date, zoom: ZoomLevel, pxPerDay: number): HeaderCol[] {
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

export function buildSubHeaderCols(start: Date, end: Date, zoom: ZoomLevel, pxPerDay: number): HeaderCol[] {
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

export function buildGridLines(start: Date, end: Date, zoom: ZoomLevel, pxPerDay: number): number[] {
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

/* ─────────────────────────────── label style ───────────────────────── */

export function dateLabelStyle(x: number, barTop: number, side: 'start' | 'end'): React.CSSProperties {
  return {
    position: 'absolute',
    top: barTop + BAR_H + 3,
    left: x,
    transform: side === 'end' ? 'translateX(-100%)' : undefined,
    fontSize: 10, fontWeight: 600, lineHeight: 1,
    color: 'var(--ds-text-subtle)',
    background: 'var(--ds-surface-overlay)',
    border: '1px solid var(--ds-border)',
    borderRadius: 3, padding: '0px 5px',
    whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 11,
    boxShadow: '0 1px 3px var(--ds-shadow-overflow, rgba(9,30,66,0.12))',
    fontFamily: 'var(--ds-font-family-body)',
  };
}

/* ─────────────────────────────── shared icon-button style ───────────── */

export const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 24, height: 24, border: 'none',
  background: 'transparent', cursor: 'pointer', borderRadius: 3, flexShrink: 0,
  color: 'var(--ds-text-subtle)',
};
