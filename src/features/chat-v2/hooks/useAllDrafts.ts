/**
 * useAllDrafts — the list backing the Drafts tab in the Drafts & sent
 * panel. Reads every non-empty draft for the current user and joins
 * to chat_conversations to resolve title / kind / privacy.
 *
 * Defensive — returns an empty list when the migration is unapplied
 * (the defensive flag is flipped on the first 42P01 error).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isMissingTableError } from '../lib/chatDraftsFlags';

const db = supabase as unknown as { from: (t: string) => any };

export interface DraftListItem {
  conversationId: string;
  conversationTitle: string;
  conversationKind: string;
  conversationIsPrivate: boolean;
  projectKey: string | null;
  bodyPreview: string;
  updatedAt: string;
}

interface RawDraftRow {
  conversation_id: string;
  body_md: string;
  updated_at: string;
  chat_conversations: {
    id: string;
    kind: string;
    title: string;
    is_private: boolean | null;
    project_key: string | null;
  } | null;
}

export function useAllDrafts() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery<DraftListItem[]>({
    queryKey: ['chat-v2', 'all-drafts', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await db
        .from('chat_message_drafts')
        .select(
          'conversation_id, body_md, updated_at, chat_conversations:chat_conversations(id, kind, title, is_private, project_key)',
        )
        .eq('user_id', userId)
        .neq('body_md', '')
        .order('updated_at', { ascending: false });
      if (error) {
        if (!isMissingTableError(error)) {
          console.warn('[chat-v2] all-drafts fetch failed', error);
        }
        return [];
      }
      const rows = (data ?? []) as RawDraftRow[];
      return rows
        .filter(r => r.chat_conversations !== null)
        .map<DraftListItem>(r => ({
          conversationId: r.conversation_id,
          conversationTitle: r.chat_conversations!.title,
          conversationKind: r.chat_conversations!.kind,
          conversationIsPrivate: r.chat_conversations!.is_private ?? false,
          projectKey: r.chat_conversations!.project_key,
          bodyPreview: makePreview(r.body_md),
          updatedAt: r.updated_at,
        }));
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

function makePreview(md: string): string {
  // Strip markdown wrappers and clamp for the row body line.
  const flat = md
    .replace(/[*_`~>#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (flat.length <= 120) return flat;
  return flat.slice(0, 117) + '…';
}
