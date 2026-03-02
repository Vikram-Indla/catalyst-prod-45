import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ── Home Stats ── */
export function useWikiHomeStats() {
  return useQuery({
    queryKey: ['wiki-home-stats'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_wiki_home_stats');
      if (error) throw error;
      const d = data as Record<string, number>;
      return {
        totalArticles: d.total_articles ?? 0,
        verifiedArticles: d.verified_articles ?? 0,
        needsReview: d.needs_review ?? 0,
        staleArticles: d.stale_articles ?? 0,
        totalDocuments: d.total_documents ?? 0,
        openRequests: d.open_requests ?? 0,
        avgConfidence: d.avg_confidence ?? 0,
        avgHelpfulness: d.avg_helpfulness ?? 0,
        totalDomains: d.total_domains ?? 0,
        verifiedPercent: d.verified_percent ?? 0,
      };
    },
  });
}

/* ── Domain Cards ── */
export function useWikiDomainCards() {
  return useQuery({
    queryKey: ['wiki-domain-cards'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_wiki_domain_cards');
      if (error) throw error;
      return (data ?? []) as Array<{
        domain_code: string;
        name: string;
        description: string;
        icon: string;
        article_count: number;
        document_count: number;
        view_count: number;
        knowledge_gaps: number;
        freshness_percent: number;
        coverage_percent: number;
        last_updated: string | null;
      }>;
    },
  });
}

/* ── Recent Articles ── */
export function useWikiRecentArticles(limit = 5) {
  return useQuery({
    queryKey: ['wiki-recent-articles', limit],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('*')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Quick Refs ── */
export function useWikiQuickRefs() {
  return useQuery({
    queryKey: ['wiki-quick-refs'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_quick_refs')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Learning Paths ── */
export function useWikiLearningPaths() {
  return useQuery({
    queryKey: ['wiki-learning-paths'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: paths, error } = await supabase
        .from('wiki_learning_paths')
        .select('*')
        .order('sort_order');
      if (error) throw error;

      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (!userId || !paths?.length) {
        return (paths ?? []).map((p: any) => ({ ...p, completedCount: 0 }));
      }

      const { data: progress } = await supabase
        .from('wiki_learning_progress')
        .select('path_id')
        .eq('user_id', userId)
        .eq('completed', true);

      const countByPath: Record<string, number> = {};
      (progress ?? []).forEach((r: any) => {
        countByPath[r.path_id] = (countByPath[r.path_id] || 0) + 1;
      });

      return (paths ?? []).map((p: any) => ({
        ...p,
        completedCount: countByPath[p.id] || 0,
      }));
    },
  });
}

/* ── Knowledge Requests ── */
export function useWikiKnowledgeRequests(status: 'open' | 'all' = 'open') {
  return useQuery({
    queryKey: ['wiki-knowledge-requests', status],
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('wiki_knowledge_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (status === 'open') {
        q = q.in('status', ['open', 'in_progress']);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Submit Article Feedback ── */
export function useSubmitArticleFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pageId, helpful, comment }: { pageId: string; helpful: boolean; comment?: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { error: insertErr } = await supabase
        .from('wiki_article_feedback')
        .insert({ page_id: pageId, user_id: userId ?? null, helpful, comment: comment ?? null });
      if (insertErr) throw insertErr;

      const { error: rpcErr } = await supabase.rpc('update_article_helpfulness', { p_page_id: pageId });
      if (rpcErr) throw rpcErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki-recent-articles'] });
    },
  });
}

/* ── AI Search ── */
export function useWikiAISearch(query: string) {
  return useQuery({
    queryKey: ['wiki-ai-search', query],
    enabled: query.length >= 3,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('kb-query', {
        body: { query, limit: 10 },
      });
      if (error) throw error;
      return data;
    },
  });
}

/* ── Related Articles ── */
export function useWikiRelatedArticles(domainCode?: string, excludeId?: string, limit = 3) {
  return useQuery({
    queryKey: ['wiki-related-articles', domainCode, excludeId, limit],
    enabled: !!domainCode,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('wiki_pages')
        .select('id, slug, title, domain_code, ai_confidence, read_time_minutes, updated_at')
        .eq('status', 'published')
        .eq('domain_code', domainCode!)
        .order('updated_at', { ascending: false })
        .limit(limit + 1);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).filter((a: any) => a.id !== excludeId).slice(0, limit);
    },
  });
}

/* ── Keyword Search (full-text on wiki_pages) ── */
export function useWikiKeywordSearch(query: string, filters?: { format?: string; verifiedOnly?: boolean }) {
  return useQuery({
    queryKey: ['wiki-keyword-search', query, filters],
    enabled: query.length >= 2,
    staleTime: 15_000,
    queryFn: async () => {
      let q = supabase
        .from('wiki_pages')
        .select('id, slug, title, lead_content, domain_code, ai_confidence, read_time_minutes, verification_status, format, status, updated_at, tags, view_count')
        .eq('status', 'published')
        .or(`title.ilike.%${query}%,lead_content.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (filters?.format && filters.format !== 'all') {
        q = q.eq('format', filters.format);
      }
      if (filters?.verifiedOnly) {
        q = q.eq('verification_status', 'verified');
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
