import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, GraduationCap, CheckCircle2, Circle, Clock, FileText } from '@/lib/atlaskit-icons';
import { useTheme } from '@/hooks/useTheme';

// Font tokens removed — using ADS tokens instead
// sora → var(--ds-font-family-body)
// inter → var(--ds-font-family-body)
// mono → var(--ds-font-family-code)

const DIFF_COLORS: Record<string, string> = { beginner: 'var(--ds-text-success, var(--cp-success))', intermediate: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', advanced: 'var(--ds-text-warning, var(--cp-warning))' };

export default function WikiLearningPathDetailPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isDark } = useTheme();

  const border = isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-raised, rgba(0,0,0,0.06))';

  // Fetch path
  const { data: path, isLoading: pathLoading } = useQuery({
    queryKey: ['wiki-learning-path', pathId],
    enabled: !!pathId,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_learning_paths')
        .select('*')
        .eq('id', pathId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch articles for this path
  const articleIds: string[] = path?.article_ids ?? [];
  const { data: articles = [] } = useQuery({
    queryKey: ['wiki-path-articles', pathId, articleIds],
    enabled: articleIds.length > 0,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, read_time_minutes, domain_code, verification_status')
        .in('id', articleIds);
      if (error) throw error;
      // Sort by article_ids order
      const ordered = articleIds.map(id => (data ?? []).find((a: any) => a.id === id)).filter(Boolean);
      return ordered;
    },
  });

  // Fetch user progress
  const { data: progress = [] } = useQuery({
    queryKey: ['wiki-learning-progress', pathId],
    enabled: !!pathId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return [];
      const { data, error } = await supabase
        .from('wiki_learning_progress')
        .select('page_id, completed')
        .eq('path_id', pathId!)
        .eq('user_id', userId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedSet = new Set(progress.filter((p: any) => p.completed).map((p: any) => p.page_id));
  const completedCount = completedSet.size;
  const totalCount = articleIds.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle completion mutation
  const toggleComplete = useMutation({
    mutationFn: async ({ pageId, completed }: { pageId: string; completed: boolean }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      if (completed) {
        await (supabase.from('wiki_learning_progress') as any)
          .upsert({ path_id: pathId, page_id: pageId, user_id: userId, completed: true }, { onConflict: 'path_id,page_id,user_id' });
      } else {
        await supabase
          .from('wiki_learning_progress')
          .delete()
          .eq('path_id', pathId!)
          .eq('page_id', pageId)
          .eq('user_id', userId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki-learning-progress', pathId] });
    },
  });

  if (pathLoading) {
    return (
      <div style={{ fontFamily: 'var(--ds-font-family-body)', padding: '24px 40px', background: isDark ? 'var(--cp-bg-page)' : undefined, minHeight: '100%' }}>
        <div style={{ height: 20, width: 200, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', borderRadius: 4, marginBottom: 16 }} />
        <div style={{ height: 12, width: 300, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', borderRadius: 4 }} />
      </div>
    );
  }

  if (!path) {
    return (
      <div style={{ fontFamily: 'var(--ds-font-family-body)', padding: '48px 40px', textAlign: 'center', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', background: isDark ? 'var(--cp-bg-page)' : undefined, minHeight: '100%' }}>
        Learning path not found.
      </div>
    );
  }

  const diffColor = DIFF_COLORS[path.difficulty] || 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))';

  return (
    <div style={{ fontFamily: 'var(--ds-font-family-body)', color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', background: isDark ? 'var(--cp-bg-page)' : 'var(--ds-surface-sunken)', minHeight: '100%', padding: '24px 40px 60px' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />
        <span onClick={() => navigate('/wiki/learning-paths')} style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', cursor: 'pointer' }}>Learning Paths</span>
        <ChevronRight size={12} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontWeight: 600 }}>{path.title}</span>
      </nav>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GraduationCap size={24} style={{ color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-700)', fontWeight: 700, marginBottom: 4 }}>{path.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 700, textTransform: 'uppercase', color: diffColor }}>{path.difficulty}</span>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{path.estimated_hours}h estimated</span>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{totalCount} articles</span>
          </div>
          <p style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', lineHeight: 1.5, maxWidth: 600 }}>{path.description}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-800)', fontWeight: 700, color: pct === 100 ? 'var(--ds-text-success, var(--cp-success))' : (isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))') }}>{pct}%</div>
          <div style={{ fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>Complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 4, background: isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))', marginBottom: 32 }}>
        <div style={{ height: '100%', borderRadius: 4, background: pct === 100 ? 'var(--ds-text-success, var(--cp-success))' : 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', width: `${pct}%`, transition: 'width 400ms' }} />
      </div>

      {/* Article list */}
      <div style={{ borderRadius: 8, border: `0.75px solid ${border}`, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 48px',
          background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', padding: '0 16px', height: 50, alignItems: 'center',
          fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-50)', fontWeight: 600, textTransform: 'uppercase', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', letterSpacing: '0.05em',
          borderBottom: `0.75px solid ${border}`,
        }}>
          <span>#</span><span>Article</span><span>Domain</span><span>Time</span><span></span>
        </div>

        {articles.map((a: any, idx: number) => {
          const isComplete = completedSet.has(a.id);
          return (
            <div key={a.id} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 48px',
              padding: '0 16px', height: 48, alignItems: 'center',
              borderBottom: `0.75px solid ${border}`,
              transition: 'background 80ms', cursor: 'pointer',
              opacity: isComplete ? 0.7 : 1,
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--ds-background-information, rgba(37,99,235,0.04))'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', fontWeight: 500 }}>{idx + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }} onClick={() => navigate(`/wiki/${a.slug}`)}>
                <FileText size={14} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isComplete ? 'line-through' : 'none' }}>
                  {a.title}
                </span>
              </div>
              <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 650, padding: '0px 5px', borderRadius: 4, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', width: 'fit-content' }}>{a.domain_code}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />
                <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{a.read_time_minutes ?? '?'}m</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); toggleComplete.mutate({ pageId: a.id, completed: !isComplete }); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                {isComplete
                  ? <CheckCircle2 size={18} style={{ color: 'var(--ds-text-success, var(--cp-success))' }} />
                  : <Circle size={18} style={{ color: 'var(--ds-text-disabled)' }} />
                }
              </button>
            </div>
          );
        })}

        {articles.length === 0 && !pathLoading && (
          <div style={{ padding: 40, textAlign: 'center', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontSize: 'var(--ds-font-size-200)' }}>
            No articles assigned to this path yet.
          </div>
        )}
      </div>
    </div>
  );
}
