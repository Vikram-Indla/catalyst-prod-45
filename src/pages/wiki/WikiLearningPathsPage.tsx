import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiLearningPaths } from '@/hooks/useWikiHub';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function WikiLearningPathsPage() {
  const navigate = useNavigate();
  const { data: paths, isLoading } = useWikiLearningPaths();
  const { isDark } = useTheme();

  return (
    <div style={{ fontFamily: 'var(--ds-font-family-body)', color: isDark ? '#EDEDED' : '#0F172A', background: isDark ? '#0A0A0A' : '#F8FAFC', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: '#94A3B8' }} />
        <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Learning Paths</span>
      </nav>

      <h1 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Learning Paths</h1>
      <p style={{ fontSize: 12, color: '#64748B', marginBottom: 24 }}>Curated article tracks for structured learning.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {isLoading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ padding: 24, borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '1px solid #2E2E2E' : '0.75px solid rgba(0,0,0,0.06)', height: 160 }} />
        )) : (paths ?? []).length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748B', fontSize: 12, gridColumn: '1 / -1' }}>No learning paths configured yet.</div>
        ) : (paths ?? []).map((p: any) => {
          const pct = p.article_count > 0 ? Math.round((p.completedCount / p.article_count) * 100) : 0;
          const diffColor = p.difficulty === 'beginner' ? '#16A34A' : p.difficulty === 'intermediate' ? '#2563EB' : '#D97706';
          return (
            <div key={p.id} style={{ padding: 24, borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', border: isDark ? '1px solid #2E2E2E' : '0.75px solid rgba(0,0,0,0.06)', transition: 'border-color 120ms' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'} onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : 'rgba(0,0,0,0.06)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={20} style={{ color: '#FFFFFF' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 14, fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A' }}>{p.title}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: diffColor }}>{p.difficulty}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16, lineHeight: 1.5 }}>{p.description}</div>
              <div style={{ height: 4, borderRadius: 4, background: isDark ? '#292929' : '#E2E8F0', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 4, background: '#2563EB', width: `${pct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B' }}>
                <span>{p.estimated_hours}h · {p.article_count} articles</span>
                <span>{pct}% complete</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
