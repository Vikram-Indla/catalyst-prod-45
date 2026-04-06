import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiDomainCards } from '@/hooks/useWikiHub';
import { useTheme } from '@/hooks/useTheme';
import { Factory, Ship, FlaskConical, Leaf, Landmark, Bot, HardHat, Globe, Pickaxe, ChevronRight } from 'lucide-react';

const DOMAIN_ICONS: Record<string, React.ComponentType<any>> = {
  D1: Factory, D2: Ship, D3: FlaskConical, D4: Leaf, D5: Landmark, D6: Bot, D7: HardHat, D8: Globe, D9: Pickaxe,
};
const TAG_STYLES: Record<string, { bg: string; darkBg: string; color: string; darkColor: string }> = {
  CORE: { bg: '#DBEAFE', darkBg: 'rgba(59,130,246,0.12)', color: '#7DB8FC', darkColor: '#93C5FD' },
  REGULATORY: { bg: 'rgba(251,191,36,0.10)', darkBg: 'rgba(251,191,36,0.12)', color: '#FBBF24', darkColor: '#FCD34D' },
  SUPPORT: { bg: '#E0E7FF', darkBg: 'rgba(99,102,241,0.12)', color: '#3730A3', darkColor: '#A5B4FC' },
};

export default function WikiDomainsListPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { data: domains, isLoading } = useWikiDomainCards();

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: isDark ? '#EDEDED' : '#0F172A', background: isDark ? '#0A0A0A' : '#F8FAFC', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
        <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 600 }}>All Domains</span>
      </nav>

      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 24 }}>All 9 Domains</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {isLoading ? Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ padding: 20, borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', height: 120 }} />
        )) : (domains ?? []).map((d: any) => {
          const Icon = DOMAIN_ICONS[d.domain_code] || Globe;
          const tagRaw = TAG_STYLES[d.tag] || TAG_STYLES.SUPPORT;
          const tagStyle = { bg: isDark ? tagRaw.darkBg : tagRaw.bg, color: isDark ? tagRaw.darkColor : tagRaw.color };
          const coverageColor = d.coverage_percent >= 80 ? '#16A34A' : d.coverage_percent >= 60 ? '#2563EB' : '#D97706';
          return (
            <div key={d.domain_code} onClick={() => navigate(`/wiki/domains/${d.domain_code}`)} style={{
              padding: 20, borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '0.75px solid rgba(255,255,255,0.08)' : '0.75px solid rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'border-color 120ms',
            }} onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'} onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: isDark ? '#1A1A1A' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} style={{ color: isDark ? '#A1A1A1' : '#64748B' }} />
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: isDark ? '#A1A1A1' : '#64748B', background: isDark ? '#1A1A1A' : '#F1F5F9', padding: '1px 5px', borderRadius: 3 }}>{d.domain_code}</span>
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: tagStyle.bg, color: tagStyle.color }}>{d.tag}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B' }}>
                <span>{d.article_count} articles</span>
                <span>{d.view_count} views</span>
                {d.knowledge_gaps > 0 && <span style={{ color: '#D97706' }}>{d.knowledge_gaps} gaps</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: isDark ? '#A1A1A1' : '#64748B' }}>Coverage</span>
                <div style={{ flex: 1, height: 3, borderRadius: 4, background: isDark ? '#292929' : '#E2E8F0' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: coverageColor, width: `${d.coverage_percent}%` }} />
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600 }}>{d.coverage_percent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
