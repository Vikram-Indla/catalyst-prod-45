import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiLearningPaths } from '@/hooks/useWikiHub';
import { ChevronRight, GraduationCap } from '@/lib/atlaskit-icons';
import { useTheme } from '@/hooks/useTheme';

export default function WikiLearningPathsPage() {
  const navigate = useNavigate();
  const { data: paths, isLoading } = useWikiLearningPaths();
  const { isDark } = useTheme();

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', background: isDark ? 'var(--cp-bg-page)' : 'var(--ds-surface-sunken)', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontWeight: 600 }}>Learning Paths</span>
      </nav>

      <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-600)', fontWeight: 700, marginBottom: 8 }}>Learning Paths</h1>
      <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 24 }}>Curated article tracks for structured learning.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {isLoading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ padding: 24, borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: isDark ? '1px solid var(--ds-text)' : '0.75px solid var(--ds-shadow-raised, rgba(0,0,0,0.06))', height: 160 }} />
        )) : (paths ?? []).length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontSize: 'var(--ds-font-size-200)', gridColumn: '1 / -1' }}>No learning paths configured yet.</div>
        ) : (paths ?? []).map((p: any) => {
          const pct = p.article_count > 0 ? Math.round((p.completedCount / p.article_count) * 100) : 0;
          const diffColor = p.difficulty === 'beginner' ? 'var(--ds-text-success, var(--cp-success))' : p.difficulty === 'intermediate' ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--ds-text-warning, var(--cp-warning))';
          return (
            <div key={p.id} style={{ padding: 24, borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: isDark ? '1px solid var(--ds-text)' : '0.75px solid var(--ds-shadow-raised, rgba(0,0,0,0.06))', transition: 'border-color 120ms' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))'} onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-raised, rgba(0,0,0,0.06))'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={20} style={{ color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 650, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))' }}>{p.title}</div>
                  <span style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 700, textTransform: 'uppercase', color: diffColor }}>{p.difficulty}</span>
                </div>
              </div>
              <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 16, lineHeight: 1.5 }}>{p.description}</div>
              <div style={{ height: 4, borderRadius: 4, background: isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 4, background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', width: `${pct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>
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
