import React, { useState } from 'react';
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

  const sorted = [...items].sort(
    (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime(),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E5E7EB', background: '#FAFBFC' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-xs font-semibold transition-colors border-b-2"
            style={{
              color: tab === t.key ? '#2563EB' : '#9CA3AF',
              borderBottomColor: tab === t.key ? '#2563EB' : 'transparent',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {tab === 'stream' && <EventStream items={sorted} onItemClick={onItemClick} />}
        {tab === 'gantt' && <GanttTimeline items={sorted} onItemClick={onItemClick} />}
        {tab === 'journal' && <MilestoneJournal items={sorted} onItemClick={onItemClick} />}
      </div>
    </div>
  );
}

/* ─── Event Stream ─── */

function EventStream({
  items,
  onItemClick,
}: {
  items: Resource360Item[];
  onItemClick: (item: Resource360Item) => void;
}) {
  if (items.length === 0) {
    return <EmptyState message="No events to display" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item) => {
        const cat = getStatusCategory(item.status, item.status_category);
        const sc = STATUS_COLORS[cat];
        const hubColor = WH_HUB_COLORS[item.hub] ?? '#64748B';
        const hubShort = WH_HUB_SHORT[item.hub] ?? item.hub?.slice(0, 4).toUpperCase();

        return (
          <div
            key={item.work_item_id}
            onClick={() => onItemClick(item)}
            className="flex gap-3 p-3 rounded-lg cursor-pointer transition-all"
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#2563EB';
              (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#334155';
              (e.currentTarget as HTMLElement).style.transform = 'none';
            }}
          >
            {/* Date column */}
            <div style={{ minWidth: 44, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                {new Date(item.assigned_at).toLocaleDateString('en-US', { month: 'short' })}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>
                {new Date(item.assigned_at).getDate()}
              </div>
            </div>

            {/* Vertical accent bar */}
            <div style={{ width: 3, borderRadius: 4, background: hubColor, flexShrink: 0 }} />

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', fontFamily: 'monospace' }}>
                  {item.item_key}
                </span>
                <span style={{ fontSize: 9, fontWeight: 600, color: hubColor, background: `${hubColor}18`, padding: '1px 6px', borderRadius: 4 }}>
                  {hubShort}
                </span>
                <span style={{ fontSize: 10, color: sc.text, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                  {item.status}
                </span>
              </div>

              <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#64748B' }}>
                <span>Assigned by {item.assigner_name ?? '—'}</span>
                <span>{item.age_days}d</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Gantt Timeline ─── */

function GanttTimeline({
  items,
  onItemClick,
}: {
  items: Resource360Item[];
  onItemClick: (item: Resource360Item) => void;
}) {
  if (items.length === 0) {
    return <EmptyState message="No items for Gantt view" />;
  }

  const dates = items.map((i) => new Date(i.assigned_at).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date();
  const totalMs = maxDate.getTime() - minDate.getTime() || 1;

  const hubGroups: Record<string, Resource360Item[]> = {};
  items.forEach((item) => {
    const hub = item.hub ?? 'Other';
    if (!hubGroups[hub]) hubGroups[hub] = [];
    hubGroups[hub].push(item);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Month headers */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', marginBottom: 8 }}>
        {getMonthLabels(minDate, maxDate).map((m, i) => (
          <div
            key={i}
            style={{
              width: `${m.widthPct}%`,
              fontSize: 10,
              color: '#9CA3AF',
              padding: '4px 6px',
              borderRight: '1px solid #F0F0F3',
              fontWeight: 600,
            }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {Object.entries(hubGroups).map(([hub, hubItems]) => {
        const hubColor = WH_HUB_COLORS[hub] ?? '#64748B';
        return (
          <div key={hub} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '0 4px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: hubColor }}>
                {hub}
              </span>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{hubItems.length} items</span>
            </div>

            {hubItems.map((item) => {
              const cat = getStatusCategory(item.status, item.status_category);
              const sc = STATUS_COLORS[cat];
              const startMs = new Date(item.assigned_at).getTime() - minDate.getTime();
              const durationMs = item.age_days * 86400000;
              const leftPct = (startMs / totalMs) * 100;
              const widthPct = Math.max(2, (durationMs / totalMs) * 100);

              return (
                <div
                  key={item.work_item_id}
                  onClick={() => onItemClick(item)}
                  className="cursor-pointer"
                  style={{ position: 'relative', height: 28, marginBottom: 3 }}
                >
                  <div style={{ position: 'absolute', left: 0, right: 0, top: 10, height: 1, background: '#F0F0F3' }} />

                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: 2,
                      height: 22,
                      background: sc.bg,
                      borderRadius: 6,
                      border: `1px solid ${sc.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '0 6px',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 150ms',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, color: sc.text, fontFamily: 'monospace' }}>
                      {item.item_key}
                    </span>
                    <span style={{ fontSize: 10, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </span>
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

function getMonthLabels(start: Date, end: Date): Array<{ label: string; widthPct: number }> {
  const labels: Array<{ label: string; widthPct: number }> = [];
  const totalMs = end.getTime() - start.getTime() || 1;
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cur <= end) {
    const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const segStart = Math.max(cur.getTime(), start.getTime());
    const segEnd = Math.min(nextMonth.getTime(), end.getTime());
    const widthPct = ((segEnd - segStart) / totalMs) * 100;

    labels.push({
      label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      widthPct,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return labels;
}

/* ─── Milestone Journal ─── */

function MilestoneJournal({
  items,
  onItemClick,
}: {
  items: Resource360Item[];
  onItemClick: (item: Resource360Item) => void;
}) {
  if (items.length === 0) {
    return <EmptyState message="No milestones to display" />;
  }

  const monthGroups: Record<string, Resource360Item[]> = {};
  items.forEach((item) => {
    const d = new Date(item.assigned_at);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(item);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {Object.entries(monthGroups).map(([month, monthItems]) => (
        <div key={month}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
              {month}
            </div>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>
              {monthItems.length} items
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {monthItems.map((item) => {
              const cat = getStatusCategory(item.status, item.status_category);
              const sc = STATUS_COLORS[cat];
              const hubColor = WH_HUB_COLORS[item.hub] ?? '#64748B';

              return (
                <div
                  key={item.work_item_id}
                  onClick={() => onItemClick(item)}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{ border: '1px solid #F0F0F3' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#F9FAFB';
                    (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = '#F0F0F3';
                  }}
                >
                  {/* Date badge */}
                  <div style={{ minWidth: 40, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
                      {new Date(item.assigned_at).getDate()}
                    </div>
                    <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>
                      {new Date(item.assigned_at).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>
                        {item.item_key}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: hubColor, background: `${hubColor}12`, padding: '1px 5px', borderRadius: 4 }}>
                        {WH_HUB_SHORT[item.hub] ?? item.hub}
                      </span>
                      <span style={{ fontSize: 10, color: sc.text, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                        {item.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Shared ─── */

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF' }}>{message}</p>
        <p style={{ fontSize: 12, color: '#D1D5DB', marginTop: 4 }}>Assign work items to see them here</p>
      </div>
    </div>
  );
}
