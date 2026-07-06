/**
 * Ideas Analytics Page — /product/ideas/analytics
 * Dark mode support via useTheme + DK/LK tokens.
 */
import React, { useMemo } from 'react';
import { useIdeaStats, useIdeasHub } from '@/hooks/useIdeasHub';
import { QUARTER_BADGE } from '../../modules-dormant/ideation/ideation-data';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';

const MONO = "'JetBrains Mono', monospace";
const LIFECYCLE_ORDER = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Converted to Request'];

const STATUS_BAR_COLORS: Record<string, string> = {
  'Draft': 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', 'Submitted': 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', 'Under Review': 'var(--ds-link)', 'Approved': 'var(--ds-link)', 'Converted to Request': 'var(--cp-lozenge-green-bg)',
};
const STATUS_TEXT_COLORS: Record<string, string> = {
  'Draft': 'var(--ds-text-subtle)', 'Submitted': 'var(--ds-text-subtle)', 'Under Review': 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', 'Approved': 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', 'Converted to Request': 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
};
const STATUS_BAR_COLORS_DARK: Record<string, string> = {
  'Draft': 'var(--ds-border, var(--cp-ink-1))', 'Submitted': 'var(--ds-border, var(--cp-ink-1))', 'Under Review': 'var(--ds-background-information-bold, rgba(59,130,246,0.15))',
  'Approved': 'var(--ds-background-information-bold, rgba(59,130,246,0.15))', 'Converted to Request': 'var(--ds-background-success-bold, rgba(22,163,74,0.15))',
};
const STATUS_TEXT_COLORS_DARK: Record<string, string> = {
  'Draft': 'var(--ds-surface, rgba(255,255,255,0.72))', 'Submitted': 'var(--ds-surface, rgba(255,255,255,0.72))', 'Under Review': 'var(--ds-background-information-bold, var(--ds-link))',
  'Approved': 'var(--ds-background-information-bold)', 'Converted to Request': 'var(--ds-background-success)',
};

export default function IdeasAnalyticsPage() {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  const { data: stats, isLoading } = useIdeaStats();
  const { data: allIdeas = [] } = useIdeasHub();

  const avgTimeToConvert = useMemo(() => {
    const converted = allIdeas.filter(i => i.status === 'Converted to Request' && (i as any).converted_at && i.created_at);
    if (converted.length === 0) return null;
    const totalDays = converted.reduce((sum, i) => {
      const diff = new Date((i as any).converted_at).getTime() - new Date(i.created_at).getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(totalDays / converted.length);
  }, [allIdeas]);

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col h-full" style={{ background: dk.pageBg }}>
        <div style={{ padding: '16px 28px 16px', borderBottom: `1px solid ${dk.border}` }}>
          <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: dk.t1, margin: 0, fontFamily: 'var(--cp-font-heading)' }}>Ideas Analytics</h1>
        </div>
        <div style={{ padding: '48px', textAlign: 'center', color: dk.t3 }}>Loading analytics...</div>
      </div>
    );
  }

  const convertedCount = stats.byStatus.find(s => s.status === 'Converted to Request')?.count || 0;
  const conversionRate = stats.total > 0 ? ((convertedCount / stats.total) * 100).toFixed(1) : '0.0';
  const pendingConversion = stats.byStatus.find(s => s.status === 'Approved')?.count || 0;

  const funnelData = LIFECYCLE_ORDER.map(status => {
    const found = stats.byStatus.find(s => s.status === status);
    return { status, count: found?.count || 0 };
  });
  const maxFunnel = Math.max(...funnelData.map(s => s.count), 1);
  const maxQuarter = Math.max(...stats.byQuarter.map(q => q.count), 1);

  const { convByTheme, maxConvTheme, convByQuarter } = useMemo(() => {
    const themeConvMap: Record<string, { total: number; converted: number }> = {};
    const qConvMap: Record<string, { total: number; converted: number }> = {};
    allIdeas.forEach(i => {
      if (i.theme) {
        if (!themeConvMap[i.theme]) themeConvMap[i.theme] = { total: 0, converted: 0 };
        themeConvMap[i.theme].total++;
        if (i.status === 'Converted to Request') themeConvMap[i.theme].converted++;
      }
      if (i.roadmap_quarter) {
        if (!qConvMap[i.roadmap_quarter]) qConvMap[i.roadmap_quarter] = { total: 0, converted: 0 };
        qConvMap[i.roadmap_quarter].total++;
        if (i.status === 'Converted to Request') qConvMap[i.roadmap_quarter].converted++;
      }
    });
    const cbt = Object.entries(themeConvMap).map(([theme, d]) => ({ theme, ...d })).sort((a, b) => b.converted - a.converted).slice(0, 4);
    return {
      convByTheme: cbt,
      maxConvTheme: Math.max(...cbt.map(t => t.total), 1),
      convByQuarter: ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({ quarter: q, total: qConvMap[q]?.total || 0, converted: qConvMap[q]?.converted || 0 })),
    };
  }, [allIdeas]);
  const maxConvQ = Math.max(...convByQuarter.map(q => q.total), 1);

  const barTrack = 'var(--cp-bg-sunken)';
  const containerBg = 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))';
  const containerBorder = `1px solid ${isDark ? 'var(--ds-border-bold)' : dk.border}`;

  return (
    <div className="flex flex-col h-full" style={{ background: dk.pageBg }}>
      <div style={{ padding: '16px 28px 16px', borderBottom: `1px solid ${dk.border}` }}>
        <div>
          <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: dk.t1, margin: 0, fontFamily: 'var(--cp-font-heading)' }}>Ideas Analytics</h1>
          <p style={{ fontSize: 'var(--ds-font-size-300)', color: dk.t3, margin: '4px 0 0' }}>Comprehensive insights across the ideation pipeline</p>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Total Ideas" value={String(stats.total)} subtitle="in backlog pipeline" color={dk.t1} isDark={isDark} dk={dk} />
          <StatCard label="Conversion Rate" value={`${conversionRate}%`} subtitle={`${convertedCount} converted to requests`} color={dk.greenText} isDark={isDark} dk={dk} />
          <StatCard label="Avg Time to Convert" value={avgTimeToConvert !== null ? `${avgTimeToConvert}d` : '—'} subtitle={avgTimeToConvert !== null ? 'from created to converted' : 'no conversions yet'} color={dk.t1} isDark={isDark} dk={dk} />
          <StatCard label="Pending Conversion" value={String(pendingConversion)} subtitle="approved, awaiting conversion" color="var(--ds-text-brand, var(--cp-workstream-catalyst-primary))" isDark={isDark} dk={dk} />
        </div>

        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: containerBg, border: containerBorder, borderRadius: '6px', padding: '16px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: dk.t1, marginBottom: '16px', fontFamily: 'var(--cp-font-heading)' }}>Conversion Funnel</div>
            {funnelData.map(s => {
              const label = s.status === 'Converted to Request' ? 'Converted' : s.status;
              const isConv = s.status === 'Converted to Request';
              return (
                <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '100px', fontSize: 'var(--ds-font-size-200)', fontWeight: isConv ? 700 : 600, color: dk.t2, flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: '28px', background: barTrack, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max((s.count / maxFunnel) * 100, s.count > 0 ? 8 : 0)}%`, height: '100%',
                      background: isDark ? (STATUS_BAR_COLORS_DARK[s.status] || 'var(--ds-border, var(--cp-ink-1))') : (STATUS_BAR_COLORS[s.status] || 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))'),
                      borderRadius: '4px', display: 'flex', alignItems: 'center', paddingLeft: '8px',
                      color: isDark ? (STATUS_TEXT_COLORS_DARK[s.status] || dk.t2) : (STATUS_TEXT_COLORS[s.status] || 'var(--ds-text-subtle, var(--ds-text-subtle))'),
                      fontSize: 'var(--ds-font-size-200)', fontWeight: 700, minWidth: s.count > 0 ? '32px' : undefined,
                    }}>{s.count}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: containerBg, border: containerBorder, borderRadius: '6px', padding: '16px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: dk.t1, marginBottom: '16px', fontFamily: 'var(--cp-font-heading)' }}>Quarter Distribution</div>
            {stats.byQuarter.length === 0 ? (
              <div style={{ color: dk.t3, fontSize: 'var(--ds-font-size-300)' }}>No ideas assigned to quarters</div>
            ) : stats.byQuarter.map(q => (
              <div key={q.quarter} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 20, borderRadius: 4, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, background: QUARTER_BADGE[q.quarter]?.bg || 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))', color: QUARTER_BADGE[q.quarter]?.text || 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>{q.quarter}</span>
                <div style={{ flex: 1, height: '28px', background: barTrack, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(q.count / maxQuarter) * 100}%`, height: '100%', background: QUARTER_BADGE[q.quarter]?.bg || 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', borderRadius: '4px', display: 'flex', alignItems: 'center', paddingLeft: '8px', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', fontSize: 'var(--ds-font-size-200)', fontWeight: 700 }}>{q.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: containerBg, border: containerBorder, borderRadius: '6px', padding: '16px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: dk.t1, marginBottom: '16px', fontFamily: 'var(--cp-font-heading)' }}>Conversion by Theme</div>
            {convByTheme.length === 0 ? (
              <div style={{ color: dk.t3, fontSize: 'var(--ds-font-size-300)' }}>No conversion data</div>
            ) : convByTheme.map(t => (
              <div key={t.theme} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ width: '140px', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: dk.t2, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.theme}</span>
                <div style={{ flex: 1, height: '20px', background: barTrack, borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${(t.total / maxConvTheme) * 100}%`, height: '100%', background: isDark ? 'var(--ds-background-information-bold, rgba(59,130,246,0.15))' : 'var(--ds-link, var(--ds-link))', borderRadius: '4px' }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, width: `${(t.converted / maxConvTheme) * 100}%`, height: '100%', background: 'var(--cp-success, var(--cp-lozenge-green-bg))', borderRadius: '4px' }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: dk.greenText, minWidth: '40px', textAlign: 'right' }}>{t.converted}/{t.total}</span>
              </div>
            ))}
          </div>

          <div style={{ background: containerBg, border: containerBorder, borderRadius: '6px', padding: '16px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: dk.t1, marginBottom: '16px', fontFamily: 'var(--cp-font-heading)' }}>Conversion by Quarter</div>
            {convByQuarter.map(q => (
              <div key={q.quarter} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 20, borderRadius: 4, fontSize: 'var(--ds-font-size-50)', fontWeight: 700, background: QUARTER_BADGE[q.quarter]?.bg || 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))', color: QUARTER_BADGE[q.quarter]?.text || 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>{q.quarter}</span>
                <div style={{ flex: 1, height: '28px', background: barTrack, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${q.total > 0 ? (q.total / maxConvQ) * 100 : 0}%`, height: '100%', background: QUARTER_BADGE[q.quarter]?.bg || 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', borderRadius: '4px', display: 'flex', alignItems: 'center', paddingLeft: '8px', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', fontSize: 'var(--ds-font-size-200)', fontWeight: 700 }}>{q.converted} <span style={{ fontWeight: 500, opacity: 0.8, marginLeft: 4 }}>of {q.total}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, color, isDark, dk }: { label: string; value: string; subtitle: string; color: string; isDark: boolean; dk: typeof DK }) {
  return (
    <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: `1px solid ${isDark ? 'var(--ds-border-bold)' : dk.border}`, borderRadius: '6px', padding: '16px' }}>
      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t3, marginBottom: '8px' }}>{label}</div>
      {/* ADS heading font for hero numerals (was legacy --cp-font-mono, which
        * rendered slashed-zero terminal digits unlike every other hub KPI). */}
      <span style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--ds-font-family-heading)', fontVariantNumeric: 'tabular-nums', color }}>{value}</span>
      <div style={{ fontSize: 'var(--ds-font-size-200)', color: dk.t3, marginTop: '4px' }}>{subtitle}</div>
    </div>
  );
}
