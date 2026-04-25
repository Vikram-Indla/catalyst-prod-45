/**
 * R360 Profile Drawer — Weekly Story Tab
 * Extracted from R360ProfileDrawer.tsx
 */
import React, { useMemo } from 'react';
import { CalendarX } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import {
  INK1, INK2, INK4, MUTED, BORDER_LIGHT,
  SectionTitle, R360StatusLozenge,
} from './R360DrawerShared';

interface WeeklyStoryTabProps {
  workItems: any[];
  openCount: number;
  showFilteredList: (label: string, filterFn: (i: any) => boolean) => void;
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
}

export function WeeklyStoryTab({ workItems, openCount, showFilteredList, weekStart, weekEnd, weekLabel }: WeeklyStoryTabProps) {

  const closedThisWeek = useMemo(() =>
    workItems.filter((i: any) => {
      if ((i.status_category || '').toLowerCase() !== 'done') return false;
      const u = new Date(i.updated_at);
      return u >= weekStart && u <= weekEnd;
    }).length
  , [workItems, weekStart, weekEnd]);

  const oldestDays = useMemo(() => {
    const open = workItems.filter((i: any) => (i.status_category || '').toLowerCase() !== 'done');
    if (open.length === 0) return 0;
    const now = Date.now();
    return open.reduce((max: number, i: any) => {
      const age = Math.floor((now - new Date(i.created_at).getTime()) / 86400000);
      return age > max ? age : max;
    }, 0);
  }, [workItems]);

  const headline = useMemo(() => {
    if (closedThisWeek === 0 && openCount === 0) return 'Quiet week — no active items.';
    if (closedThisWeek === 0 && openCount > 0) return `Carrying ${openCount} open items into this week, none closed yet.`;
    if (closedThisWeek > 0 && openCount === 0) return `Strong week — closed ${closedThisWeek} item(s) with nothing outstanding.`;
    return `Closed ${closedThisWeek} this week, ${openCount} still open. Oldest: ${oldestDays}d.`;
  }, [closedThisWeek, openCount, oldestDays]);

  const timelineItems = useMemo(() =>
    workItems
      .filter((i: any) => {
        const u = new Date(i.updated_at);
        return u >= weekStart && u <= weekEnd;
      })
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10)
  , [workItems, weekStart, weekEnd]);

  const createdThisWeek = useMemo(() =>
    workItems.filter((i: any) => {
      const c = new Date(i.created_at);
      return c >= weekStart && c <= weekEnd;
    }).length
  , [workItems, weekStart, weekEnd]);

  const updatedOnly = useMemo(() => {
    return workItems.filter((i: any) => {
      const u = new Date(i.updated_at);
      const c = new Date(i.created_at);
      const inWeek = u >= weekStart && u <= weekEnd;
      const createdInWeek = c >= weekStart && c <= weekEnd;
      return inWeek && !createdInWeek;
    }).length;
  }, [workItems, weekStart, weekEnd]);

  const relativeTime = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return '1d ago';
    return `${diff}d ago`;
  };

  return (
    <>
      {/* §1 Week Headline */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <div style={{
          border: '1px solid var(--divider)', borderRadius: 8, padding: 16, background: 'var(--bg-app)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK4, marginBottom: 8 }}>
            {weekLabel}
          </div>
          <div style={{ fontSize: 14, color: INK2, lineHeight: 1.5 }}>{headline}</div>
        </div>
      </div>

      {/* §2 Timeline */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>THIS WEEK'S ACTIVITY</SectionTitle>
        {timelineItems.length === 0 ? (
          <div style={{
            border: '1px solid var(--divider)', borderRadius: 8, padding: '24px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'var(--bg-app)',
          }}>
            <CalendarX size={20} color={MUTED} />
            <span style={{ fontSize: 13, color: INK4 }}>No activity recorded this week</span>
            <span style={{ fontSize: 12, color: MUTED }}>Items will appear as work progresses</span>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden' }}>
            {timelineItems.map((item: any, idx: number) => (
              <div key={item.id || idx} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                minHeight: 50,
                borderBottom: idx < timelineItems.length - 1 ? '0.75px solid var(--divider)' : 'none',
              }}>
                <JiraIssueTypeIcon type={item.work_item_type || 'Task'} size={16} />
                <span style={{ fontSize: 12, fontFamily: 'var(--ds-font-family-monospaced)', color: INK4, flexShrink: 0 }}>{item.item_key}</span>
                <span style={{
                  flex: 1, fontSize: 13, color: INK2, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}>{item.title}</span>
                <R360StatusLozenge status={item.status || item.status_category || 'To Do'} />
                <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{relativeTime(item.updated_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* §3 Week Summary Tiles */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Opened', value: createdThisWeek, onClick: () => showFilteredList('Opened This Week', (i: any) => {
              const c = new Date(i.created_at);
              return c >= weekStart && c <= weekEnd;
            }) },
            { label: 'Updated', value: updatedOnly, onClick: () => showFilteredList('Updated This Week', (i: any) => {
              const u = new Date(i.updated_at);
              const c = new Date(i.created_at);
              return u >= weekStart && u <= weekEnd && !(c >= weekStart && c <= weekEnd);
            }) },
            { label: 'Closed', value: closedThisWeek, onClick: () => showFilteredList('Closed This Week', (i: any) => {
              if ((i.status_category || '').toLowerCase() !== 'done') return false;
              const u = new Date(i.updated_at);
              return u >= weekStart && u <= weekEnd;
            }) },
          ].map((tile, i) => (
            <div key={i}
              onClick={tile.onClick}
              style={{
                border: '1px solid var(--divider)', borderRadius: 8, padding: '12px 14px', background: 'var(--bg-app)',
                cursor: 'pointer', transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
            >
              <div style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 28, fontWeight: 650, color: INK1 }}>{tile.value}</div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginTop: 4 }}>{tile.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
