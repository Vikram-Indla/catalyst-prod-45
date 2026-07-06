/**
 * folioAiSearch — natural-language search over Folio documents
 * (CAT-FOLIO-AISEARCH-20260706). The folio-ai-search edge function turns a
 * query like "show me all BRDs of license" into a structured filter; this
 * module applies that filter to the already-loaded document list (no
 * per-doc AI calls). Mirrors the ai-search-issues client pattern.
 */
import { supabase } from '@/integrations/supabase/client';

export interface FolioFilter {
  text_contains?: string;
  template_keys?: string[];
  linked_types?: string[];
  workspace_names?: string[];
  status?: 'draft' | 'published';
  is_orphan?: boolean;
}

export interface FolioAiSearchResult {
  filters: FolioFilter;
  reason: string;
}

/** Doc shape the predicate needs — the sitemap/hub already load all of it. */
export interface FolioSearchDoc {
  title: string;
  contentText: string | null;
  templateKey: string | null;
  publishedAt: string | null;
  workspaceName: string;
  /** Linked work-item types, e.g. "Epic", "Business Request". */
  linkedTypes: string[];
  hasChildren: boolean;
}

/** "Business Request" → "business_request", "Epic" → "epic". */
function normType(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, '_');
}

export async function runFolioAiSearch(query: string): Promise<FolioAiSearchResult> {
  const { data, error } = await supabase.functions.invoke('folio-ai-search', { body: { query } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.message || String(data.error));
  return { filters: (data?.filters ?? {}) as FolioFilter, reason: data?.reason ?? '' };
}

export function isEmptyFilter(f: FolioFilter): boolean {
  return (
    !f.text_contains &&
    !f.template_keys?.length &&
    !f.linked_types?.length &&
    !f.workspace_names?.length &&
    !f.status &&
    !f.is_orphan
  );
}

/** AND across dimensions, OR within each array. */
export function matchesFolioFilter(doc: FolioSearchDoc, f: FolioFilter): boolean {
  if (f.text_contains) {
    const needle = f.text_contains.toLowerCase();
    const hay = `${doc.title ?? ''} ${doc.contentText ?? ''}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (f.template_keys?.length) {
    if (!doc.templateKey || !f.template_keys.includes(doc.templateKey)) return false;
  }
  if (f.status) {
    const published = !!doc.publishedAt;
    if (f.status === 'published' && !published) return false;
    if (f.status === 'draft' && published) return false;
  }
  if (f.is_orphan) {
    if (doc.linkedTypes.length > 0 || doc.hasChildren) return false;
  }
  if (f.linked_types?.length) {
    const want = f.linked_types.map(normType);
    const have = doc.linkedTypes.map(normType);
    if (!have.some((t) => want.includes(t))) return false;
  }
  if (f.workspace_names?.length) {
    const wn = doc.workspaceName.toLowerCase();
    const ok = f.workspace_names.some((w) => {
      const q = w.toLowerCase();
      return wn.includes(q) || q.includes(wn);
    });
    if (!ok) return false;
  }
  return true;
}
