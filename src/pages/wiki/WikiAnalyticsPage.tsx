import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiHomeStats } from '@/hooks/useWikiHub';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, BarChart3 } from 'lucide-react';

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

  const statCards = stats ? [
    { label: 'Total Articles', value: stats.totalArticles },
    { label: 'Documents', value: stats.totalDocuments },
    { label: 'Verified %', value: `${stats.verifiedPercent}%` },
    { label: 'Needs Review', value: stats.needsReview },
    { label: 'Stale Articles', value: stats.staleArticles },
    { label: 'Open Requests', value: stats.openRequests },
    { label: 'Avg Helpfulness', value: `${stats.avgHelpfulness}%` },
    { label: 'Avg Confidence', value: `${stats.avgConfidence}%` },
  ] : [];

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#0F172A', background: '#F8FAFC', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: '#94A3B8' }} />
        <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Analytics</span>
      </nav>

      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 24 }}>WikiHub Analytics</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {isLoading ? Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ padding: 20, borderRadius: 8, background: '#FFFFFF', border: '0.75px solid rgba(0,0,0,0.06)', height: 80 }} />
        )) : statCards.map(s => (
          <div key={s.label} style={{ padding: 20, borderRadius: 8, background: '#FFFFFF', border: '0.75px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: '#0F172A' }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#94A3B8', marginTop: 4, letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Most Viewed Articles</h2>
      <div style={{ borderRadius: 8, border: '0.75px solid rgba(0,0,0,0.06)', background: '#FFFFFF', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px',
          background: '#F1F5F9', padding: '0 16px', height: 36, alignItems: 'center',
          fontFamily: 'Sora, sans-serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, color: '#64748B', letterSpacing: '0.05em',
          borderBottom: '0.75px solid rgba(0,0,0,0.06)',
        }}>
          <span>Article</span><span>Domain</span><span>Views</span><span>Helpful</span><span>Confidence</span>
        </div>
        {(topArticles ?? []).map((a: any) => {
          const conf = Math.round((a.ai_confidence ?? 0) * 100);
          const confColor = conf >= 90 ? '#16A34A' : conf >= 70 ? '#2563EB' : '#D97706';
          return (
            <div key={a.id} onClick={() => navigate(`/wiki/${a.slug}`)} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px',
              padding: '0 16px', height: 36, alignItems: 'center', borderBottom: '0.75px solid rgba(0,0,0,0.06)', fontSize: 12, cursor: 'pointer',
            }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
              <span style={{ fontSize: 10, color: '#64748B' }}>{a.domain_code}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{a.view_count}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748B' }}>{Math.round(a.helpfulness_score ?? 0)}%</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: confColor }}>{conf}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
