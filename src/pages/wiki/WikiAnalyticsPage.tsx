import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiHomeStats } from '@/hooks/useWikiHub';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DOMAIN_COLORS: Record<string, string> = {
  D1: 'var(--ds-text-brand, #2563EB)', D2: '#0D9488', D3: 'var(--ds-text-warning, #D97706)', D4: 'var(--ds-text-success, #16A34A)',
  D5: 'var(--ds-text-danger, #DC2626)', D6: '#0891B2', D7: 'var(--ds-text-subtlest, #64748B)', D8: '#4F46E5', D9: '#CA8A04',
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
        { name: 'Verified', value: counts.verified, fill: 'var(--ds-text-success, #16A34A)' },
        { name: 'Needs Review', value: counts.needs_review, fill: 'var(--ds-text-warning, #D97706)' },
        { name: 'Unverified', value: counts.unverified, fill: 'var(--ds-text-subtlest, #94A3B8)' },
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
  const F = { sora: "'Sora', sans-serif", mono: "'JetBrains Mono', monospace" };
  const border = isDark ? 'var(--ds-border, #2E2E2E)' : 'rgba(0,0,0,0.06)';

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--ds-text, #0F172A)', background: isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--ds-surface-sunken, #F8FAFC)', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: 'var(--ds-text-brand, #2563EB)', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--ds-text-subtlest, #94A3B8)' }} />
        <span style={{ fontSize: 13, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtlest, #64748B)', fontWeight: 600 }}>Analytics</span>
      </nav>

      <h1 style={{ fontFamily: F.sora, fontSize: 18, fontWeight: 700, marginBottom: 24 }}>WikiHub Analytics</h1>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {isLoading ? Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ padding: 20, borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', border: `0.75px solid ${border}`, height: 80 }} />
        )) : statCards.map(s => (
          <div key={s.label} style={{ padding: 20, borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', border: `0.75px solid ${border}`, textAlign: 'center' }}>
            <div style={{ fontFamily: F.sora, fontSize: 24, fontWeight: 700, color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--ds-text, #0F172A)' }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--ds-text-subtlest, #94A3B8)', marginTop: 4, letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        {/* Articles per Domain */}
        <div style={{ padding: 20, borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', border: `0.75px solid ${border}` }}>
          <h2 style={{ fontFamily: F.sora, fontSize: 14, fontWeight: 600, marginBottom: 16, margin: '0 0 16px' }}>Articles per Domain</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={domainDistribution ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={border} />
              <XAxis dataKey="domain" tick={{ fontSize: 10, fill: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtlest, #64748B)' }} />
              <YAxis tick={{ fontSize: 10, fill: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtlest, #64748B)' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${isDark ? 'var(--ds-border, #2E2E2E)' : 'var(--ds-border, #E2E8F0)'}`, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', color: isDark ? 'var(--ds-text, #EDEDED)' : undefined }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {(domainDistribution ?? []).map((d: any) => (
                  <Cell key={d.domain} fill={DOMAIN_COLORS[d.domain] || 'var(--ds-text-subtlest, #64748B)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Verification Status Pie */}
        <div style={{ padding: 20, borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', border: `0.75px solid ${border}` }}>
          <h2 style={{ fontFamily: F.sora, fontSize: 14, fontWeight: 600, marginBottom: 16, margin: '0 0 16px' }}>Verification Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={verificationPie ?? []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {(verificationPie ?? []).map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', color: isDark ? 'var(--ds-text, #EDEDED)' : undefined, border: `1px solid ${isDark ? 'var(--ds-border, #2E2E2E)' : 'var(--ds-border, #E2E8F0)'}` }} />
              <Legend wrapperStyle={{ fontSize: 11, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : undefined }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most Viewed + Least Helpful */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Most Viewed */}
        <div>
          <h2 style={{ fontFamily: F.sora, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Most Viewed Articles</h2>
          <div style={{ borderRadius: 8, border: `0.75px solid ${border}`, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px',
              background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface-sunken, #F1F5F9)', padding: '0 14px', height: 32, alignItems: 'center',
              fontFamily: F.sora, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
              color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--ds-text-subtlest, #64748B)', letterSpacing: '0.05em', borderBottom: `0.75px solid ${border}`,
            }}>
              <span>Article</span><span>Views</span><span>Help.</span><span>Conf.</span>
            </div>
            {(topArticles ?? []).map((a: any) => {
              const conf = Math.round((a.ai_confidence ?? 0) * 100);
              const confColor = conf >= 90 ? 'var(--ds-text-success, #16A34A)' : conf >= 70 ? 'var(--ds-text-brand, #2563EB)' : 'var(--ds-text-warning, #D97706)';
              return (
                <div key={a.id} onClick={() => navigate(`/wiki/${a.slug}`)} style={{
                  display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px',
                  padding: '0 14px', height: 50, alignItems: 'center', borderBottom: `0.75px solid ${border}`,
                  fontSize: 12, cursor: 'pointer', transition: 'background 80ms',
                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.04)'}
                   onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11 }}>{a.view_count ?? 0}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtlest, #64748B)' }}>{Math.round(a.helpfulness_score ?? 0)}%</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: confColor }}>{conf}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Least Helpful */}
        <div>
          <h2 style={{ fontFamily: F.sora, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Least Helpful Articles</h2>
          <div style={{ borderRadius: 8, border: `0.75px solid ${border}`, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 60px 60px',
              background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface-sunken, #F1F5F9)', padding: '0 14px', height: 32, alignItems: 'center',
              fontFamily: F.sora, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
              color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--ds-text-subtlest, #64748B)', letterSpacing: '0.05em', borderBottom: `0.75px solid ${border}`,
            }}>
              <span>Article</span><span>Help.</span><span>Votes</span>
            </div>
            {(leastHelpful ?? []).length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--ds-text-subtlest, #94A3B8)', fontSize: 12 }}>No feedback data yet</div>
            ) : (leastHelpful ?? []).map((a: any) => (
              <div key={a.id} onClick={() => navigate(`/wiki/${a.slug}`)} style={{
                display: 'grid', gridTemplateColumns: '1fr 60px 60px',
                padding: '0 14px', height: 50, alignItems: 'center', borderBottom: `0.75px solid ${border}`,
                fontSize: 12, cursor: 'pointer', transition: 'background 80ms',
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.04)'}
                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: 'var(--ds-text-danger, #DC2626)' }}>{Math.round(a.helpfulness_score ?? 0)}%</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtlest, #64748B)' }}>{a.helpfulness_votes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
