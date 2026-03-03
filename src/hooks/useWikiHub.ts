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
        unverified: d.unverified ?? 0,
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
      // RPC returns `code` from wiki_domains — normalize to domain_code for UI
      return ((data ?? []) as any[]).map((d: any) => ({
        domain_code: d.code ?? d.domain_code,
        name: d.name,
        name_ar: d.name_ar,
        description: d.description,
        icon: d.icon,
        tag: d.tag,
        article_count: d.article_count ?? 0,
        document_count: d.document_count ?? 0,
        view_count: d.view_count ?? 0,
        knowledge_gaps: d.knowledge_gaps ?? 0,
        freshness_percent: d.freshness_percent ?? 100,
        coverage_percent: d.coverage_percent ?? 0,
      }));
    },
  });
}

/* ── Recent Articles ── */
export function useWikiRecentArticles(limit = 8) {
  return useQuery({
    queryKey: ['wiki-recent-articles', limit],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, lead_content, domain_code, status, verification_status, format, ai_confidence, helpfulness_score, helpfulness_votes, tags, version, read_time_minutes, author_name, tldr, view_count, updated_at')
        .is('deleted_at', null)
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
        .is('deleted_at', null)
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
    staleTime: 120_000,
    queryFn: async () => {
      const { data: paths, error } = await supabase
        .from('wiki_learning_paths')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return (paths ?? []).map((p: any) => ({
        ...p,
        article_count: (p.article_ids ?? []).length,
        completedCount: 0,
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
        .is('deleted_at', null)
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
      if (!userId) throw new Error('Not authenticated');

      const { error: insertErr } = await supabase
        .from('wiki_article_feedback')
        .upsert({ page_id: pageId, user_id: userId, helpful, comment: comment ?? null }, { onConflict: 'page_id,user_id' });
      if (insertErr) throw insertErr;

      const { error: rpcErr } = await supabase.rpc('update_article_helpfulness', { p_page_id: pageId });
      if (rpcErr) throw rpcErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki-recent-articles'] });
    },
  });
}

/* ── Toggle Bookmark ── */
export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pageId }: { pageId: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('wiki_bookmarks')
        .select('id')
        .eq('page_id', pageId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabase.from('wiki_bookmarks').delete().eq('id', existing.id);
        return { bookmarked: false };
      } else {
        await supabase.from('wiki_bookmarks').insert({ page_id: pageId, user_id: userId });
        return { bookmarked: true };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki-bookmarks'] });
      qc.invalidateQueries({ queryKey: ['wiki-recent-articles'] });
    },
  });
}

/* ── User Bookmarks ── */
export function useWikiUserBookmarks() {
  return useQuery({
    queryKey: ['wiki-bookmarks'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return [];
      const { data, error } = await supabase
        .from('wiki_bookmarks')
        .select('page_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((b: any) => b.page_id as string);
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

/* ── Keyword Search ── */
export function useWikiKeywordSearch(query: string, filters?: { format?: string; verifiedOnly?: boolean }) {
  return useQuery({
    queryKey: ['wiki-keyword-search', query, filters],
    enabled: query.length >= 2,
    staleTime: 15_000,
    queryFn: async () => {
      let q = supabase
        .from('wiki_pages')
        .select('id, slug, title, lead_content, domain_code, ai_confidence, read_time_minutes, verification_status, format, status, updated_at, tags, view_count')
        .is('deleted_at', null)
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

/* ── Related Articles ── */
export function useWikiRelatedArticles(domainCode?: string, excludeId?: string, limit = 3) {
  return useQuery({
    queryKey: ['wiki-related-articles', domainCode, excludeId, limit],
    enabled: !!domainCode,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, domain_code, ai_confidence, read_time_minutes, updated_at')
        .is('deleted_at', null)
        .eq('domain_code', domainCode!)
        .order('updated_at', { ascending: false })
        .limit(limit + 1);
      if (error) throw error;
      return (data ?? []).filter((a: any) => a.id !== excludeId).slice(0, limit);
    },
  });
}

/* ── Verification Queue ── */
export function useWikiVerificationQueue() {
  return useQuery({
    queryKey: ['wiki-verification-queue'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, domain_code, author_name, freshness_score, updated_at, verification_status')
        .is('deleted_at', null)
        .eq('verification_status', 'needs_review')
        .order('updated_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Article Templates ── */
export function useWikiArticleTemplates() {
  return useQuery({
    queryKey: ['wiki-article-templates'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_article_templates')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Increment View Count ── */
export function useIncrementViewCount() {
  return useMutation({
    mutationFn: async (pageId: string) => {
      await supabase.rpc('increment_view_count', { p_page_id: pageId });
    },
  });
}

/* ── Log Read ── */
export function useLogWikiRead() {
  return useMutation({
    mutationFn: async ({ pageId }: { pageId: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return;
      await supabase.from('wiki_read_log').insert({ page_id: pageId, user_id: userId });
      await supabase.rpc('increment_view_count', { p_page_id: pageId });
    },
  });
}
