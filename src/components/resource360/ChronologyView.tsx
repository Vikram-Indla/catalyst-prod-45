import React, { useState, useMemo } from 'react';
import { useChronologyEvents, useGanttData } from '@/hooks/useResource360';
import { HUB_COLORS, HUB_SHORT, STATUS_CATEGORY_COLORS, WIT_STYLES } from '@/constants/resource360';

type SubTab = 'events' | 'gantt' | 'journal';

interface ChronologyViewProps {
  resourceId: string;
  onItemClick: (item: any) => void;
}

const ChronologyView: React.FC<ChronologyViewProps> = ({ resourceId, onItemClick }) => {
  const [subTab, setSubTab] = useState<SubTab>('events');
  const { data: events } = useChronologyEvents(resourceId);
  const { data: ganttData } = useGanttData(resourceId);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', fontSize: 12, fontWeight: active ? 600 : 500,
    color: active ? '#2563EB' : '#64748B',
    background: active ? '#FFFFFF' : 'transparent',
    border: 'none', borderRadius: 6, cursor: 'pointer',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Assignment Chronology</span>
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 2, gap: 1 }}>
          {(['events', 'gantt', 'journal'] as SubTab[]).map(t => (
            <button key={t} style={tabStyle(subTab === t)} onClick={() => setSubTab(t)}>
              {t === 'events' ? 'Event Stream' : t === 'gantt' ? 'Gantt Timeline' : 'Milestone Journal'}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'events' && <EventStream events={events || []} onItemClick={onItemClick} />}
      {subTab === 'gantt' && <GanttTimeline data={ganttData || []} onItemClick={onItemClick} />}
      {subTab === 'journal' && <MilestoneJournal events={events || []} onItemClick={onItemClick} />}
    </div>
  );
};

/* ── Event Stream ── */
const EventStream = ({ events, onItemClick }: { events: any[]; onItemClick: (i: any) => void }) => {
  const evtBadge = (type: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      assigned: { bg: '#DBEAFE', color: '#2563EB' },
      closed: { bg: '#D1FAE5', color: '#059669' },
      status_change: { bg: '#CCFBF1', color: '#0D9488' },
    };
    return map[type] || { bg: '#F1F5F9', color: '#64748B' };
  };

  return (
    <div style={{ maxHeight: 500, overflow: 'auto' }}>
      {events.map((ev, i) => {
        const badge = evtBadge(ev.event_type);
        const witStyle = WIT_STYLES[ev.work_item_type] || { bg: '#F1F5F9', color: '#334155' };
        return (
          <div key={i} onClick={() => onItemClick(ev)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0',
            borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
          }}>
            {/* Timeline dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: badge.color, marginTop: 4 }} />
              {i < events.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 20, background: '#E2E8F0' }} />}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, minWidth: 50 }}>
              {ev.event_date?.slice(5, 10)}
            </div>
            <span style={{
              fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: badge.bg, color: badge.color, textTransform: 'uppercase',
            }}>
              {ev.event_type?.replace('_', ' ')}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
              background: witStyle.bg, color: witStyle.color,
            }}>
              {ev.work_item_type}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
              {ev.item_key}
            </span>
            <span style={{ fontSize: 12, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ev.title}
            </span>
            {ev.release_key && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                border: '1px solid #0D9488', color: '#0D9488',
              }}>
                {ev.release_key}
              </span>
            )}
          </div>
        );
      })}
      {events.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No events found</div>}
    </div>
  );
};

/* ── Gantt Timeline ── */
const GanttTimeline = ({ data, onItemClick }: { data: any[]; onItemClick: (i: any) => void }) => {
  const PX_PER_DAY = 6;
  const LABEL_W = 180;

  const { minDate, maxDate, todayOffset } = useMemo(() => {
    if (!data.length) return { minDate: new Date(), maxDate: new Date(), todayOffset: 0 };
    const dates = data.flatMap(d => [new Date(d.bar_start), new Date(d.bar_end)]);
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    min.setDate(min.getDate() - 5);
    max.setDate(max.getDate() + 10);
    const today = new Date();
    const todayOff = Math.floor((today.getTime() - min.getTime()) / 86400000) * PX_PER_DAY;
    return { minDate: min, maxDate: max, todayOffset: todayOff };
  }, [data]);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000);
  const trackW = totalDays * PX_PER_DAY;

  return (
    <div style={{ overflow: 'auto', maxHeight: 500, border: '1px solid #E2E8F0', borderRadius: 8 }}>
      <div style={{ display: 'flex', minWidth: LABEL_W + trackW }}>
        {/* Labels */}
        <div style={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid #E2E8F0' }}>
          <div style={{ height: 32, background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }} />
          {data.map((d, i) => {
            const witStyle = WIT_STYLES[d.work_item_type] || { bg: '#F1F5F9', color: '#334155' };
            return (
              <div key={i} onClick={() => onItemClick(d)} style={{
                height: 36, display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px',
                borderBottom: '1px solid #F1F5F9', cursor: 'pointer', fontSize: 11,
              }}>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 10 }}>{d.item_key}</span>
                <span style={{ fontSize: 8.5, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: witStyle.bg, color: witStyle.color }}>
                  {d.work_item_type}
                </span>
              </div>
            );
          })}
        </div>

        {/* Track area */}
        <div style={{ position: 'relative', width: trackW }}>
          <div style={{ height: 32, background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }} />
          {/* Today marker */}
          <div style={{
            position: 'absolute', left: todayOffset, top: 0, bottom: 0,
            width: 2, background: '#DC2626', zIndex: 5,
          }}>
            <span style={{
              position: 'absolute', top: 4, left: -16,
              fontSize: 8, fontWeight: 800, color: '#DC2626',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>TODAY</span>
          </div>

          {data.map((d, i) => {
            const start = Math.floor((new Date(d.bar_start).getTime() - minDate.getTime()) / 86400000) * PX_PER_DAY;
            const width = Math.max(d.bar_days * PX_PER_DAY, 4);
            const sc = STATUS_CATEGORY_COLORS[d.status_category as keyof typeof STATUS_CATEGORY_COLORS];
            return (
              <div key={i} style={{ height: 36, position: 'relative', borderBottom: '1px solid #F1F5F9' }}>
                <div
                  onClick={() => onItemClick(d)}
                  style={{
                    position: 'absolute', left: start, top: 10,
                    width, height: 16, borderRadius: 4,
                    background: sc?.dot || '#94A3B8',
                    opacity: 0.7,
                    cursor: 'pointer',
                    transition: 'opacity 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ── Milestone Journal ── */
const MilestoneJournal = ({ events, onItemClick }: { events: any[]; onItemClick: (i: any) => void }) => {
  const milestones = useMemo(() => {
    return (events || []).filter(e => e.event_type === 'assigned' || e.event_type === 'closed');
  }, [events]);

  const grouped = useMemo(() => {
    const weeks: Record<string, any[]> = {};
    milestones.forEach(m => {
      const d = new Date(m.event_date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      (weeks[key] = weeks[key] || []).push(m);
    });
    return Object.entries(weeks).sort(([a], [b]) => b.localeCompare(a));
  }, [milestones]);

  return (
    <div style={{ maxHeight: 500, overflow: 'auto' }}>
      {grouped.map(([weekKey, items]) => {
        const ws = new Date(weekKey);
        const we = new Date(ws);
        we.setDate(we.getDate() + 6);
        const assigned = items.filter((i: any) => i.event_type === 'assigned').length;
        const closed = items.filter((i: any) => i.event_type === 'closed').length;

        return (
          <div key={weekKey} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                Week of {ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {assigned > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#DBEAFE', color: '#2563EB' }}>{assigned} assigned</span>}
              {closed > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#D1FAE5', color: '#059669' }}>{closed} closed</span>}
            </div>
            {items.map((it: any, i: number) => {
              const witStyle = WIT_STYLES[it.work_item_type] || { bg: '#F1F5F9', color: '#334155' };
              return (
                <div key={i} onClick={() => onItemClick(it)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 6px 12px',
                  borderLeft: '2px solid #E2E8F0', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 11, color: '#64748B', minWidth: 50 }}>
                    {it.event_date?.slice(5, 10)}
                  </span>
                  <span>{it.event_type === 'assigned' ? '📌' : '✅'}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                    background: witStyle.bg, color: witStyle.color,
                  }}>
                    {it.work_item_type}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace' }}>{it.item_key}</span>
                  <span style={{ fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {it.title}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
      {grouped.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No milestones found</div>}
    </div>
  );
};

export default ChronologyView;
