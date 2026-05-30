import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { catalystToast } from '@/lib/catalystToast';

// ── Debounce hook ───────────────────────────────────────────
export const useDebouncedValue = <T>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// ── useWikiDomains ──────────────────────────────────────────
export const useWikiDomains = () => {
  return useQuery({
    queryKey: ['wiki-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_domain_stats')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ── useWikiStats (aggregate stats for home page) ────────────
export const useWikiStats = () => {
  return useQuery({
    queryKey: ['wiki-stats'],
    queryFn: async () => {
      const [pagesRes, categoriesRes, domainsRes, chunksRes, docsRes] = await Promise.all([
        supabase.from('wiki_pages').select('ai_confidence', { count: 'exact', head: false }).eq('status', 'published'),
        supabase.from('wiki_categories').select('id', { count: 'exact', head: true }),
        supabase.from('wiki_domains').select('id', { count: 'exact', head: true }),
        supabase.from('kb_embeddings').select('id', { count: 'exact', head: true }),
        supabase.from('wiki_documents').select('id', { count: 'exact', head: true }),
      ]);

      const pages = pagesRes.data || [];
      const avgConfidence = pages.length > 0
        ? pages.reduce((s, p) => s + (p.ai_confidence ?? 0), 0) / pages.length
        : 0;

      return {
        articles: pagesRes.count ?? 0,
        documents: docsRes.count ?? 0,
        domains: domainsRes.count ?? 0,
        categories: categoriesRes.count ?? 0,
        chunks: chunksRes.count ?? 0,
        avgConfidence: Math.round(avgConfidence * 100),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ── useWikiCategories ───────────────────────────────────────
export const useWikiCategories = (domainCode?: string) => {
  return useQuery({
    queryKey: ['wiki-categories', domainCode],
    queryFn: async () => {
      const { data: domain } = await supabase
        .from('wiki_domains')
        .select('id')
        .eq('domain_code', domainCode!)
        .single();

      if (!domain) return [];

      const { data, error } = await supabase
        .from('wiki_categories')
        .select('*')
        .eq('domain_id', domain.id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!domainCode,
    staleTime: 5 * 60 * 1000,
  });
};

// ── useWikiCategoryPages ────────────────────────────────────
export const useWikiCategoryPages = (domainCode?: string, categoryId?: string) => {
  return useQuery({
    queryKey: ['wiki-category-pages', domainCode, categoryId],
    queryFn: async () => {
      let q = supabase
        .from('wiki_pages')
        .select('id, slug, title, title_ar, domain_code, status, lead_content, ai_confidence, updated_at, category_id')
        .eq('status', 'published')
        .eq('domain_code', domainCode!)
        .order('updated_at', { ascending: false });

      if (categoryId && categoryId !== 'all') {
        q = q.eq('category_id', categoryId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!domainCode,
    staleTime: 60 * 1000, // 1 minute
  });
};

// ── useWikiPage ─────────────────────────────────────────────
export const useWikiPage = (slug?: string) => {
  return useQuery({
    queryKey: ['wiki-page', slug],
    queryFn: async () => {
      const { data: page, error: pageError } = await supabase
        .from('wiki_pages')
        .select('*')
        .eq('slug', slug!)
        .single();
      if (pageError) throw pageError;

      const [sectionsRes, refsRes, crossRefsRes] = await Promise.all([
        supabase
          .from('wiki_sections')
          .select('*')
          .eq('page_id', page.id)
          .order('sort_order'),
        supabase
          .from('wiki_references')
          .select('*')
          .eq('page_id', page.id)
          .order('ref_number'),
        supabase
          .from('wiki_cross_references')
          .select('*, target_page:wiki_pages!wiki_cross_references_target_page_id_fkey(slug, title)')
          .eq('source_page_id', page.id),
      ]);

      return {
        ...page,
        sections: sectionsRes.data ?? [],
        references: refsRes.data ?? [],
        crossReferences: crossRefsRes.data ?? [],
      };
    },
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
};

// ── useWikiRecentPages ──────────────────────────────────────
export const useWikiRecentPages = (limit = 20) => {
  return useQuery({
    queryKey: ['wiki-recent-pages', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, title_ar, domain_code, status, lead_content, ai_confidence, updated_at')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });
};

// ── useWikiWhatsNew ─────────────────────────────────────────
export const useWikiWhatsNew = (days = 7) => {
  return useQuery({
    queryKey: ['wiki-whats-new', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceISO = since.toISOString();

      const [pagesRes, docsRes] = await Promise.all([
        supabase
          .from('wiki_pages')
          .select('id, slug, title, domain_code, status, updated_at, created_at')
          .gte('updated_at', sinceISO)
          .order('updated_at', { ascending: false })
          .limit(50),
        supabase
          .from('wiki_documents')
          .select('id, original_filename, domain_code, doc_type, pages_extracted, chunks_generated, words_extracted, created_at, status')
          .gte('created_at', sinceISO)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const items: Array<{
        type: 'page' | 'document';
        badge: 'NEW' | 'UPDATED' | 'DOC' | 'ARCHIVED';
        title: string;
        desc: string;
        domain: string;
        date: string;
      }> = [];

      for (const p of pagesRes.data || []) {
        const isNew = p.created_at && new Date(p.created_at).getTime() > since.getTime();
        const isArchived = p.status === 'archived';
        items.push({
          type: 'page',
          badge: isArchived ? 'ARCHIVED' : isNew ? 'NEW' : 'UPDATED',
          title: p.title,
          desc: isNew ? `New article in ${p.domain_code}` : `Updated article content`,
          domain: p.domain_code,
          date: p.updated_at,
        });
      }

      for (const d of docsRes.data || []) {
        items.push({
          type: 'document',
          badge: 'DOC',
          title: `${d.original_filename} uploaded`,
          desc: d.status === 'complete'
            ? `Parsed ${d.pages_extracted ?? 0} pages, generated ${d.chunks_generated ?? 0} chunks`
            : `Status: ${d.status}`,
          domain: d.domain_code,
          date: d.created_at,
        });
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const now = new Date();
      const groups: Record<string, typeof items> = {};
      for (const item of items) {
        const itemDate = new Date(item.date);
        const diffDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
        const label = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
        if (!groups[label]) groups[label] = [];
        groups[label].push(item);
      }

      return Object.entries(groups).map(([date, items]) => ({ date, items }));
    },
    staleTime: 60 * 1000,
  });
};

// ── useWikiSearch (calls existing kb-query Edge Function) ───
export const useWikiSearch = (query: string) => {
  return useQuery({
    queryKey: ['wiki-search', query],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('kb-query', {
        body: { query, language: 'en' },
      });
      if (error) {
        catalystToast.error('Search failed. Please try again.');
        throw error;
      }
      return data;
    },
    enabled: query.length >= 2,
    staleTime: 0,
  });
};

// ── useWikiTitleSearch (for command palette) ─────────────────
export const useWikiTitleSearch = (query: string) => {
  return useQuery({
    queryKey: ['wiki-title-search', query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('slug, title, title_ar, domain_code')
        .ilike('title', `%${query}%`)
        .eq('status', 'published')
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
    staleTime: 0,
  });
};

// ── useWikiBookmarks ────────────────────────────────────────
export const useWikiBookmarks = () => {
  return useQuery({
    queryKey: ['wiki-bookmarks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('wiki_bookmarks')
        .select('*, page:wiki_pages(id, slug, title, title_ar, domain_code)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });
};

// ── useToggleWikiBookmark ───────────────────────────────────
export const useToggleWikiBookmark = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pageId, userId }: { pageId: string; userId: string }) => {
      const { data: existing } = await supabase
        .from('wiki_bookmarks')
        .select('id')
        .eq('page_id', pageId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabase.from('wiki_bookmarks').delete().eq('id', existing.id);
        return { pinned: false };
      } else {
        await supabase.from('wiki_bookmarks').insert({ page_id: pageId, user_id: userId });
        return { pinned: true };
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['wiki-bookmarks'] });
      qc.invalidateQueries({ queryKey: ['wiki-bookmark-check'] });
      catalystToast.success(data.pinned ? 'Article pinned' : 'Article unpinned');
    },
    onError: () => {
      catalystToast.error('Failed to update bookmark. Please try again.');
    },
  });
};

// ── useIsBookmarked ─────────────────────────────────────────
export const useIsBookmarked = (pageId?: string) => {
  return useQuery({
    queryKey: ['wiki-bookmark-check', pageId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !pageId) return false;
      const { data } = await supabase
        .from('wiki_bookmarks')
        .select('id')
        .eq('page_id', pageId)
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!pageId,
    staleTime: 60 * 1000,
  });
};

// ── useWikiDocuments ────────────────────────────────────────
export const useWikiDocuments = (domainCode?: string) => {
  return useQuery({
    queryKey: ['wiki-documents', domainCode],
    queryFn: async () => {
      let q = supabase
        .from('wiki_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (domainCode) q = q.eq('domain_code', domainCode);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });
};

// ── useWikiDocumentUpload (full pipeline: storage → insert → kb-sync) ──
export const useWikiDocumentUpload = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      file: File;
      domain_code: string;
      category_id?: string;
      doc_type: string;
      purpose?: string;
      version?: string;
      language?: string;
      linked_epic?: string;
    }) => {
      const { file, domain_code, ...meta } = params;
      const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${domain_code}/${Date.now()}_${sanitized}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('wiki-docs')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: doc, error: insertError } = await supabase
        .from('wiki_documents')
        .insert({
          filename: sanitized,
          original_filename: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          domain_code,
          category_id: meta.category_id || null,
          doc_type: meta.doc_type,
          purpose: meta.purpose || null,
          version: meta.version || '1.0',
          language: (meta.language as 'en' | 'ar' | 'mixed') || 'en',
          linked_epic: meta.linked_epic || null,
          status: 'uploaded',
        })
        .select()
        .single();
      if (insertError) throw insertError;

      try {
        await supabase.functions.invoke('kb-sync', {
          body: {
            action: 'sync_document',
            document_id: doc.id,
            table: 'wiki_documents',
            sourceType: 'wiki',
          },
        });
      } catch (e) {
        console.warn('kb-sync invocation failed:', e);
      }

      return doc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki-documents'] });
      qc.invalidateQueries({ queryKey: ['wiki-stats'] });
      qc.invalidateQueries({ queryKey: ['wiki-domains'] });
    },
    onError: (err: any) => {
      catalystToast.error(`Upload failed: ${err.message || 'Unknown error'}`);
    },
  });
};

// ── useWikiDocumentStatus (poll for processing status) ──────
export const useWikiDocumentStatus = (docId?: string) => {
  return useQuery({
    queryKey: ['wiki-doc-status', docId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_documents')
        .select('status, chunks_generated, pages_extracted, words_extracted, error_message')
        .eq('id', docId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!docId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'complete' || status === 'failed') return false;
      return 2000;
    },
  });
};

// ── useWikiReadLog ──────────────────────────────────────────
export const useLogWikiRead = () => {
  return useMutation({
    mutationFn: async ({ pageId }: { pageId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('wiki_read_log').insert({ page_id: pageId, user_id: user.id });
    },
  });
};

// ── useSubmitFeedback ───────────────────────────────────────
export const useSubmitFeedback = () => {
  return useMutation({
    mutationFn: async ({ entityId, entityType, rating, comment }: {
      entityId: string;
      entityType: string;
      rating: 'positive' | 'negative';
      comment?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      try {
        await supabase.from('kb_feedback' as any).insert({
          entity_id: entityId,
          entity_type: entityType,
          rating,
          comment: comment || null,
          user_id: user?.id || null,
        });
      } catch {
        console.warn('kb_feedback table not available');
      }
    },
    onSuccess: () => {
      catalystToast.success('Thank you for your feedback');
    },
  });
};
