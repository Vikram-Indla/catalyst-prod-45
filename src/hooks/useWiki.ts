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
  container_type: 'project' | 'product' | 'organization';
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
      return (data ?? []) as WikiWorkspace[];
    },
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

      const { data, error } = await db
        .from('kb_documents')
        .insert({
          space_id: input.spaceId,
          title: input.title,
          parent_id: input.parentId ?? null,
          position: nextPos,
          content: input.content ?? [],
          content_format: 'blocknote',
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
    Pick<WikiPage, 'title' | 'icon' | 'cover_url' | 'published_at'>
  > & { content?: unknown; content_text?: string; content_format?: 'blocknote' };
}

export function useUpdateWikiPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: UpdateWikiPageInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from('kb_documents')
        .update({ ...patch, updated_by: auth?.user?.id ?? null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
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
