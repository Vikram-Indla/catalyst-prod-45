/**
 * useCoverGallery — reads + writes the per-work-item cover image gallery.
 *
 *   • fetches all rows in card_cover_images for (workItemId, workItemTable)
 *   • upload(file) → Supabase Storage (`attachments/covers/…`) → insert row
 *   • remove(id, storagePath) → delete row + storage file
 *
 * The SelectCoverPanel Upload tab renders the resulting thumbnails; the
 * kanban card + detail-view cover strap read the currently-active URL from
 * the work-item row's `cover` column (set separately via setCover).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type WorkItemTable =
  | 'ph_issues'
  | 'business_requests'
  | 'tasks'
  | 'rh_releases'
  | 'tm_test_cases';

export interface CoverImage {
  id: string;
  image_url: string;
  storage_path: string | null;
  created_at: string;
}

const KEY = (table: WorkItemTable, id: string) => ['cover-gallery', table, id] as const;

export function useCoverGallery(workItemTable: WorkItemTable, workItemId: string | null | undefined) {
  const queryClient = useQueryClient();

  const listQuery = useQuery<CoverImage[]>({
    queryKey: KEY(workItemTable, workItemId ?? '_none'),
    enabled: !!workItemId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('card_cover_images')
        .select('id, image_url, storage_path, created_at')
        .eq('work_item_table', workItemTable)
        .eq('work_item_id', workItemId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CoverImage[];
    },
    staleTime: 30_000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<CoverImage> => {
      if (!workItemId) throw new Error('No work item id');
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      const ext = (file.name.split('.').pop() ?? 'png').toLowerCase();
      const path = `covers/${workItemTable}/${workItemId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('card-covers')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('card-covers').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { data: row, error } = await (supabase as any)
        .from('card_cover_images')
        .insert({
          work_item_table: workItemTable,
          work_item_id: workItemId,
          image_url: publicUrl,
          storage_path: path,
          ...(uid ? { created_by: uid } : {}),
        })
        .select('id, image_url, storage_path, created_at')
        .single();
      if (error) throw error;
      return row as CoverImage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY(workItemTable, workItemId ?? '_none') });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (img: CoverImage) => {
      if (img.storage_path) {
        // Ignore storage errors — the row is authoritative; the file will be
        // orphaned but the UI stays consistent.
        await supabase.storage.from('card-covers').remove([img.storage_path]).catch(() => {});
      }
      const { error } = await (supabase as any)
        .from('card_cover_images')
        .delete()
        .eq('id', img.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY(workItemTable, workItemId ?? '_none') });
    },
  });

  return {
    images: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    upload: uploadMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    // React Query exposes the current mutation input on `variables`; use it
    // to pinpoint which thumbnail is being deleted so the panel can render
    // a spinner overlay on that specific tile instead of all of them.
    deletingId: removeMutation.isPending && removeMutation.variables
      ? removeMutation.variables.id
      : null,
  };
}
