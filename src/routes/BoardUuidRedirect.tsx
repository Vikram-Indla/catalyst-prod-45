/**
 * BoardUuidRedirect — resolves legacy UUID-based board URLs to slug URLs.
 * Mounted OUTSIDE CatalystShell (per FullAppRoutes.tsx lines 213–220 pattern)
 * to avoid Navigate re-render loops inside the shell.
 *
 * Matches: /project-hub/:key/boards/:boardId (where boardId is a UUID)
 * Redirects to: /project-hub/:key/boards/:slug
 */
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/utils/assertUuid';

export function BoardUuidRedirect() {
  const { key, boardId } = useParams<{ key: string; boardId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!boardId || !key) return;
    if (!isValidUUID(boardId)) return; // already a slug — shouldn't be here
    (supabase as any)
      .from('boards')
      .select('slug')
      .eq('id', boardId)
      .is('deleted_at', null)
      .maybeSingle()
      .then(({ data }: { data: { slug: string } | null }) => {
        if (data?.slug) {
          navigate(`/project-hub/${key}/boards/${data.slug}`, { replace: true });
        }
      });
  }, [boardId, key, navigate]);

  return null;
}
