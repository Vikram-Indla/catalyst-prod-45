/**
 * Ideas Analytics Page — /product/ideas/analytics
 * ALL data from useIdeaStats() — ZERO hardcoded numbers.
 * Status Funnel + Quarter + Theme + Priority distributions.
 */
import React from 'react';
import { Download } from 'lucide-react';
import { useIdeaStats } from '@/hooks/useIdeasHub';
import { STATUS_LOZENGE_COLORS, QUARTER_BADGE } from './ideation/ideation-data';

const MONO = "'JetBrains Mono', monospace";

const STATUS_BAR_COLORS: Record<string, string> = {
  'Draft': '#DFE1E6',
  'Submitted': '#DEEBFF',
  'Under Review': '#DEEBFF',
  'Approved': '#E3FCEF',
  'Rejected': '#FEE2E2',
};
const STATUS_TEXT_COLORS: Record<string, string> = {
  'Draft': '#253858',
  'Submitted': '#0747A6',
  'Under Review': '#0747A6',
  'Approved': '#006644',
  'Rejected': '#B91C1C',
};

export default function IdeasAnalyticsPage() {
  const { data: stats, isLoading } = useIdeaStats();

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col h-full" style={{ background: '#FFFFFF' }}>
        <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>Ideas Analytics</h1>
        </div>
        <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>Loading analytics...</div>
      </div>
    );
  }

  const maxStatus = Math.max(...stats.byStatus.map(s => s.count), 1);
  const maxTheme = Math.max(...stats.byTheme.map(t => t.count), 1);
  const maxQuarter = Math.max(...stats.byQuarter.map(q => q.count), 1);
  const maxPriority = Math.max(...stats.byPriority.map(p => p.count), 1);

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>Ideas Analytics</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Comprehensive insights across the ideation pipeline</p>
          </div>
          <button style={{ background: '#FFFFFF', color: '#334155', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Total Ideas" value={String(stats.total)} color="#0F172A" />
          <StatCard label="In Pipeline" value={String(stats.inPipeline)} color="#2563EB" />
          <StatCard label="Approved" value={String(stats.approved)} color="#006644" />
          <StatCard label="Themes" value={String(stats.themeCount)} color="#2563EB" />
        </div>

        {/* Row 1: Status Funnel + Quarter Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', fontFamily: "'Sora', sans-serif" }}>Status Funnel</div>
            {stats.byStatus.map(s => (
              <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '100px', fontSize: '12px', fontWeight: 600, color: '#334155', flexShrink: 0 }}>{s.status}</span>
                <div style={{ flex: 1, height: '28px', background: '#F4F4F5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.max((s.count / maxStatus) * 100, s.count > 0 ? 8 : 0)}%`, height: '100%',
                    background: STATUS_BAR_COLORS[s.status] || '#DFE1E6', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', paddingLeft: '8px',
                    color: STATUS_TEXT_COLORS[s.status] || '#253858', fontSize: '12px', fontWeight: 700, minWidth: s.count > 0 ? '32px' : undefined,
                  }}>{s.count}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', fontFamily: "'Sora', sans-serif" }}>Quarter Distribution</div>
            {stats.byQuarter.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '13px' }}>No ideas assigned to quarters</div>
            ) : stats.byQuarter.map(q => (
              <div key={q.quarter} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  width: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  height: 20, borderRadius: 3, fontSize: '10px', fontWeight: 700,
                  background: QUARTER_BADGE[q.quarter]?.bg || '#E2E8F0',
                  color: QUARTER_BADGE[q.quarter]?.text || '#94A3B8',
                }}>{q.quarter}</span>
                <div style={{ flex: 1, height: '28px', background: '#F4F4F5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(q.count / maxQuarter) * 100}%`, height: '100%',
                    background: QUARTER_BADGE[q.quarter]?.bg || '#2563EB', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', paddingLeft: '8px',
                    color: '#FFFFFF', fontSize: '12px', fontWeight: 700,
                  }}>{q.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Theme + Priority */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', fontFamily: "'Sora', sans-serif" }}>Theme Distribution</div>
            {stats.byTheme.map(t => (
              <div key={t.theme} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '140px', fontSize: '12px', fontWeight: 600, color: '#334155', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.theme}</span>
                <div style={{ flex: 1, height: '20px', background: '#F4F4F5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(t.count / maxTheme) * 100}%`, height: '100%', background: '#2563EB', borderRadius: '4px' }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: '#334155', minWidth: '20px', textAlign: 'right' }}>{t.count}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', fontFamily: "'Sora', sans-serif" }}>Priority Distribution</div>
            {stats.byPriority.map(p => (
              <div key={p.priority} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '40px', fontSize: '12px', fontWeight: 700, color: '#334155', flexShrink: 0 }}>{p.priority}</span>
                <div style={{ flex: 1, height: '28px', background: '#F4F4F5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(p.count / maxPriority) * 100}%`, height: '100%',
                    background: '#64748B', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', paddingLeft: '8px',
                    color: '#FFFFFF', fontSize: '12px', fontWeight: 700,
                  }}>{p.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '8px' }}>{label}</div>
      <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color, letterSpacing: '-0.5px' }}>{value}</span>
    </div>
  );
}
