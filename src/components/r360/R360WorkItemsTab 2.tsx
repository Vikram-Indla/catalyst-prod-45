/**
 * R360 Profile Drawer — Work Items Tab
 * Extracted from R360ProfileDrawer.tsx
 */
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  INK1, INK2, INK4, MUTED, R360StatusLozenge,
} from './R360DrawerShared';

interface WorkItemsTabProps {
  workItems: any[];
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
}

export function WorkItemsTab({ workItems, weekStart, weekEnd, weekLabel, weekOffset, setWeekOffset }: WorkItemsTabProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    return workItems
      .filter((i: any) => {
        const u = new Date(i.updated_at);
        if (u < weekStart || u > weekEnd) return false;
        if (statusFilter !== 'all' && i.status_category !== statusFilter) return false;
        if (typeFilter !== 'all') {
          const t = (i.work_item_type || '').toLowerCase().replace(/[_\s-]/g, '');
          const f = typeFilter.toLowerCase().replace(/[_\s-]/g, '');
          if (t !== f) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [workItems, weekStart, weekEnd, statusFilter, typeFilter]);

  const display = filtered.slice(0, 50);
  const totalCount = filtered.length;

  const relTime = (ds: string) => {
    const d = Math.floor((Date.now() - new Date(ds).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1d ago';
    return `${d}d ago`;
  };

  return (
    <>
      {/* Toolbar */}
      <div style={{
        height: 40, flexShrink: 0, borderBottom: '0.75px solid var(--divider)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger style={{ height: 32, fontSize: 13, minWidth: 120 }}>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger style={{ height: 32, fontSize: 13, minWidth: 100 }}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Bug">Bug</SelectItem>
              <SelectItem value="Story">Story</SelectItem>
              <SelectItem value="Subtask">Subtask</SelectItem>
              <SelectItem value="Incident">Incident</SelectItem>
              <SelectItem value="QA Bug">QA Bug</SelectItem>
              <SelectItem value="Frontend">Frontend</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setWeekOffset(o => Math.max(o - 1, -52))}
            disabled={weekOffset <= -52}
            style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: weekOffset <= -52 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, opacity: weekOffset <= -52 ? 0.3 : 1 }}
            onMouseEnter={e => { if (weekOffset > -52) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronLeft size={16} color={INK4} />
          </button>
          <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: INK2, whiteSpace: 'nowrap' as const }}>{weekLabel}</span>
          <button
            onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
            disabled={weekOffset >= 0}
            style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: weekOffset >= 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, opacity: weekOffset >= 0 ? 0.3 : 1 }}
            onMouseEnter={e => { if (weekOffset < 0) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronRight size={16} color={INK4} />
          </button>
        </div>
      </div>

      {/* Table */}
      {display.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '48px 16px',
        }}>
          <Inbox size={24} color={MUTED} />
          <span style={{ fontSize: 13, color: INK4 }}>No work items found</span>
          <span style={{ fontSize: 12, color: MUTED }}>Try adjusting the filters</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', height: 50, padding: '8px 12px',
            borderBottom: '0.75px solid var(--divider)', background: 'var(--bg-app)',
          }}>
            <span style={{ width: 40, textAlign: 'center' as const, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', color: INK4, letterSpacing: '0.04em' }}>TYPE</span>
            <span style={{ width: 100, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', color: INK4, letterSpacing: '0.04em', paddingLeft: 8 }}>KEY</span>
            <span style={{ flex: 1, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', color: INK4, letterSpacing: '0.04em' }}>TITLE</span>
            <span style={{ width: 120, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', color: INK4, letterSpacing: '0.04em' }}>STATUS</span>
            <span style={{ width: 90, textAlign: 'right' as const, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', color: INK4, letterSpacing: '0.04em' }}>UPDATED</span>
          </div>
          {/* Rows */}
          {display.map((item: any, idx: number) => (
            <div
              key={item.id || idx}
              style={{
                display: 'flex', alignItems: 'center', height: 50, padding: '8px 12px',
                borderBottom: idx < display.length - 1 ? '0.75px solid var(--divider)' : 'none',
                background: 'var(--bg-app)', transition: 'background 80ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
            >
              <span style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                <JiraIssueTypeIcon type={item.work_item_type || 'Task'} size={16} />
              </span>
              <span style={{ width: 100, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: INK4, paddingLeft: 8 }}>{item.item_key}</span>
              <span style={{
                flex: 1, fontSize: 13, color: INK2, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
              }}>{item.title}</span>
              <span style={{ width: 120 }}>
                <R360StatusLozenge status={item.status || item.status_category || 'To Do'} />
              </span>
              <span style={{ width: 90, textAlign: 'right' as const, fontSize: 11, color: MUTED }}>{relTime(item.updated_at)}</span>
            </div>
          ))}
          {totalCount > 50 && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: MUTED, textAlign: 'center' as const }}>
              Showing 50 of {totalCount} items
            </div>
          )}
        </div>
      )}
    </>
  );
}
