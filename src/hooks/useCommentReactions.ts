/**
 * useCommentReactions — fetch + toggle emoji reactions for a single
 * ph_comments row.
 *
 * Used by the "Reply to mentions" / "Reply to comments" cards on the For
 * You page to persist reactions the same way Jira does — one row per
 * (comment, user, emoji) tuple in `ph_comment_reactions`.
 *
 * Schema reminder (from src/integrations/supabase/types.ts):
 *   ph_comment_reactions {
 *     id:         uuid
 *     comment_id: uuid → ph_comments(id)
 *     user_id:    uuid
 *     emoji:      text   // emoji shortcode ("fire", "heart", ...) or char
 *     created_at: timestamptz
 *   }
 *
 * This hook is intentionally narrow: one commentId, one query key, one
 * toggle mutation. The broader activity feed in useWorkItemActivity.ts
 * fans out across the whole work-item and groups reactions per comment;
 * this hook is the single-comment chokepoint the For You cards use.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CommentReactionAggregate {
  /** The emoji key stored in the row (e.g. "fire", "heart", "thumb"). */
  emoji: string;
  /** How many distinct users reacted with this emoji. */
  count: number;
  /** True iff the calling user is one of them. */
  reactedByMe: boolean;
}

export function useCommentReactions(commentId: string | null | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['ph-comment-reactions', commentId];

  const { data: reactions = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<CommentReactionAggregate[]> => {
      if (!commentId) return [];

      // Who is the current viewer? We need their id to compute reactedByMe.
      const { data: { user } } = await supabase.auth.getUser();
      const myId = user?.id;

      const { data, error } = await supabase
        .from('ph_comment_reactions')
        .select('emoji, user_id')
        .eq('comment_id', commentId);

      if (error) {
        // Treat a fetch failure as "no reactions" rather than throwing —
        // the For You card is informational; we don't want a transient
        // Supabase blip to break the whole feed. Log for observability.
        console.warn('[useCommentReactions] fetch failed', error);
        return [];
      }

      // Aggregate per emoji. Order by count desc so the most-used reactions
      // float to the left — matches how Jira renders render-reactions.
      const agg = new Map<string, { count: number; reactedByMe: boolean }>();
      for (const r of data || []) {
        const entry = agg.get(r.emoji) || { count: 0, reactedByMe: false };
        entry.count += 1;
        if (myId && r.user_id === myId) entry.reactedByMe = true;
        agg.set(r.emoji, entry);
      }

      return [...agg.entries()]
        .map(([emoji, v]) => ({ emoji, count: v.count, reactedByMe: v.reactedByMe }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!commentId,
    // Reactions can change often via other users; keep a short stale time.
    staleTime: 15_000,
  });

  /**
   * Toggle one emoji for the current user:
   *   - if a row exists for (comment, user, emoji) → delete it
   *   - otherwise → insert it
   * We do optimistic cache updates so the ReactionStrip animates instantly.
   */
  const toggleReaction = useMutation({
    mutationFn: async (emoji: string) => {
      if (!commentId) throw new Error('commentId required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Look for an existing reaction by this user on this comment+emoji.
      const { data: existing } = await supabase
        .from('ph_comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('ph_comment_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ph_comment_reactions')
          .insert({ comment_id: commentId, user_id: user.id, emoji });
        if (error) throw error;
      }
    },
    onMutate: async (emoji: string) => {
      // Optimistic toggle — mirror the mutation on the cached aggregate so
      // the chip flips state instantly. Rolled back in onError.
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<CommentReactionAggregate[]>(queryKey) ?? [];

      const next = [...prev];
      const idx = next.findIndex(r => r.emoji === emoji);
      if (idx >= 0) {
        const current = next[idx];
        if (current.reactedByMe) {
          // I'm un-reacting — drop my count by one.
          const nextCount = Math.max(0, current.count - 1);
          if (nextCount === 0) {
            next.splice(idx, 1);
          } else {
            next[idx] = { ...current, count: nextCount, reactedByMe: false };
          }
        } else {
          next[idx] = { ...current, count: current.count + 1, reactedByMe: true };
        }
      } else {
        next.push({ emoji, count: 1, reactedByMe: true });
      }

      queryClient.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (err, _emoji, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      console.warn('[useCommentReactions] toggle failed', err);
      toast.error('Could not save reaction');
    },
    onSettled: () => {
      // Final truth: re-fetch after settle so any concurrent reactions from
      // other users are reflected.
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    reactions,
    isLoading,
    toggleReaction: (emoji: string) => toggleReaction.mutate(emoji),
    isToggling: toggleReaction.isPending,
  };
}
