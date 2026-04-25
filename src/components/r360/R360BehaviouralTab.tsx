/**
 * R360 Profile Drawer — Behavioural Patterns Tab
 * Extracted from R360ProfileDrawer.tsx
 */
import React, { useMemo } from 'react';
import {
  INK1, INK2, INK4, MUTED, SUCCESS, DANGER, SLATE,
  BORDER_LIGHT, SectionTitle,
} from './R360DrawerShared';

const WORK_DAYS = [0, 1, 2, 3, 4]; // Sun=0..Thu=4
const DAY_ABBRS = ['Su', 'Mo', 'Tu', 'We', 'Th'];

const HUB_COLORS: Record<string, string> = {
  BAU: '#0D9488', bau: '#0D9488', incident: DANGER, Product: '#3F3F46', Task: '#D4D4D8',
};

interface BehaviouralTabProps {
  workItems: any[];
  showFilteredList: (label: string, filterFn: (i: any) => boolean) => void;
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
}

export function BehaviouralTab({ workItems, showFilteredList, weekStart, weekEnd, weekLabel }: BehaviouralTabProps) {
  // §1 Work Rhythm DNA
  const rhythmData = useMemo(() => {
    const counts: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0 };
    workItems.forEach((i: any) => {
      const sc = (i.status_category || '').toLowerCase();
      if (!['in_progress', 'done'].includes(sc)) return;
      const d = new Date(i.updated_at).getDay();
      if (d >= 0 && d <= 4) counts[d]++;
    });
    const max = Math.max(...Object.values(counts), 1);
    return { counts, max };
  }, [workItems]);

  // §2 Pickup Intelligence
  const pickupStats = useMemo(() => {
    let totalPickupMs = 0, pickupCount = 0, sameDayCount = 0;
    workItems.forEach((i: any) => {
      if (!i.created_at || !i.updated_at) return;
      const sc = (i.status_category || '').toLowerCase();
      if (!['in_progress', 'in_review', 'done'].includes(sc)) return;
      const created = new Date(i.created_at);
      const updated = new Date(i.updated_at);
      const diff = updated.getTime() - created.getTime();
      if (diff > 0) { totalPickupMs += diff; pickupCount++; }
      if (created.toDateString() === updated.toDateString()) sameDayCount++;
    });
    const avgPickup = pickupCount > 0 ? (totalPickupMs / pickupCount) / 3600000 : null;
    const teamAvg = 38;
    let vsTeam: { label: string; color: string } = { label: 'On par', color: SLATE };
    if (avgPickup !== null) {
      const diff = avgPickup - teamAvg;
      if (diff > 2) vsTeam = { label: `+${Math.round(diff)}h slower`, color: DANGER };
      else if (diff < -2) vsTeam = { label: `−${Math.round(Math.abs(diff))}h faster`, color: SUCCESS };
    }
    return {
      avgPickup,
      avgPickupLabel: avgPickup === null ? '—' : avgPickup < 24 ? `${Math.round(avgPickup)}h` : `${Math.round(avgPickup / 24)}d`,
      sameDayCount,
      vsTeam,
    };
  }, [workItems]);

  // §3 Execution Style
  const execStyle = useMemo(() => {
    const closed = workItems.filter((i: any) => (i.status_category || '').toLowerCase() === 'done');
    const total = workItems.length;
    const inProg = workItems.filter((i: any) => (i.status_category || '').toLowerCase() === 'in_progress');
    const completionRate = total > 0 ? Math.round((closed.length / total) * 100) : 0;
    let totalCycleDays = 0, cycleCount = 0;
    closed.forEach((i: any) => {
      if (i.created_at && i.updated_at) {
        const days = (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()) / 86400000;
        if (days > 0) { totalCycleDays += days; cycleCount++; }
      }
    });
    const avgCycle = cycleCount > 0 ? totalCycleDays / cycleCount : null;
    const avgCycleLabel = avgCycle === null ? '—' : `${Math.floor(avgCycle)}d ${Math.round((avgCycle % 1) * 24)}h`;
    return {
      avgCycleLabel,
      itemsClosed: closed.length,
      concurrentAvg: inProg.length,
      completionRate: `${completionRate}%`,
    };
  }, [workItems]);

  // §4 Hub Breakdown — segmented bar
  const hubSegments = useMemo(() => {
    const counts: Record<string, number> = {};
    workItems.forEach((i: any) => {
      const hub = i.source_hub || 'BAU';
      counts[hub] = (counts[hub] || 0) + 1;
    });
    const total = workItems.length || 1;
    return Object.entries(counts).map(([hub, count]) => ({
      hub, count, pct: (count / total) * 100,
      color: HUB_COLORS[hub] || MUTED,
    }));
  }, [workItems]);

  const hasActivity = rhythmData.counts[0] > 0 || rhythmData.counts[1] > 0 || rhythmData.counts[2] > 0 || rhythmData.counts[3] > 0 || rhythmData.counts[4] > 0;

  return (
    <>
      {/* §1 Work Rhythm DNA */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>WORK RHYTHM DNA</SectionTitle>
        {!hasActivity ? (
          <div style={{ fontSize: 13, color: MUTED, padding: '20px 0', textAlign: 'center' as const }}>No activity data yet</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {WORK_DAYS.map((d, idx) => {
              const val = rhythmData.counts[d];
              const barH = Math.max((val / rhythmData.max) * 90, 2);
              const isPeak = val === rhythmData.max && val > 0;
              return (
                <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: isPeak ? 12 : 12, fontWeight: isPeak ? 600 : 400, fontFamily: 'var(--cp-font-mono)', color: isPeak ? '#1D4ED8' : '#374151' }}>{val}</span>
                  <div style={{
                    width: '100%', maxWidth: 40, height: barH, borderRadius: 4,
                    backgroundColor: isPeak ? '#1D4ED8' : 'var(--cp-blue)',
                    transition: 'height 300ms ease, background-color 0ms',
                  }} />
                  <span style={{ fontSize: 11, color: INK4, fontWeight: 500 }}>{DAY_ABBRS[idx]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* §2 Pickup Intelligence */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>PICKUP INTELLIGENCE</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Avg Pickup Time', value: pickupStats.avgPickupLabel, sub: 'time to first touch',
              onClick: () => showFilteredList('Pickup Time Detail', (i: any) => ['in_progress','in_review','done'].includes((i.status_category||'').toLowerCase())) },
            { label: 'Same-Day Pickups', value: String(pickupStats.sameDayCount), sub: 'picked up day of creation',
              onClick: () => showFilteredList('Same-Day Pickups', (i: any) => {
                if (!i.created_at || !i.updated_at) return false;
                return new Date(i.created_at).toDateString() === new Date(i.updated_at).toDateString() && ['in_progress','in_review','done'].includes((i.status_category||'').toLowerCase());
              }) },
            { label: 'Avg vs Team', value: pickupStats.vsTeam.label, sub: 'vs team benchmark', valueColor: pickupStats.vsTeam.color, onClick: undefined },
          ].map((tile, i) => (
            <div key={i}
              onClick={tile.onClick}
              style={{
                border: '1px solid var(--divider)', borderRadius: 8, padding: '12px 14px', background: 'var(--bg-app)',
                cursor: tile.onClick ? 'pointer' : 'default', transition: 'background 150ms',
              }}
              onMouseEnter={e => { if (tile.onClick) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (tile.onClick) e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED, marginBottom: 6 }}>{tile.label}</div>
              <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 28, fontWeight: 650, color: (tile as any).valueColor || INK1 }}>{tile.value}</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: INK4, marginTop: 4 }}>{tile.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* §3 Execution Style */}
      <div style={{ padding: 16, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
        <SectionTitle>EXECUTION STYLE</SectionTitle>
        <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: 'Avg cycle time', value: execStyle.avgCycleLabel, onClick: undefined as (() => void) | undefined },
            { label: 'Items closed', value: String(execStyle.itemsClosed), onClick: () => showFilteredList('All Closed Items', (i: any) => (i.status_category || '').toLowerCase() === 'done') },
            { label: 'Concurrent avg', value: String(execStyle.concurrentAvg), onClick: undefined as (() => void) | undefined },
            { label: 'Completion rate', value: execStyle.completionRate, onClick: undefined as (() => void) | undefined },
          ].map((row, i, arr) => (
            <div key={i}
              onClick={row.onClick}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                height: 50, padding: '0 14px',
                borderBottom: i < arr.length - 1 ? '0.75px solid var(--divider)' : 'none',
                cursor: row.onClick ? 'pointer' : 'default', transition: 'background 150ms',
              }}
              onMouseEnter={e => { if (row.onClick) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (row.onClick) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 12, color: INK2 }}>{row.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--cp-font-mono)', color: INK1 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* §4 Hub Breakdown */}
      <div style={{ padding: 16 }}>
        <SectionTitle>HUB BREAKDOWN</SectionTitle>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-3)' }}>
          {hubSegments.map((s, i) => (
            <div key={i} style={{ width: `${s.pct}%`, height: 8, borderRadius: 4, backgroundColor: s.color, transition: 'width 300ms' }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
          {hubSegments.map((s, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: INK2 }}>{s.hub === 'incident' ? 'IncidentHub' : s.hub === 'bau' || s.hub === 'BAU' ? 'BAU' : s.hub}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--cp-font-mono)', color: INK1 }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
