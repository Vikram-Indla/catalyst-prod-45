import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  });
};

// ── useWikiCategories ───────────────────────────────────────
export const useWikiCategories = (domainCode?: string) => {
  return useQuery({
    queryKey: ['wiki-categories', domainCode],
    queryFn: async () => {
      // First get domain id from domain_code
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
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });
};

// ── useWikiBookmarks ────────────────────────────────────────
export const useWikiBookmarks = () => {
  return useQuery({
    queryKey: ['wiki-bookmarks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_bookmarks')
        .select('*, page:wiki_pages(id, slug, title, title_ar, domain_code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
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
      } else {
        await supabase.from('wiki_bookmarks').insert({ page_id: pageId, user_id: userId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wiki-bookmarks'] }),
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
  });
};

// ── useWikiDocumentUpload ───────────────────────────────────
export const useWikiDocumentUpload = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: {
      filename: string;
      original_filename: string;
      file_path: string;
      file_size: number;
      mime_type: string;
      domain_code: string;
      category_id?: string;
      doc_type: string;
      purpose?: string;
      version?: string;
      language?: string;
      linked_epic?: string;
      uploaded_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('wiki_documents')
        .insert([doc])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wiki-documents'] }),
  });
};

// ── useWikiReadLog ──────────────────────────────────────────
export const useLogWikiRead = () => {
  return useMutation({
    mutationFn: async ({ pageId, userId }: { pageId: string; userId: string }) => {
      await supabase.from('wiki_read_log').insert({ page_id: pageId, user_id: userId });
    },
  });
};

// ── useKBQuery (generic RAG query) ──────────────────────────
export const useKBQuery = (query: string) => {
  return useQuery({
    queryKey: ['kb-query', query],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('kb-query', {
        body: { query, language: 'en' },
      });
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });
};
