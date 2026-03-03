import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function WikiAllArticlesPage() {
  const navigate = useNavigate();

  const { data: articles, isLoading } = useQuery({
    queryKey: ['wiki-all-articles'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, domain_code, status, verification_status, format, ai_confidence, helpfulness_score, tags, version, updated_at, view_count')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#0F172A', background: '#F8FAFC', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: '#94A3B8' }} />
        <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>All Articles</span>
      </nav>

      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 24 }}>All Articles</h1>

      <div style={{ borderRadius: 8, border: '0.75px solid rgba(0,0,0,0.06)', background: '#FFFFFF', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '3% 1fr 80px 100px 80px 80px 100px 50px',
          background: '#F1F5F9', padding: '0 12px', height: 36, alignItems: 'center',
          fontFamily: 'Sora, sans-serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, color: '#64748B', letterSpacing: '0.05em',
          borderBottom: '0.75px solid rgba(0,0,0,0.06)',
        }}>
          <span></span><span>Article</span><span>Domain</span><span>Verification</span><span>Confidence</span><span>Views</span><span>Updated</span><span>Ver.</span>
        </div>
        {isLoading ? <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 12 }}>Loading...</div> :
          (articles ?? []).length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 12 }}>No articles found.</div> :
          (articles ?? []).map((a: any) => {
            const conf = Math.round((a.ai_confidence ?? 0) * 100);
            const confColor = conf >= 90 ? '#16A34A' : conf >= 70 ? '#2563EB' : '#D97706';
            const verStatus = a.verification_status || 'unverified';
            const verBadge = verStatus === 'verified' ? { bg: 'rgba(22,163,74,0.08)', color: '#16A34A', label: 'Verified' }
              : verStatus === 'needs_review' ? { bg: 'rgba(217,119,6,0.08)', color: '#D97706', label: 'Review' }
              : { bg: 'rgba(100,116,139,0.08)', color: '#64748B', label: 'Unverified' };
            return (
              <div key={a.id} onClick={() => navigate(`/wiki/${a.slug}`)} style={{
                display: 'grid', gridTemplateColumns: '3% 1fr 80px 100px 80px 80px 100px 50px',
                padding: '0 12px', height: 42, alignItems: 'center', cursor: 'pointer',
                borderBottom: '0.75px solid rgba(0,0,0,0.06)', fontSize: 12, transition: 'background 80ms',
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span>{a.format === 'pdf' ? <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 2, background: '#FEE2E2', color: '#DC2626' }}>PDF</span> : <FileText size={14} style={{ color: '#94A3B8' }} />}</span>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                <span style={{ fontSize: 10, color: '#64748B' }}>{a.domain_code}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: verBadge.bg, color: verBadge.color, width: 'fit-content' }}>{verBadge.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, color: confColor }}>{conf}%</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748B' }}>{a.view_count ?? 0}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#64748B' }}>{new Date(a.updated_at).toLocaleDateString()}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#64748B' }}>v{a.version ?? 1}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
