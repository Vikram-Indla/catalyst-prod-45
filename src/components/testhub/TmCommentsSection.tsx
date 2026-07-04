/**
 * TmCommentsSection — canonical catalyst-ds CommentThread, backed by
 * tm_comments (G14 COL-001/002). Interim per-tm-entity comment spine until
 * the full ph_comments unification (COL-003) lands — see 09_DECISIONS.md
 * for why that unification is currently schema-blocked.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CommentThread } from '@/components/catalyst-ds';
import type { CdsComment, CdsUser } from '@/components/catalyst-ds';
import { useTmComments, useAddTmComment } from '@/hooks/test-management/useTmComments';

interface Props {
  entityType: string;
  entityId: string | undefined;
}

export function TmCommentsSection({ entityType, entityId }: Props) {
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useTmComments(entityType, entityId);
  const addComment = useAddTmComment();

  const { data: currentProfile } = useQuery({
    queryKey: ['tm-comments-current-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles').select('id, full_name, email, avatar_url').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const currentUser: CdsUser | undefined = currentProfile
    ? { id: currentProfile.id, name: currentProfile.full_name ?? currentProfile.email ?? 'You', avatarUrl: currentProfile.avatar_url ?? undefined, email: currentProfile.email ?? undefined }
    : undefined;

  const comments: CdsComment[] = useMemo(() => rows.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
    parentId: r.parent_id,
    author: {
      id: r.author_id,
      name: r.author?.full_name || r.author?.email || 'Unknown',
      avatarUrl: r.author?.avatar_url ?? undefined,
      email: r.author?.email ?? undefined,
    },
  })), [rows]);

  return (
    <CommentThread
      comments={comments}
      currentUser={currentUser}
      isLoading={isLoading}
      isSubmitting={addComment.isPending}
      emptyMessage="No comments yet."
      onAddComment={(content) => entityId && addComment.mutate({ entityType, entityId, content })}
      onAddReply={(parentId, content) => entityId && addComment.mutate({ entityType, entityId, content, parentId })}
    />
  );
}
