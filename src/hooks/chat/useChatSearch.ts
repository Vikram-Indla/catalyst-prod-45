/**
 * useChatSearch — global chat search across messages, conversations, people and
 * projects via the chat_search RPC.
 *
 * Debounces the query (~250ms), skips empty/whitespace, and groups the flat RPC
 * rows by result_type so the QuickSwitcher can render labelled sections.
 *
 * The chat_* RPCs are not in the generated Database types yet — cast to bypass
 * typed inference (mirrors useCreateConversation).
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export type ChatSearchType = 'message' | 'conversation' | 'person' | 'project';

export interface ChatSearchRow {
  result_type: ChatSearchType;
  ref_id: string;
  title: string;
  subtitle: string | null;
  conversation_id: string | null;
}

export interface ChatSearchGroups {
  person: ChatSearchRow[];
  conversation: ChatSearchRow[];
  message: ChatSearchRow[];
  project: ChatSearchRow[];
}

const EMPTY_GROUPS: ChatSearchGroups = {
  person: [],
  conversation: [],
  message: [],
  project: [],
};

function useDebounced(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useChatSearch(query: string): {
  results: ChatSearchGroups;
  isLoading: boolean;
} {
  const debounced = useDebounced(query);
  const trimmed = debounced.trim();
  const enabled = trimmed.length > 0;

  const { data, isFetching } = useQuery({
    queryKey: ['chat', 'search', trimmed],
    enabled,
    queryFn: async (): Promise<ChatSearchRow[]> => {
      const { data: rows, error } = await db.rpc('chat_search', { p_query: trimmed });
      if (error || !Array.isArray(rows)) return [];
      return rows as ChatSearchRow[];
    },
  });

  const results = useMemo<ChatSearchGroups>(() => {
    if (!data || data.length === 0) return EMPTY_GROUPS;
    const grouped: ChatSearchGroups = { person: [], conversation: [], message: [], project: [] };
    for (const row of data) {
      const bucket = grouped[row.result_type];
      if (bucket) bucket.push(row);
    }
    return grouped;
  }, [data]);

  return { results, isLoading: enabled && isFetching };
}

export default useChatSearch;
