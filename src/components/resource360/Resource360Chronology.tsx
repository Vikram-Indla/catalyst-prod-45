import React, { useState, useMemo } from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, STATUS_COLORS, WH_HUB_COLORS, WH_HUB_SHORT } from '@/types/resource360';

interface Props {
  items: Resource360Item[];
  onItemClick: (item: Resource360Item) => void;
}

type ChronoTab = 'stream' | 'gantt' | 'journal';

export function Resource360Chronology({ items, onItemClick }: Props) {
  const [tab, setTab] = useState<ChronoTab>('stream');

  const tabs: { key: ChronoTab; label: string }[] = [
    { key: 'stream', label: 'Event Stream' },
    { key: 'gantt', label: 'Gantt Timeline' },
    { key: 'journal', label: 'Milestone Journal' },
  ];

  const sorted = useMemo(() =>
    [...items].sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()),
    [items]
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E5E7EB', padding: '0 16px' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 16px', fontSize: 12, fontWeight: 600,
              color: tab === t.key ? '#2563EB' : '#6B7280',
              borderBottom: tab === t.key ? '2px solid #2563EB' : '2px solid transparent',
              background: 'transparent', border: 'none', borderBottomStyle: 'solid',
              cursor: 'pointer', transition: 'all .15s',
            }}>
            {t.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
          {items.length} items
        </span>
      </div>

      <div style={{ padding: '12px 0' }}>
        {tab === 'stream' && <EventStream items={sorted} onItemClick={onItemClick} />}
        {tab === 'gantt' && <GanttTimeline items={sorted} onItemClick={onItemClick} />}
        {tab === 'journal' && <MilestoneJournal items={sorted} onItemClick={onItemClick} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   EVENT STREAM — LIGHT MODE
   ═══════════════════════════════════════ */

function EventStream({ items, onItemClick }: { items: Resource360Item[]; onItemClick: (item: Resource360Item) => void }) {
  if (items.length === 0) return <Empty msg="No events" />;

  const groups: Record<string, Resource360Item[]> = {};
  items.forEach(item => {
    const d = item.assigned_at?.slice(0, 10) ?? 'Unknown';
    if (!groups[d]) groups[d] = [];
    groups[d].push(item);
  });

  return (
    <div style={{ padding: '0 16px' }}>
      {Object.entries(groups).map(([date, dateItems]) => {
        const dt = new Date(date);
        const dayLabel = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return (
          <div key={date} style={{ marginBottom: 16 }}>
            {/* Date header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.02em' }}>
                {dayLabel}
              </span>
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>
                {dateItems.length} item{dateItems.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cards */}
            {dateItems.map(item => {
              const cat = getStatusCategory(item.status, item.status_category);
              const sc = STATUS_COLORS[cat];
              const hubColor = WH_HUB_COLORS[item.hub] ?? '#64748B';
              const hubShort = WH_HUB_SHORT[item.hub] ?? item.hub?.slice(0, 4).toUpperCase();

              return (
                <div
                  key={item.work_item_id}
                  onClick={() => onItemClick(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', marginBottom: 4,
                    background: '#fff', borderRadius: 8,
                    border: '1px solid #F0F0F3',
                    cursor: 'pointer', transition: 'all .12s',
                    borderLeft: `3px solid ${sc.dot}`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.04)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#F0F0F3';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>

                  {/* Key + Hub */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 64 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
                      {item.item_key}
                    </span>
                    <span style={{ fontSize: 8, fontWeight: 700, color: hubColor, background: `${hubColor}14`, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em' }}>
                      {hubShort}
                    </span>
                  </div>

                  {/* Title */}
                  <div style={{
                    flex: 1, fontSize: 12, fontWeight: 500, color: '#0F172A',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.title}
                  </div>

                  {/* Assigner */}
                  <div style={{ fontSize: 10, color: '#2563EB', fontWeight: 500, minWidth: 80, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.assigner_name ?? '—'}
                  </div>

                  {/* Status pill */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 9, fontWeight: 600, color: sc.text, background: sc.bg,
                    padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                    {item.status.length > 16 ? item.status.slice(0, 14) + '…' : item.status}
                  </span>

                  {/* Age */}
                  <span style={{
                    fontSize: 10, fontWeight: 600, minWidth: 28, textAlign: 'right',
                    color: item.age_days > 14 ? '#EF4444' : '#6B7280',
                  }}>
                    {item.age_days}d
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════
   GANTT TIMELINE — AUTO-FIT DATE RANGE
   ═══════════════════════════════════════ */

function GanttTimeline({ items, onItemClick }: { items: Resource360Item[]; onItemClick: (item: Resource360Item) => void }) {
  if (items.length === 0) return <Empty msg="No timeline data" />;

  const dates = items.map(i => new Date(i.assigned_at).getTime());
  const dataMin = Math.min(...dates);
  const dataMax = Math.max(...dates);
  const padMs = 3 * 86400000;
  const rangeStart = new Date(dataMin - padMs);
  const rangeEnd = new Date(Math.max(dataMax + padMs, Date.now()));
  const totalMs = rangeEnd.getTime() - rangeStart.getTime() || 1;

  const hubGroups: Record<string, Resource360Item[]> = {};
  items.forEach(item => {
    const hub = item.hub ?? 'Other';
    if (!hubGroups[hub]) hubGroups[hub] = [];
    hubGroups[hub].push(item);
  });

  const weeks = getWeekLabels(rangeStart, rangeEnd);
  const todayPct = ((Date.now() - rangeStart.getTime()) / totalMs) * 100;
  const LEFT_COL = 200;

  return (
    <div style={{ padding: '0 16px', overflowX: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, background: '#FAFBFC', zIndex: 5 }}>
        <div style={{ minWidth: LEFT_COL, maxWidth: LEFT_COL, padding: '6px 8px', fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em' }}>
          ITEM
        </div>
        <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
          {weeks.map((w, i) => (
            <div key={i} style={{
              width: `${w.widthPct}%`, padding: '6px 4px',
              fontSize: 9, fontWeight: 600, color: '#94A3B8',
              borderLeft: '1px solid #F0F0F3', textAlign: 'center',
            }}>
              {w.label}
            </div>
          ))}
        </div>
      </div>

      {/* Hub groups */}
      {Object.entries(hubGroups).map(([hub, hubItems]) => {
        const hubColor = WH_HUB_COLORS[hub] ?? '#64748B';
        return (
          <div key={hub}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 8px', background: '#F8FAFC',
              borderBottom: '1px solid #F0F0F3',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: hubColor }}>{hub.replace('Hub', '')}</span>
              <span style={{ fontSize: 9, color: '#94A3B8' }}>{hubItems.length} items</span>
            </div>

            {hubItems.map(item => {
              const cat = getStatusCategory(item.status, item.status_category);
              const sc = STATUS_COLORS[cat];
              const startMs = new Date(item.assigned_at).getTime() - rangeStart.getTime();
              const barDuration = Math.max(item.age_days, 1) * 86400000;
              const leftPct = (startMs / totalMs) * 100;
              const widthPct = Math.max(3, (barDuration / totalMs) * 100);

              return (
                <div
                  key={item.work_item_id}
                  onClick={() => onItemClick(item)}
                  style={{
                    display: 'flex', height: 36, cursor: 'pointer',
                    borderBottom: '1px solid #F7F7F8',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>

                  <div style={{ minWidth: LEFT_COL, maxWidth: LEFT_COL, display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', overflow: 'hidden' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                      {item.item_key}
                    </span>
                    <span style={{ fontSize: 10, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </span>
                  </div>

                  <div style={{ flex: 1, position: 'relative' }}>
                    {weeks.map((w, i) => {
                      let acc = 0;
                      for (let j = 0; j < i; j++) acc += weeks[j].widthPct;
                      return (
                        <div key={i} style={{ position: 'absolute', left: `${acc}%`, top: 0, bottom: 0, width: 1, background: '#F0F0F3' }} />
                      );
                    })}

                    <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 1, background: '#EF4444', opacity: 0.4 }} />

                    <div style={{
                      position: 'absolute', top: 8, height: 20, borderRadius: 4,
                      left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 40,
                      background: sc.bg, border: `1px solid ${sc.border}`,
                      display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px', overflow: 'hidden',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, fontWeight: 600, color: sc.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function getWeekLabels(start: Date, end: Date): Array<{ label: string; widthPct: number }> {
  const labels: Array<{ label: string; widthPct: number }> = [];
  const totalMs = end.getTime() - start.getTime() || 1;
  const cur = new Date(start);
  cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));

  while (cur < end) {
    const weekEnd = new Date(cur.getTime() + 7 * 86400000);
    const segStart = Math.max(cur.getTime(), start.getTime());
    const segEnd = Math.min(weekEnd.getTime(), end.getTime());
    const widthPct = ((segEnd - segStart) / totalMs) * 100;
    if (widthPct > 0.5) {
      labels.push({
        label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        widthPct,
      });
    }
    cur.setDate(cur.getDate() + 7);
  }
  return labels;
}

/* ═══════════════════════════════════════
   MILESTONE JOURNAL — LIGHT MODE
   ═══════════════════════════════════════ */

function MilestoneJournal({ items, onItemClick }: { items: Resource360Item[]; onItemClick: (item: Resource360Item) => void }) {
  if (items.length === 0) return <Empty msg="No milestones" />;

  const groups: Record<string, Resource360Item[]> = {};
  items.forEach(item => {
    const d = new Date(item.assigned_at);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  return (
    <div style={{ padding: '0 16px' }}>
      {Object.entries(groups).map(([month, monthItems]) => (
        <div key={month} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{month}</span>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ fontSize: 10, color: '#94A3B8' }}>{monthItems.length} items</span>
          </div>

          {monthItems.map(item => {
            const cat = getStatusCategory(item.status, item.status_category);
            const sc = STATUS_COLORS[cat];
            const hubColor = WH_HUB_COLORS[item.hub] ?? '#64748B';
            const dt = new Date(item.assigned_at);

            return (
              <div
                key={item.work_item_id}
                onClick={() => onItemClick(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', marginBottom: 3,
                  borderRadius: 6, border: '1px solid #F0F0F3',
                  cursor: 'pointer', transition: 'all .12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#2563EB', lineHeight: 1 }}>{dt.getDate()}</span>
                  <span style={{ fontSize: 8, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                    {dt.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 60 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
                    {item.item_key}
                  </span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: hubColor, letterSpacing: '0.04em' }}>
                    {WH_HUB_SHORT[item.hub] ?? item.hub}
                  </span>
                </div>

                <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </div>

                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 9, fontWeight: 600, color: sc.text, background: sc.bg,
                  padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                  {item.status.length > 14 ? item.status.slice(0, 12) + '…' : item.status}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ═══ Shared ═══ */

function Empty({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{msg}</p>
        <p style={{ fontSize: 12, color: '#94A3B8' }}>Assign work items to see them here</p>
      </div>
    </div>
  );
}
