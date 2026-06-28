import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiHomeStats } from '@/hooks/useWikiHub';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight } from '@/lib/atlaskit-icons';
import { useTheme } from '@/hooks/useTheme';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DOMAIN_COLORS: Record<string, string> = {
  D1: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', D2: 'var(--cp-teal-60, var(--ds-chart-teal-bold))', D3: 'var(--ds-text-warning, var(--cp-warning))', D4: 'var(--ds-text-success, var(--cp-success))',
  D5: 'var(--ds-text-danger, var(--cp-danger))', D6: 'var(--ds-link)', D7: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', D8: 'var(--ds-background-discovery-bold)', D9: 'var(--ds-text-warning)',
};

export default function WikiAnalyticsPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useWikiHomeStats();

  const { data: topArticles } = useQuery({
    queryKey: ['wiki-top-articles'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, domain_code, view_count, helpfulness_score, ai_confidence')
        .is('deleted_at', null)
        .order('view_count', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: leastHelpful } = useQuery({
    queryKey: ['wiki-least-helpful'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, domain_code, helpfulness_score, helpfulness_votes')
        .is('deleted_at', null)
        .gt('helpfulness_votes', 0)
        .order('helpfulness_score', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Articles per domain for bar chart
  const { data: domainDistribution } = useQuery({
    queryKey: ['wiki-domain-distribution'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('domain_code')
        .is('deleted_at', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((a: any) => { counts[a.domain_code] = (counts[a.domain_code] || 0) + 1; });
      return Object.entries(counts).map(([code, count]) => ({ domain: code, count }));
    },
  });

  // Verification status for pie
  const { data: verificationPie } = useQuery({
    queryKey: ['wiki-verification-pie'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('verification_status')
        .is('deleted_at', null);
      if (error) throw error;
      const counts: Record<string, number> = { verified: 0, needs_review: 0, unverified: 0 };
      (data ?? []).forEach((a: any) => { counts[a.verification_status || 'unverified']++; });
      return [
        { name: 'Verified', value: counts.verified, fill: 'var(--ds-text-success, var(--cp-success))' },
        { name: 'Needs Review', value: counts.needs_review, fill: 'var(--ds-text-warning, var(--cp-warning))' },
        { name: 'Unverified', value: counts.unverified, fill: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' },
      ];
    },
  });

  const statCards = stats ? [
    { label: 'Total Articles', value: stats.totalArticles },
    { label: 'Total Views', value: (topArticles ?? []).reduce((s: number, a: any) => s + (a.view_count ?? 0), 0) },
    { label: 'Avg Helpfulness', value: `${stats.avgHelpfulness}%` },
    { label: 'Avg Confidence', value: `${stats.avgConfidence}%` },
    { label: 'Verified %', value: `${stats.verifiedPercent}%` },
    { label: 'Needs Review', value: stats.needsReview },
    { label: 'Stale Articles', value: stats.staleArticles },
    { label: 'Documents', value: stats.totalDocuments },
  ] : [];

  const { isDark } = useTheme();
  // Font tokens removed — using ADS tokens instead
  // sora → var(--ds-font-family-body)
  // mono → var(--ds-font-family-code)
  const border = isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-raised, rgba(0,0,0,0.06))';

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', background: isDark ? 'var(--cp-bg-page, var(--ds-surface))' : 'var(--ds-surface-sunken)', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontWeight: 600 }}>Analytics</span>
      </nav>

      <h1 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-600)', fontWeight: 700, marginBottom: 24 }}>WikiHub Analytics</h1>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {isLoading ? Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ padding: 16, borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', border: `0.75px solid ${border}`, height: 80 }} />
        )) : statCards.map(s => (
          <div key={s.label} style={{ padding: 16, borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', border: `0.75px solid ${border}`, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))' }}>{s.value}</div>
            <div style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 600, textTransform: 'uppercase', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', marginTop: 4, letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {/* Articles per Domain */}
        <div style={{ padding: 16, borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', border: `0.75px solid ${border}` }}>
          <h2 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, marginBottom: 16, margin: '0 0 16px' }}>Articles per Domain</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={domainDistribution ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={border} />
              <XAxis dataKey="domain" tick={{ fontSize: 'var(--ds-font-size-50)', fill: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }} />
              <YAxis tick={{ fontSize: 'var(--ds-font-size-50)', fill: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }} />
              <Tooltip contentStyle={{ fontSize: 'var(--ds-font-size-200)', borderRadius: 6, border: `1px solid ${isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))'}`, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : undefined }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {(domainDistribution ?? []).map((d: any) => (
                  <Cell key={d.domain} fill={DOMAIN_COLORS[d.domain] || 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Verification Status Pie */}
        <div style={{ padding: 16, borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', border: `0.75px solid ${border}` }}>
          <h2 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, marginBottom: 16, margin: '0 0 16px' }}>Verification Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={verificationPie ?? []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {(verificationPie ?? []).map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 'var(--ds-font-size-200)', borderRadius: 6, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : undefined, border: `1px solid ${isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))'}` }} />
              <Legend wrapperStyle={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : undefined }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most Viewed + Least Helpful */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Most Viewed */}
        <div>
          <h2 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, marginBottom: 12 }}>Most Viewed Articles</h2>
          <div style={{ borderRadius: 8, border: `0.75px solid ${border}`, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px',
              background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', padding: '0 14px', height: 32, alignItems: 'center',
              fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-50)', fontWeight: 600, textTransform: 'uppercase' as const,
              color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', letterSpacing: '0.05em', borderBottom: `0.75px solid ${border}`,
            }}>
              <span>Article</span><span>Views</span><span>Help.</span><span>Conf.</span>
            </div>
            {(topArticles ?? []).map((a: any) => {
              const conf = Math.round((a.ai_confidence ?? 0) * 100);
              const confColor = conf >= 90 ? 'var(--ds-text-success, var(--cp-success))' : conf >= 70 ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--ds-text-warning, var(--cp-warning))';
              return (
                <div key={a.id} onClick={() => navigate(`/wiki/${a.slug}`)} style={{
                  display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px',
                  padding: '0 14px', height: 50, alignItems: 'center', borderBottom: `0.75px solid ${border}`,
                  fontSize: 'var(--ds-font-size-200)', cursor: 'pointer', transition: 'background 80ms',
                }} onMouseEnter={e => e.currentTarget.style.background = 'var(--ds-background-information, rgba(37,99,235,0.04))'}
                   onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 'var(--ds-font-size-100)' }}>{a.view_count ?? 0}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{Math.round(a.helpfulness_score ?? 0)}%</span>
                  <span style={{ fontFamily: F.mono, fontSize: 'var(--ds-font-size-100)', color: confColor }}>{conf}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Least Helpful */}
        <div>
          <h2 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, marginBottom: 12 }}>Least Helpful Articles</h2>
          <div style={{ borderRadius: 8, border: `0.75px solid ${border}`, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 60px 60px',
              background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', padding: '0 14px', height: 32, alignItems: 'center',
              fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-50)', fontWeight: 600, textTransform: 'uppercase' as const,
              color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', letterSpacing: '0.05em', borderBottom: `0.75px solid ${border}`,
            }}>
              <span>Article</span><span>Help.</span><span>Votes</span>
            </div>
            {(leastHelpful ?? []).length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', fontSize: 'var(--ds-font-size-200)' }}>No feedback data yet</div>
            ) : (leastHelpful ?? []).map((a: any) => (
              <div key={a.id} onClick={() => navigate(`/wiki/${a.slug}`)} style={{
                display: 'grid', gridTemplateColumns: '1fr 60px 60px',
                padding: '0 14px', height: 50, alignItems: 'center', borderBottom: `0.75px solid ${border}`,
                fontSize: 'var(--ds-font-size-200)', cursor: 'pointer', transition: 'background 80ms',
              }} onMouseEnter={e => e.currentTarget.style.background = 'var(--ds-background-information, rgba(37,99,235,0.04))'}
                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                <span style={{ fontFamily: F.mono, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger, var(--cp-danger))' }}>{Math.round(a.helpfulness_score ?? 0)}%</span>
                <span style={{ fontFamily: F.mono, fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{a.helpfulness_votes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
