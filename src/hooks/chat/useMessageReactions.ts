/**
 * useMessageReactions — fetch reactor names for a set of message IDs.
 * - Queries chat_message_reactions + profiles to get reactor info
 * - Returns a Map: emoji -> [{ userId, userName }, ...]
 * - Defensive: missing tables/data resolve to empty results
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Reactor {
  userId: string;
  userName: string;
}

const db = supabase as unknown as { from: (table: string) => any };

interface ReactionWithAuthor {
  message_id: string;
  emoji: string;
  user_id: string;
  full_name: string | null;
}

/**
 * Fetch reactor names for reactions on a given message.
 * Returns a Map: emoji -> [{ userId, userName }, ...]
 */
async function fetchReactors(messageId: string): Promise<Map<string, Reactor[]>> {
  try {
    const { data } = await db
      .from('chat_message_reactions')
      .select('message_id, emoji, user_id, profiles!inner(full_name)')
      .eq('message_id', messageId);

    if (!data || !Array.isArray(data)) {
      return new Map();
    }

    const byEmoji = new Map<string, Reactor[]>();
    for (const row of data as any[]) {
      const emoji = row.emoji as string;
      const userId = row.user_id as string;
      const userName = row.profiles?.full_name ?? 'Unknown';

      if (!byEmoji.has(emoji)) {
        byEmoji.set(emoji, []);
      }
      byEmoji.get(emoji)!.push({ userId, userName });
    }
    return byEmoji;
  } catch {
    return new Map();
  }
}

export interface UseMessageReactionsOptions {
  messageId: string | null;
  enabled?: boolean;
}

export function useMessageReactions({ messageId, enabled = true }: UseMessageReactionsOptions): {
  reactorsByEmoji: Map<string, Reactor[]>;
  isLoading: boolean;
} {
  const [reactorsByEmoji, setReactorsByEmoji] = useState<Map<string, Reactor[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!messageId || !enabled) {
      setReactorsByEmoji(new Map());
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const result = await fetchReactors(messageId);
        setReactorsByEmoji(result);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [messageId, enabled]);

  return {
    reactorsByEmoji,
    isLoading,
  };
}
