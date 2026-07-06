/**
 * useDocexDatabase — data layer for Docex databases with views
 * (CAT-DOCEX-DB-COEDIT-20260705-001 D1). Tables: kb_databases,
 * kb_database_fields, kb_database_rows, kb_database_views (staging
 * migration 20260706100000). Same untyped escape hatch as useWiki.ts —
 * kb_* tables postdate the generated Supabase types.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

const db = supabase as unknown as {
  from: (table: string) => any;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocexFieldType =
  | 'text' | 'number' | 'select' | 'multi_select' | 'date'
  | 'person' | 'checkbox' | 'url' | 'relation';

export interface DocexDatabase {
  id: string;
  space_id: string;
  page_id: string | null;
  name: string;
  icon: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface DocexField {
  id: string;
  database_id: string;
  name: string;
  type: DocexFieldType;
  /** select/multi_select: { choices: [{id,label,color}] } */
  options: { choices?: { id: string; label: string; color?: string }[] };
  position: number;
  width_px: number | null;
  is_visible_default: boolean;
}

export interface DocexRow {
  id: string;
  database_id: string;
  page_id: string | null;
  values: Record<string, unknown>;
  position: number;
  created_at: string;
  updated_at: string;
}

export type DocexViewKind = 'table' | 'board' | 'list' | 'gallery' | 'calendar';

export interface DocexViewConfig {
  filters?: { fieldId: string; op: 'eq' | 'contains' | 'is_empty' | 'not_empty'; value?: unknown }[];
  sorts?: { fieldId: string; dir: 'asc' | 'desc' }[];
  group_by_field?: string | null;
  visible_fields?: string[];
  column_order?: string[];
}

export interface DocexView {
  id: string;
  database_id: string;
  name: string;
  kind: DocexViewKind;
  config: DocexViewConfig;
  position: number;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useDocexDatabases(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['docex-db', 'list', spaceId],
    enabled: !!spaceId,
    queryFn: async (): Promise<DocexDatabase[]> => {
      const { data, error } = await db
        .from('kb_databases')
        .select('*')
        .eq('space_id', spaceId)
        .order('name');
      if (error) throw error;
      return (data ?? []) as DocexDatabase[];
    },
  });
}

export function useDocexDatabaseBySlug(spaceId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ['docex-db', 'one', spaceId, slug],
    enabled: !!spaceId && !!slug,
    queryFn: async (): Promise<DocexDatabase | null> => {
      const { data, error } = await db
        .from('kb_databases')
        .select('*')
        .eq('space_id', spaceId)
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return (data as DocexDatabase) ?? null;
    },
  });
}

export function useDocexDatabaseById(id: string | undefined) {
  return useQuery({
    queryKey: ['docex-db', 'by-id', id],
    enabled: !!id,
    staleTime: 0,
    queryFn: async (): Promise<DocexDatabase | null> => {
      const { data, error } = await db.from('kb_databases').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return (data as DocexDatabase) ?? null;
    },
  });
}

export function useDocexFields(databaseId: string | undefined) {
  return useQuery({
    queryKey: ['docex-db', 'fields', databaseId],
    enabled: !!databaseId,
    staleTime: 0,
    queryFn: async (): Promise<DocexField[]> => {
      const { data, error } = await db
        .from('kb_database_fields')
        .select('*')
        .eq('database_id', databaseId)
        .order('position');
      if (error) throw error;
      return (data ?? []) as DocexField[];
    },
  });
}

export function useDocexRows(databaseId: string | undefined) {
  return useQuery({
    queryKey: ['docex-db', 'rows', databaseId],
    enabled: !!databaseId,
    staleTime: 0,
    queryFn: async (): Promise<DocexRow[]> => {
      const { data, error } = await db
        .from('kb_database_rows')
        .select('*')
        .eq('database_id', databaseId)
        .order('position');
      if (error) throw error;
      return (data ?? []) as DocexRow[];
    },
  });
}

export function useDocexViews(databaseId: string | undefined) {
  return useQuery({
    queryKey: ['docex-db', 'views', databaseId],
    enabled: !!databaseId,
    staleTime: 0,
    queryFn: async (): Promise<DocexView[]> => {
      const { data, error } = await db
        .from('kb_database_views')
        .select('*')
        .eq('database_id', databaseId)
        .order('position');
      if (error) throw error;
      return (data ?? []) as DocexView[];
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a database seeded like Notion: Name/Status/Due fields + Table view. */
export function useCreateDocexDatabase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { spaceId: string; name: string }): Promise<DocexDatabase> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      const { data, error } = await db
        .from('kb_databases')
        .insert({ space_id: input.spaceId, name: input.name, created_by: uid, updated_by: uid })
        .select('*')
        .single();
      if (error) throw error;
      const created = data as DocexDatabase;
      // NB: batch inserts need UNIFORM keys per row (PostgREST 400s on mixed
      // column sets) — every row carries options, even when empty.
      const { error: fErr } = await db.from('kb_database_fields').insert([
        { database_id: created.id, name: 'Name', type: 'text', position: 0, options: {} },
        {
          database_id: created.id,
          name: 'Status',
          type: 'select',
          position: 1,
          options: {
            choices: [
              { id: 'todo', label: 'To do', color: 'default' },
              { id: 'doing', label: 'In progress', color: 'inprogress' },
              { id: 'done', label: 'Done', color: 'success' },
            ],
          },
        },
        { database_id: created.id, name: 'Due', type: 'date', position: 2, options: {} },
      ]);
      if (fErr) throw fErr;
      const { error: vErr } = await db
        .from('kb_database_views')
        .insert({ database_id: created.id, name: 'Table', kind: 'table', position: 0 });
      if (vErr) throw vErr;
      return created;
    },
    onSuccess: (created) => qc.invalidateQueries({ queryKey: ['docex-db', 'list', created.space_id] }),
    onError: (e) =>
      catalystToast.error('Could not create the database', e instanceof Error ? e.message : undefined),
  });
}

export function useCreateDocexView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      databaseId: string;
      name: string;
      kind: DocexViewKind;
      position: number;
      config?: DocexViewConfig;
    }) => {
      const { data, error } = await db
        .from('kb_database_views')
        .insert({
          database_id: input.databaseId,
          name: input.name,
          kind: input.kind,
          position: input.position,
          config: input.config ?? {},
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as DocexView;
    },
    onSuccess: (_d, { databaseId }) =>
      qc.invalidateQueries({ queryKey: ['docex-db', 'views', databaseId] }),
    onError: (e) =>
      catalystToast.error('Could not add the view', e instanceof Error ? e.message : undefined),
  });
}

export function useCreateDocexField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      databaseId: string;
      name: string;
      type: DocexFieldType;
      position: number;
      options?: DocexField['options'];
    }) => {
      const { error } = await db.from('kb_database_fields').insert({
        database_id: input.databaseId,
        name: input.name,
        type: input.type,
        position: input.position,
        options: input.options ?? {},
      });
      if (error) throw error;
    },
    onSuccess: (_d, { databaseId }) =>
      qc.invalidateQueries({ queryKey: ['docex-db', 'fields', databaseId] }),
    onError: (e) =>
      catalystToast.error('Could not add the field', e instanceof Error ? e.message : undefined),
  });
}

export function useUpdateDocexField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fieldId: string;
      databaseId: string;
      patch: Partial<Pick<DocexField, 'name' | 'type' | 'options' | 'position'>>;
    }) => {
      const { error } = await db.from('kb_database_fields').update(input.patch).eq('id', input.fieldId);
      if (error) throw error;
    },
    onSuccess: (_d, { databaseId }) =>
      qc.invalidateQueries({ queryKey: ['docex-db', 'fields', databaseId] }),
    onError: (e) =>
      catalystToast.error('Could not update the field', e instanceof Error ? e.message : undefined),
  });
}

export function useDeleteDocexField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { fieldId: string; databaseId: string }) => {
      const { error } = await db.from('kb_database_fields').delete().eq('id', input.fieldId);
      if (error) throw error;
    },
    onSuccess: (_d, { databaseId }) =>
      qc.invalidateQueries({ queryKey: ['docex-db', 'fields', databaseId] }),
    onError: (e) =>
      catalystToast.error('Could not delete the field', e instanceof Error ? e.message : undefined),
  });
}

export function useCreateDocexRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { databaseId: string; values?: Record<string, unknown>; position: number }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      const { error } = await db.from('kb_database_rows').insert({
        database_id: input.databaseId,
        values: input.values ?? {},
        position: input.position,
        created_by: uid,
        updated_by: uid,
      });
      if (error) throw error;
    },
    onSuccess: (_d, { databaseId }) =>
      qc.invalidateQueries({ queryKey: ['docex-db', 'rows', databaseId] }),
    onError: (e) =>
      catalystToast.error('Could not add the row', e instanceof Error ? e.message : undefined),
  });
}

export function useUpdateDocexRowValues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rowId: string; databaseId: string; values: Record<string, unknown> }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from('kb_database_rows')
        .update({ values: input.values, updated_by: auth?.user?.id ?? null, updated_at: new Date().toISOString() })
        .eq('id', input.rowId);
      if (error) throw error;
    },
    onSuccess: (_d, { databaseId }) =>
      qc.invalidateQueries({ queryKey: ['docex-db', 'rows', databaseId] }),
    onError: (e) =>
      catalystToast.error('Could not save the cell', e instanceof Error ? e.message : undefined),
  });
}

export function useDeleteDocexRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rowId: string; databaseId: string }) => {
      const { error } = await db.from('kb_database_rows').delete().eq('id', input.rowId);
      if (error) throw error;
    },
    onSuccess: (_d, { databaseId }) =>
      qc.invalidateQueries({ queryKey: ['docex-db', 'rows', databaseId] }),
  });
}

export function useUpdateDocexViewConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { viewId: string; databaseId: string; config: DocexViewConfig }) => {
      const { error } = await db
        .from('kb_database_views')
        .update({ config: input.config })
        .eq('id', input.viewId);
      if (error) throw error;
    },
    onSuccess: (_d, { databaseId }) =>
      qc.invalidateQueries({ queryKey: ['docex-db', 'views', databaseId] }),
  });
}
