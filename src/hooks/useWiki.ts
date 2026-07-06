/**
 * useWiki — data layer for the Catalyst Wiki (CAT-DOCS-NOTION-20260704-001).
 *
 * Workspaces = kb_doc_spaces (container_type project | product | organization).
 * Pages      = kb_documents (slug unique per workspace, parent_id + position tree,
 *              content_format 'blocknote' native | 'adf' legacy read-only).
 * Links      = kb_document_links (page ↔ work item), kb_page_links (page ↔ page).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/utils/assertUuid';
import { catalystToast } from '@/lib/catalystToast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WikiWorkspace {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  container_type: 'project' | 'product' | 'organization' | 'personal';
  container_id: string | null;
  icon: string | null;
  created_at: string;
}

export interface WikiPageSummary {
  id: string;
  space_id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  position: number;
  icon: string | null;
  is_template: boolean;
  updated_at: string;
}

export interface WikiPage extends WikiPageSummary {
  content: unknown;
  content_format: 'adf' | 'blocknote';
  cover_url: string | null;
  template_key: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  published_at: string | null;
  /** Yjs document state (CAT-DOCEX-DB-COEDIT-20260705-001 C3). PostgREST
   *  returns/accepts bytea as a Postgres hex-escape string ("\\x...") — see
   *  editor/ydocBytea.ts for the Uint8Array<->hex conversion. */
  ydoc_state: string | null;
}

export type WikiEntityType =
  | 'business_request' | 'epic' | 'feature' | 'story' | 'task'
  | 'defect' | 'incident' | 'test_case' | 'risk' | 'idea' | 'issue';

export interface WikiDocumentLink {
  id: string;
  document_id: string;
  entity_type: WikiEntityType;
  entity_id: string;
  link_origin: 'manual' | 'mention';
  created_at: string;
}

const PAGE_SUMMARY_COLS = 'id, space_id, title, slug, parent_id, position, icon, is_template, updated_at';

// kb_* tables postdate the generated Supabase types in this repo; the kb
// surfaces (KnowledgeHubPage etc.) use the same untyped escape hatch.
const db = supabase as unknown as {
  from: (table: string) => any;
};

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export function useWikiWorkspaces() {
  return useQuery({
    queryKey: ['wiki', 'workspaces'],
    queryFn: async (): Promise<WikiWorkspace[]> => {
      const { data, error } = await db
        .from('kb_doc_spaces')
        .select('*')
        .order('container_type')
        .order('name');
      if (error) throw error;
      // Personal spaces (V2 My Space) belong to one user. RLS on kb_doc_spaces
      // is still permissive (D5 tightening batch pending) — hide other users'
      // spaces client-side so they never appear in nav, filters, or New menus.
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      return ((data ?? []) as WikiWorkspace[]).filter(
        (w) => w.container_type !== 'personal' || w.container_id === uid,
      );
    },
  });
}

/**
 * My Space (CAT-DOCEX-DB-COEDIT-20260705-001 V2) — the user's personal
 * workspace, provisioned on demand. `mySpace` is null until it exists;
 * `ensure` creates it (idempotent — the (container_type, container_id)
 * unique index makes a cross-tab race resolve to the existing row).
 */
export function useMySpace() {
  const queryClient = useQueryClient();
  const { data: workspaces } = useWikiWorkspaces();
  const mySpace = (workspaces ?? []).find((w) => w.container_type === 'personal') ?? null;

  const ensure = useMutation({
    mutationFn: async (): Promise<WikiWorkspace> => {
      if (mySpace) return mySpace;
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) throw new Error('Not signed in');
      const { data, error } = await db
        .from('kb_doc_spaces')
        .insert({ name: 'My Space', container_type: 'personal', container_id: uid })
        .select('*')
        .single();
      if (!error) return data as WikiWorkspace;
      // Unique-index collision → another tab provisioned it first.
      const { data: existing } = await db
        .from('kb_doc_spaces')
        .select('*')
        .eq('container_type', 'personal')
        .eq('container_id', uid)
        .maybeSingle();
      if (existing) return existing as WikiWorkspace;
      throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki', 'workspaces'] });
    },
  });

  return { mySpace, ensure, isLoaded: workspaces !== undefined };
}

/**
 * Move a page to another workspace (V2 — "create pages [in My Space] and then
 * move them into projects"). Re-parents to the target's root; the slug is
 * frozen so the destination URL is Routes.docex.page(targetWs.slug, slug).
 */
export function useMoveWikiPageToSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pageId: string; targetSpaceId: string }) => {
      type Moved = { id: string; slug: string; space_id: string };
      const isSlugCollision = (e: { code?: string; message?: string } | null) =>
        !!e && (e.code === '23505' || /space_slug_unique/.test(e.message ?? ''));
      const attempt = async (slugOverride?: string) =>
        db
          .from('kb_documents')
          .update({
            space_id: input.targetSpaceId,
            parent_id: null,
            ...(slugOverride ? { slug: slugOverride } : {}),
          })
          .eq('id', input.pageId)
          .select('id, slug, space_id')
          .single();

      const first = await attempt();
      if (!first.error) return first.data as Moved;
      if (!isSlugCollision(first.error)) throw first.error;
      // Slugs are unique PER SPACE (kb_documents_space_slug_unique) — the
      // frozen slug can collide in the destination (live-hit 2026-07-06:
      // moving my-space/untitled into a space that already had "untitled").
      // Dedupe with a numeric suffix, same policy as the insert trigger.
      const { data: current } = await db
        .from('kb_documents')
        .select('slug')
        .eq('id', input.pageId)
        .single();
      const base = (current as { slug: string } | null)?.slug ?? 'page';
      for (let n = 2; n <= 20; n++) {
        const retry = await attempt(`${base}-${n}`);
        if (!retry.error) return retry.data as Moved;
        if (!isSlugCollision(retry.error)) throw retry.error;
      }
      throw first.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki'] });
      queryClient.invalidateQueries({ queryKey: ['docex'] });
    },
    onError: (e: Error) => catalystToast.error(`Move failed: ${e.message}`),
  });
}

// Container key/color lookup — same rows ContextSwitcher's ItemRow reads, so a
// workspace's icon on any Wiki surface (sidebar directory, home grid) is
// IDENTICAL to its icon on Project Hub / Product Hub (canonical-icon rule:
// entity visuals come from the entity's own data, never a shared
// per-container-type glyph).
export interface WorkspaceContainerMeta {
  projectKeyById: Map<string, string>;
  productById: Map<string, { code: string; color: string | null }>;
}

export function useWorkspaceContainerMeta() {
  return useQuery({
    queryKey: ['wiki', 'workspace-container-meta'],
    queryFn: async (): Promise<WorkspaceContainerMeta> => {
      const [{ data: projects }, { data: products }] = await Promise.all([
        // v_project_list — same source ContextSwitcher's project switcher reads
        // (the raw `projects` table is RLS-restricted for direct client reads).
        supabase.from('v_project_list').select('id, project_key'),
        supabase.from('products').select('id, code, color'),
      ]);
      const projectKeyById = new Map(
        ((projects ?? []) as Array<{ id: string; project_key: string }>).map((p) => [p.id, p.project_key]),
      );
      const productById = new Map(
        ((products ?? []) as Array<{ id: string; code: string; color: string | null }>).map((p) => [
          p.id,
          { code: p.code, color: p.color },
        ]),
      );
      return { projectKeyById, productById };
    },
    staleTime: 5 * 60_000,
  });
}

export function useWikiWorkspaceBySlug(slugOrId: string | undefined | null) {
  return useQuery({
    queryKey: ['wiki', 'workspace', slugOrId],
    enabled: !!slugOrId,
    queryFn: async (): Promise<WikiWorkspace | null> => {
      if (!slugOrId) return null;
      const field = isValidUUID(slugOrId) ? 'id' : 'slug';
      const { data, error } = await db
        .from('kb_doc_spaces')
        .select('*')
        .eq(field, slugOrId)
        .maybeSingle();
      if (error) throw error;
      return (data as WikiWorkspace) ?? null;
    },
  });
}

// ---------------------------------------------------------------------------
// Page tree + pages
// ---------------------------------------------------------------------------

export function useWikiPageTree(workspaceId: string | undefined | null) {
  return useQuery({
    queryKey: ['wiki', 'tree', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<WikiPageSummary[]> => {
      const { data, error } = await db
        .from('kb_documents')
        .select(PAGE_SUMMARY_COLS)
        .eq('space_id', workspaceId)
        .eq('is_template', false)
        .order('parent_id', { ascending: true, nullsFirst: true })
        .order('position')
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as WikiPageSummary[];
    },
  });
}

export function useWikiPageBySlug(
  workspaceId: string | undefined | null,
  slugOrId: string | undefined | null,
) {
  return useQuery({
    queryKey: ['wiki', 'page', workspaceId, slugOrId],
    enabled: !!workspaceId && !!slugOrId,
    queryFn: async (): Promise<WikiPage | null> => {
      if (!workspaceId || !slugOrId) return null;
      const field = isValidUUID(slugOrId) ? 'id' : 'slug';
      const { data, error } = await db
        .from('kb_documents')
        .select('*')
        .eq('space_id', workspaceId)
        .eq(field, slugOrId)
        .maybeSingle();
      if (error) throw error;
      return (data as WikiPage) ?? null;
    },
    // A slug can be REASSIGNED to a brand-new row (delete a page, create
    // another with the same auto-derived title/slug within the app's
    // global 15-min staleTime + localStorage-persisted cache) — this query
    // MUST NOT serve a stale (workspaceId, slug) → id binding, or every
    // subsequent mutate() silently writes to a phantom, already-deleted
    // row while the visible page's real edits are never persisted
    // (reproduced live 2026-07-06: PATCH returned 200 with zero rows
    // matched, and the actual open page kept its content forever null).
    staleTime: 0,
  });
}

export interface CreateWikiPageInput {
  spaceId: string;
  title: string;
  parentId?: string | null;
  content?: unknown;
  icon?: string | null;
  templateKey?: string | null;
}

export function useCreateWikiPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWikiPageInput): Promise<WikiPage> => {
      const { data: auth } = await supabase.auth.getUser();
      // Next sibling position: append at the end of the target parent
      const { data: siblings } = await db
        .from('kb_documents')
        .select('position')
        .eq('space_id', input.spaceId)
        .is('parent_id', input.parentId ?? null)
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = siblings?.length ? (siblings[0].position ?? 0) + 1 : 0;

      // A page is born with a real Yjs snapshot, not ydoc_state=null. Without
      // this, the FIRST collaborative session had to seed the shared
      // fragment lazily per-client — if two+ people cold-open a brand-new
      // page at the same instant, each independently seeds an "empty
      // paragraph" into the still-unsynced fragment, and the CRDT merge
      // keeps only one, silently discarding whichever peer's first
      // keystrokes landed in the paragraph that lost the race (reproduced
      // live with a 5-tab load test). Only the CREATING client ever runs
      // this — page creation can't race with itself.
      const { createInitialYdocState } = await import('@/components/wiki-hub/editor/seedYdoc');
      const ydocState = await createInitialYdocState((input.content as never) ?? []);

      const { data, error } = await db
        .from('kb_documents')
        .insert({
          space_id: input.spaceId,
          title: input.title,
          parent_id: input.parentId ?? null,
          position: nextPos,
          content: input.content ?? [],
          content_format: 'blocknote',
          ydoc_state: ydocState,
          icon: input.icon ?? null,
          template_key: input.templateKey ?? null,
          created_by: auth?.user?.id ?? null,
          // kb_documents.updated_by is NOT NULL — set it on create too.
          updated_by: auth?.user?.id ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as WikiPage;
    },
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ['wiki', 'tree', page.space_id] });
    },
    onError: (e) => {
      catalystToast.error('Could not create the page', e instanceof Error ? e.message : undefined);
    },
  });
}

export interface UpdateWikiPageInput {
  id: string;
  spaceId: string;
  patch: Partial<
    Pick<WikiPage, 'title' | 'icon' | 'cover_url' | 'published_at' | 'ydoc_state'>
  > & { content?: unknown; content_text?: string; content_format?: 'blocknote' };
  /** Optimistic-concurrency guard: only write if the row's updated_at still
   *  matches this value. A mismatch (someone else saved) throws WIKI_CONFLICT
   *  instead of silently overwriting their edit. */
  guardUpdatedAt?: string | null;
}

/** Thrown by useUpdateWikiPage when guardUpdatedAt no longer matches. */
export const WIKI_CONFLICT = 'WIKI_CONFLICT';

export function useUpdateWikiPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch, guardUpdatedAt }: UpdateWikiPageInput): Promise<string | null> => {
      const { data: auth } = await supabase.auth.getUser();
      let q = db
        .from('kb_documents')
        .update({ ...patch, updated_by: auth?.user?.id ?? null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (guardUpdatedAt) q = q.eq('updated_at', guardUpdatedAt);
      const { data, error } = await q.select('updated_at');
      if (error) throw error;
      if (guardUpdatedAt && (!data || data.length === 0)) throw new Error(WIKI_CONFLICT);
      return (data?.[0]?.updated_at as string | undefined) ?? null;
    },
    onSuccess: (_d, { spaceId, id, patch }) => {
      // Content autosaves must not refetch the page being edited (would
      // clobber local editor state); only tree metadata changes do.
      if (patch.title !== undefined || patch.icon !== undefined) {
        qc.invalidateQueries({ queryKey: ['wiki', 'tree', spaceId] });
      }
    },
  });
}

export interface MoveWikiPageInput {
  id: string;
  spaceId: string;
  newParentId: string | null;
  newPosition: number;
}

/** Reparent/reorder a page. Positions of siblings are compacted client-side. */
export function useMoveWikiPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newParentId, newPosition }: MoveWikiPageInput) => {
      const { error } = await db
        .from('kb_documents')
        .update({ parent_id: newParentId, position: newPosition })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, { spaceId }) => {
      qc.invalidateQueries({ queryKey: ['wiki', 'tree', spaceId] });
    },
  });
}

export function useDeleteWikiPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; spaceId: string }) => {
      const { error } = await db.from('kb_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, { spaceId }) => {
      qc.invalidateQueries({ queryKey: ['wiki', 'tree', spaceId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Work-item links (page ↔ BR/epic/story/task/defect/…)
// ---------------------------------------------------------------------------

export function useWikiPageWorkItemLinks(documentId: string | undefined | null) {
  return useQuery({
    queryKey: ['wiki', 'doc-links', documentId],
    enabled: !!documentId,
    queryFn: async (): Promise<WikiDocumentLink[]> => {
      const { data, error } = await db
        .from('kb_document_links')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as WikiDocumentLink[];
    },
  });
}

/** All wiki pages linked to a work item — powers the "Pages" section on detail views. */
export function useWikiPagesForWorkItem(
  entityType: WikiEntityType | undefined,
  entityId: string | undefined | null,
) {
  return useQuery({
    queryKey: ['wiki', 'pages-for-item', entityType, entityId],
    enabled: !!entityType && !!entityId,
    queryFn: async () => {
      const { data, error } = await db
        .from('kb_document_links')
        .select(
          `id, link_origin, created_at, document:kb_documents (${PAGE_SUMMARY_COLS}, space:kb_doc_spaces (id, slug, name))`,
        )
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as Array<
        Pick<WikiDocumentLink, 'id' | 'link_origin' | 'created_at'> & {
          document: (WikiPageSummary & { space: { id: string; slug: string; name: string } | null }) | null;
        }
      >;
    },
  });
}

export function useLinkPageToWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      documentId: string;
      entityType: WikiEntityType;
      entityId: string;
      origin?: 'manual' | 'mention';
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db.from('kb_document_links').upsert(
        {
          document_id: input.documentId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          link_origin: input.origin ?? 'manual',
          created_by: auth?.user?.id ?? null,
        },
        { onConflict: 'document_id,entity_type,entity_id', ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: (_d, { documentId, entityType, entityId }) => {
      qc.invalidateQueries({ queryKey: ['wiki', 'doc-links', documentId] });
      qc.invalidateQueries({ queryKey: ['wiki', 'pages-for-item', entityType, entityId] });
    },
  });
}

export function useUnlinkPageFromWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { linkId: string; documentId: string; entityType: string; entityId: string }) => {
      const { error } = await db.from('kb_document_links').delete().eq('id', input.linkId);
      if (error) throw error;
    },
    onSuccess: (_d, { documentId, entityType, entityId }) => {
      qc.invalidateQueries({ queryKey: ['wiki', 'doc-links', documentId] });
      qc.invalidateQueries({ queryKey: ['wiki', 'pages-for-item', entityType, entityId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Search, recents, favorites, versions (Pass D — CAT-DOCS-NOTION-20260704-001)
// ---------------------------------------------------------------------------

export interface DocexSearchHit extends WikiPageSummary {
  content_text: string | null;
}

/** Full-text search over every page the user can see. Runs the tsvector
 *  websearch and a title-ilike in parallel (the ilike lane covers Arabic and
 *  partial words the `simple` FTS config misses), merged unique. */
export function useDocexSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['wiki', 'search', q],
    enabled: q.length >= 2,
    queryFn: async (): Promise<DocexSearchHit[]> => {
      const cols = `${PAGE_SUMMARY_COLS}, content_text`;
      const [fts, ilike] = await Promise.all([
        db
          .from('kb_documents')
          .select(cols)
          .eq('is_template', false)
          .textSearch('search_vector', q, { type: 'websearch', config: 'simple' })
          .limit(20),
        db
          .from('kb_documents')
          .select(cols)
          .eq('is_template', false)
          .or(`title.ilike.%${q}%,content_text.ilike.%${q}%`)
          .order('updated_at', { ascending: false })
          .limit(20),
      ]);
      const seen = new Set<string>();
      const merged: DocexSearchHit[] = [];
      for (const row of [...(fts.data ?? []), ...(ilike.data ?? [])]) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          merged.push(row as DocexSearchHit);
        }
      }
      return merged.slice(0, 25);
    },
  });
}

/** Most recently edited pages across all visible workspaces (home rail). */
export function useDocexRecents(limit = 10) {
  return useQuery({
    queryKey: ['wiki', 'recents', limit],
    queryFn: async (): Promise<WikiPageSummary[]> => {
      const { data, error } = await db
        .from('kb_documents')
        .select(PAGE_SUMMARY_COLS)
        .eq('is_template', false)
        .order('updated_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as WikiPageSummary[];
    },
  });
}

export interface DocexFavorite {
  id: string;
  document_id: string;
  page: WikiPageSummary | null;
}

/** The current user's starred pages (home rail + page-chrome star state). */
export function useDocexFavorites() {
  return useQuery({
    queryKey: ['wiki', 'favorites'],
    queryFn: async (): Promise<DocexFavorite[]> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return [];
      const { data, error } = await db
        .from('kb_document_favorites')
        .select('id, document_id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      const favs = (data ?? []) as { id: string; document_id: string }[];
      if (!favs.length) return [];
      const { data: pages } = await db
        .from('kb_documents')
        .select(PAGE_SUMMARY_COLS)
        .in('id', favs.map((f) => f.document_id));
      const byId = new Map((pages ?? []).map((p: WikiPageSummary) => [p.id, p]));
      return favs.map((f) => ({ ...f, page: (byId.get(f.document_id) as WikiPageSummary) ?? null }));
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, favoriteId }: { documentId: string; favoriteId?: string }) => {
      if (favoriteId) {
        const { error } = await db.from('kb_document_favorites').delete().eq('id', favoriteId);
        if (error) throw error;
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from('kb_document_favorites')
        .insert({ document_id: documentId, user_id: auth?.user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wiki', 'favorites'] }),
    onError: () => catalystToast.error('Could not update favorites'),
  });
}

export interface DocexVersion {
  id: string;
  document_id: string;
  version_number: number;
  title: string | null;
  content: unknown;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export function useDocexVersions(documentId: string) {
  return useQuery({
    queryKey: ['wiki', 'versions', documentId],
    enabled: !!documentId,
    queryFn: async (): Promise<DocexVersion[]> => {
      const { data, error } = await db
        .from('kb_document_versions')
        .select('id, document_id, version_number, title, content, change_summary, created_by, created_at')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as DocexVersion[];
    },
  });
}

/** Snapshot the given state as the next version row. */
export function useSaveVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      documentId: string;
      title: string;
      content: unknown;
      contentText: string;
      changeSummary?: string;
    }) => {
      const { data: last } = await db
        .from('kb_document_versions')
        .select('version_number')
        .eq('document_id', input.documentId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db.from('kb_document_versions').insert({
        document_id: input.documentId,
        version_number: ((last?.version_number as number | undefined) ?? 0) + 1,
        title: input.title,
        content: input.content,
        content_text: input.contentText,
        change_summary: input.changeSummary ?? null,
        created_by: auth?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, { documentId }) =>
      qc.invalidateQueries({ queryKey: ['wiki', 'versions', documentId] }),
  });
}

/** Duplicate a page (content copy, "Copy of" title, sibling position; the
 *  DB slug trigger derives + dedupes the new slug). Returns the new page. */
export function useDuplicatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { page: WikiPage }): Promise<WikiPage> => {
      const { page } = input;
      const { data: auth } = await supabase.auth.getUser();
      const { data: siblings } = await db
        .from('kb_documents')
        .select('position')
        .eq('space_id', page.space_id)
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = ((siblings?.[0]?.position as number | undefined) ?? 0) + 1;
      const { data, error } = await db
        .from('kb_documents')
        .insert({
          space_id: page.space_id,
          title: `Copy of ${page.title || 'Untitled'}`,
          parent_id: page.parent_id,
          position: nextPos,
          content: page.content ?? [],
          content_text: (page as { content_text?: string }).content_text ?? null,
          content_format: page.content_format,
          icon: page.icon,
          cover_url: page.cover_url,
          created_by: auth?.user?.id ?? null,
          updated_by: auth?.user?.id ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as WikiPage;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['wiki', 'tree', created.space_id] });
    },
    onError: (e) =>
      catalystToast.error('Could not duplicate the page', e instanceof Error ? e.message : undefined),
  });
}
