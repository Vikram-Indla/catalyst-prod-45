/**
 * Ideas Analytics Page — /product/ideas/analytics
 * ALL data from useIdeaStats() — ZERO hardcoded numbers.
 * Fixes: AVG TIME shows "—" when 0 conversions. Funnel shows all 5 lifecycle stages in order.
 */
import React, { useMemo } from 'react';
import { useIdeaStats, useIdeasHub } from '@/hooks/useIdeasHub';
import { QUARTER_BADGE } from './ideation/ideation-data';

const MONO = "'JetBrains Mono', monospace";

const LIFECYCLE_ORDER = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Converted to Initiative'];

const STATUS_BAR_COLORS: Record<string, string> = {
  'Draft': '#DFE1E6',
  'Submitted': '#DFE1E6',
  'Under Review': '#DEEBFF',
  'Approved': '#DEEBFF',
  'Converted to Initiative': '#E3FCEF',
};
const STATUS_TEXT_COLORS: Record<string, string> = {
  'Draft': '#253858',
  'Submitted': '#253858',
  'Under Review': '#0747A6',
  'Approved': '#0747A6',
  'Converted to Initiative': '#006644',
};

export default function IdeasAnalyticsPage() {
  const { data: stats, isLoading } = useIdeaStats();
  const { data: allIdeas = [] } = useIdeasHub();

  // Compute avg time to convert
  const avgTimeToConvert = useMemo(() => {
    const converted = allIdeas.filter(i =>
      i.status === 'Converted to Initiative' && (i as any).converted_at && i.created_at
    );
    if (converted.length === 0) return null;
    const totalDays = converted.reduce((sum, i) => {
      const diff = new Date((i as any).converted_at).getTime() - new Date(i.created_at).getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(totalDays / converted.length);
  }, [allIdeas]);

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

  const convertedCount = stats.byStatus.find(s => s.status === 'Converted to Initiative')?.count || 0;
  const conversionRate = stats.total > 0 ? ((convertedCount / stats.total) * 100).toFixed(1) : '0.0';
  const pendingConversion = stats.byStatus.find(s => s.status === 'Approved')?.count || 0;

  // Build funnel in LIFECYCLE order with all 5 stages
  const funnelData = LIFECYCLE_ORDER.map(status => {
    const found = stats.byStatus.find(s => s.status === status);
    return { status, count: found?.count || 0 };
  });
  const maxFunnel = Math.max(...funnelData.map(s => s.count), 1);

  const maxTheme = Math.max(...stats.byTheme.map(t => t.count), 1);
  const maxQuarter = Math.max(...stats.byQuarter.map(q => q.count), 1);

  // Conversion by theme (top 4)
  const themeConvMap: Record<string, { total: number; converted: number }> = {};
  allIdeas.forEach(i => {
    if (!i.theme) return;
    if (!themeConvMap[i.theme]) themeConvMap[i.theme] = { total: 0, converted: 0 };
    themeConvMap[i.theme].total++;
    if (i.status === 'Converted to Initiative') themeConvMap[i.theme].converted++;
  });
  const convByTheme = Object.entries(themeConvMap)
    .map(([theme, d]) => ({ theme, ...d }))
    .sort((a, b) => b.converted - a.converted)
    .slice(0, 4);
  const maxConvTheme = Math.max(...convByTheme.map(t => t.total), 1);

  // Conversion by quarter
  const qConvMap: Record<string, { total: number; converted: number }> = {};
  allIdeas.forEach(i => {
    if (!i.roadmap_quarter) return;
    if (!qConvMap[i.roadmap_quarter]) qConvMap[i.roadmap_quarter] = { total: 0, converted: 0 };
    qConvMap[i.roadmap_quarter].total++;
    if (i.status === 'Converted to Initiative') qConvMap[i.roadmap_quarter].converted++;
  });
  const convByQuarter = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({
    quarter: q,
    total: qConvMap[q]?.total || 0,
    converted: qConvMap[q]?.converted || 0,
  }));
  const maxConvQ = Math.max(...convByQuarter.map(q => q.total), 1);

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>Ideas Analytics</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Comprehensive insights across the ideation pipeline</p>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Total Ideas" value={String(stats.total)} subtitle="in backlog pipeline" color="#0F172A" />
          <StatCard label="Conversion Rate" value={`${conversionRate}%`} subtitle={`${convertedCount} converted to initiatives`} color="#11853D" />
          <StatCard
            label="Avg Time to Convert"
            value={avgTimeToConvert !== null ? `${avgTimeToConvert}d` : '—'}
            subtitle={avgTimeToConvert !== null ? 'from created to converted' : 'no conversions yet'}
            color="#0F172A"
          />
          <StatCard label="Pending Conversion" value={String(pendingConversion)} subtitle="approved, awaiting conversion" color="#2563EB" />
        </div>

        {/* Row 1: Conversion Funnel + Quarter Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', fontFamily: "'Sora', sans-serif" }}>Conversion Funnel</div>
            {funnelData.map(s => {
              const label = s.status === 'Converted to Initiative' ? 'Converted' : s.status;
              const isConv = s.status === 'Converted to Initiative';
              return (
                <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '100px', fontSize: '12px', fontWeight: isConv ? 700 : 600, color: '#334155', flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: '28px', background: '#F4F4F5', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max((s.count / maxFunnel) * 100, s.count > 0 ? 8 : 0)}%`, height: '100%',
                      background: STATUS_BAR_COLORS[s.status] || '#DFE1E6', borderRadius: '4px',
                      display: 'flex', alignItems: 'center', paddingLeft: '8px',
                      color: STATUS_TEXT_COLORS[s.status] || '#253858', fontSize: '12px', fontWeight: 700,
                      minWidth: s.count > 0 ? '32px' : undefined,
                    }}>{s.count}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', padding: '20px' }}>
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

        {/* Row 2: Conversion by Theme + Conversion by Quarter */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', fontFamily: "'Sora', sans-serif" }}>Conversion by Theme</div>
            {convByTheme.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '13px' }}>No conversion data</div>
            ) : convByTheme.map(t => (
              <div key={t.theme} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '140px', fontSize: '12px', fontWeight: 600, color: '#334155', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.theme}</span>
                <div style={{ flex: 1, height: '20px', background: '#F4F4F5', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${(t.total / maxConvTheme) * 100}%`, height: '100%', background: '#DEEBFF', borderRadius: '4px' }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, width: `${(t.converted / maxConvTheme) * 100}%`, height: '100%', background: '#E3FCEF', borderRadius: '4px' }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: '#11853D', minWidth: '40px', textAlign: 'right' }}>{t.converted}/{t.total}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', fontFamily: "'Sora', sans-serif" }}>Conversion by Quarter</div>
            {convByQuarter.map(q => (
              <div key={q.quarter} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  width: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  height: 20, borderRadius: 3, fontSize: '10px', fontWeight: 700,
                  background: QUARTER_BADGE[q.quarter]?.bg || '#E2E8F0',
                  color: QUARTER_BADGE[q.quarter]?.text || '#94A3B8',
                }}>{q.quarter}</span>
                <div style={{ flex: 1, height: '28px', background: '#F4F4F5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${q.total > 0 ? (q.total / maxConvQ) * 100 : 0}%`, height: '100%',
                    background: QUARTER_BADGE[q.quarter]?.bg || '#2563EB', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', paddingLeft: '8px',
                    color: '#FFFFFF', fontSize: '12px', fontWeight: 700,
                  }}>{q.converted} <span style={{ fontWeight: 500, opacity: 0.8, marginLeft: 4 }}>of {q.total}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, color }: { label: string; value: string; subtitle: string; color: string }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', padding: '20px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '8px' }}>{label}</div>
      <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color, letterSpacing: '-0.5px' }}>{value}</span>
      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{subtitle}</div>
    </div>
  );
}
