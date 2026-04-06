import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWikiDomainCards, useWikiRecentArticles } from '@/hooks/useWikiHub';
import { Factory, Ship, FlaskConical, Leaf, Landmark, Bot, HardHat, Globe, Pickaxe, ChevronRight, FileText, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';

const DOMAIN_ICONS: Record<string, React.ComponentType<any>> = {
  D1: Factory, D2: Ship, D3: FlaskConical, D4: Leaf, D5: Landmark, D6: Bot, D7: HardHat, D8: Globe, D9: Pickaxe,
};

export default function WikiDomainPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { data: domains } = useWikiDomainCards();
  const domain = (domains ?? []).find((d: any) => d.domain_code === code);
  const Icon = DOMAIN_ICONS[code || ''] || Globe;

  const { data: articles, isLoading } = useQuery({
    queryKey: ['wiki-domain-articles', code],
    enabled: !!code,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, domain_code, verification_status, ai_confidence, updated_at, format, tags')
        .eq('domain_code', code!)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div style={{ fontFamily: 'Geist, -apple-system, sans-serif', color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', background: isDark ? '#0A0A0A' : '#1A1A1A', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }} />
        <span onClick={() => navigate('/wiki/domains')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Domains</span>
        <ChevronRight size={12} style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }} />
        <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)', fontWeight: 600 }}>{domain?.name || code}</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{ width: 48, height: 48, borderRadius: 8, background: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(59,130,246,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={24} style={{ color: '#2563EB' }} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, margin: 0, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)' }}>{domain?.name || code}</h1>
          <p style={{ fontSize: 13, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)', margin: '4px 0 0' }}>{domain?.description || ''}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        {[{ l: 'Articles', v: domain?.article_count ?? 0 }, { l: 'Views', v: domain?.view_count ?? 0 }, { l: 'Coverage', v: `${domain?.coverage_percent ?? 0}%` }, { l: 'Gaps', v: domain?.knowledge_gaps ?? 0 }].map(s => (
          <div key={s.l} style={{ padding: '16px 24px', borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)' }}>{s.v}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', marginBottom: 16 }}>Articles in this domain</h2>
      <div style={{ borderRadius: 8, border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', background: isDark ? '#1A1A1A' : '#FFFFFF', overflow: 'hidden' }}>
        {isLoading ? <div style={{ padding: 32, textAlign: 'center', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', fontSize: 12 }}>Loading...</div> :
          (articles ?? []).length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', fontSize: 12 }}>No articles in this domain yet.</div> :
          (articles ?? []).map((a: any) => (
            <div key={a.id} onClick={() => navigate(`/wiki/${a.slug}`)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'background 80ms',
            }} onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(37,99,235,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <FileText size={14} style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)' }}>{a.title}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.40)' }}>
                {new Date(a.updated_at).toLocaleDateString()}
              </span>
              <ArrowRight size={12} style={{ color: isDark ? '#878787' : 'rgba(237,237,237,0.40)' }} />
            </div>
          ))}
      </div>
    </div>
  );
}
