import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, GraduationCap, CheckCircle2, Circle, Clock, FileText } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const F = {
  sora: "'Sora', sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const DIFF_COLORS: Record<string, string> = { beginner: '#16A34A', intermediate: '#2563EB', advanced: '#D97706' };

export default function WikiLearningPathDetailPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isDark } = useTheme();

  const border = isDark ? '#2E2E2E' : 'rgba(0,0,0,0.06)';

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
      <div style={{ fontFamily: F.inter, padding: '24px 40px', background: isDark ? '#0A0A0A' : undefined, minHeight: '100%' }}>
        <div style={{ height: 20, width: 200, background: isDark ? '#1A1A1A' : '#F1F5F9', borderRadius: 4, marginBottom: 16 }} />
        <div style={{ height: 12, width: 300, background: isDark ? '#1A1A1A' : '#F1F5F9', borderRadius: 4 }} />
      </div>
    );
  }

  if (!path) {
    return (
      <div style={{ fontFamily: F.inter, padding: '60px 40px', textAlign: 'center', color: isDark ? '#878787' : '#64748B', background: isDark ? '#0A0A0A' : undefined, minHeight: '100%' }}>
        Learning path not found.
      </div>
    );
  }

  const diffColor = DIFF_COLORS[path.difficulty] || '#64748B';

  return (
    <div style={{ fontFamily: F.inter, color: isDark ? '#EDEDED' : '#0F172A', background: isDark ? '#0A0A0A' : '#F8FAFC', minHeight: '100%', padding: '24px 40px 60px' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
        <span onClick={() => navigate('/wiki/learning-paths')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Learning Paths</span>
        <ChevronRight size={12} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
        <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 600 }}>{path.title}</span>
      </nav>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GraduationCap size={24} style={{ color: '#FFFFFF' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: F.sora, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{path.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: diffColor }}>{path.difficulty}</span>
            <span style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B' }}>{path.estimated_hours}h estimated</span>
            <span style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B' }}>{totalCount} articles</span>
          </div>
          <p style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', lineHeight: 1.5, maxWidth: 600 }}>{path.description}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: F.mono, fontSize: 24, fontWeight: 700, color: pct === 100 ? '#16A34A' : (isDark ? '#EDEDED' : '#0F172A') }}>{pct}%</div>
          <div style={{ fontSize: 10, color: isDark ? '#A1A1A1' : '#64748B' }}>Complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 4, background: isDark ? '#292929' : '#E2E8F0', marginBottom: 32 }}>
        <div style={{ height: '100%', borderRadius: 4, background: pct === 100 ? '#16A34A' : '#2563EB', width: `${pct}%`, transition: 'width 400ms' }} />
      </div>

      {/* Article list */}
      <div style={{ borderRadius: 8, border: `0.75px solid ${border}`, background: isDark ? '#1A1A1A' : '#FFFFFF', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 48px',
          background: isDark ? '#1A1A1A' : '#F1F5F9', padding: '0 16px', height: 50, alignItems: 'center',
          fontFamily: F.sora, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: isDark ? '#878787' : '#64748B', letterSpacing: '0.05em',
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
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontFamily: F.mono, fontSize: 11, color: isDark ? '#878787' : '#94A3B8', fontWeight: 500 }}>{idx + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }} onClick={() => navigate(`/wiki/${a.slug}`)}>
                <FileText size={14} style={{ color: isDark ? '#878787' : '#94A3B8', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isComplete ? 'line-through' : 'none' }}>
                  {a.title}
                </span>
              </div>
              <span style={{ fontSize: 9, fontWeight: 650, padding: '1px 5px', borderRadius: 4, background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#878787' : '#64748B', width: 'fit-content' }}>{a.domain_code}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
                <span style={{ fontFamily: F.mono, fontSize: 10, color: isDark ? '#A1A1A1' : '#64748B' }}>{a.read_time_minutes ?? '?'}m</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); toggleComplete.mutate({ pageId: a.id, completed: !isComplete }); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                {isComplete
                  ? <CheckCircle2 size={18} style={{ color: '#16A34A' }} />
                  : <Circle size={18} style={{ color: '#CBD5E1' }} />
                }
              </button>
            </div>
          );
        })}

        {articles.length === 0 && !pathLoading && (
          <div style={{ padding: 40, textAlign: 'center', color: isDark ? '#878787' : '#64748B', fontSize: 12 }}>
            No articles assigned to this path yet.
          </div>
        )}
      </div>
    </div>
  );
}
