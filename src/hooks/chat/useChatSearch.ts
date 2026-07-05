/**
 * useChatSearch — global chat search across messages, channels, people, projects.
 * Calls the chat_search SECURITY DEFINER RPC. Results are RLS-filtered for
 * message + channel hits (only member-visible). People + projects are org-wide.
 *
 * Debounces internally via the caller (DockDirectory passes a debounced query).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ChatSearchScope = 'all' | 'messages' | 'channels' | 'people' | 'projects' | 'files';

export interface ChatSearchHit {
  resultType: 'message' | 'channel' | 'person' | 'project' | 'file';
  id: string;
  title: string;
  subtitle: string | null;
  conversationId: string | null;
  rank: number;
}

interface RpcRow {
  result_type: string;
  id: string;
  title: string | null;
  subtitle: string | null;
  conversation_id: string | null;
  rank: number;
}

/**
 * Parse Slack-style modifiers out of a free-text query.
 *   from:<profile-uuid>     restrict to messages authored by user
 *   in:<conversation-uuid>  restrict to a single conversation
 *   has:link|file|image     restrict to messages carrying that artifact
 * Unknown tokens are left in the residual query.
 */
function parseModifiers(raw: string) {
  const tokens = raw.split(/\s+/);
  let q = '';
  let fromUser: string | null = null;
  let inConv: string | null = null;
  let has: string | null = null;
  for (const t of tokens) {
    if (t.startsWith('from:')) fromUser = t.slice(5) || null;
    else if (t.startsWith('in:')) inConv = t.slice(3) || null;
    else if (t.startsWith('has:')) {
      const v = t.slice(4);
      if (v === 'link' || v === 'file' || v === 'image') has = v;
    } else {
      q = q ? q + ' ' + t : t;
    }
  }
  return { q: q.trim(), fromUser, inConv, has };
}

async function runSearch(query: string, scope: ChatSearchScope, max: number): Promise<ChatSearchHit[]> {
  const { q, fromUser, inConv, has } = parseModifiers(query.trim());
  if (!q && !fromUser && !inConv && !has) return [];
  const { data, error } = await (supabase as any).rpc('chat_search', {
    p_query: q,
    p_scope: scope,
    p_max: max,
    p_from_user: fromUser,
    p_in_conv: inConv,
    p_has: has,
  });
  if (error) console.warn('[chat] search RPC failed — returning empty results:', error);
  if (error || !data) return [];
  return (data as RpcRow[]).map((r) => ({
    resultType: r.result_type as ChatSearchHit['resultType'],
    id: r.id,
    title: r.title ?? '',
    subtitle: r.subtitle,
    conversationId: r.conversation_id,
    rank: r.rank ?? 0,
  }));
}

export function useChatSearch(query: string, scope: ChatSearchScope = 'all', max = 25) {
  const enabled = query.trim().length >= 2;
  const result = useQuery({
    queryKey: ['chat', 'search', scope, query.trim()],
    enabled,
    queryFn: () => runSearch(query, scope, max),
    staleTime: 30_000,
  });
  return {
    hits: result.data ?? [],
    isLoading: enabled && result.isLoading,
    isEnabled: enabled,
  };
}

export function groupSearchHits(hits: ChatSearchHit[]) {
  const messages: ChatSearchHit[] = [];
  const channels: ChatSearchHit[] = [];
  const people: ChatSearchHit[] = [];
  const projects: ChatSearchHit[] = [];
  const files: ChatSearchHit[] = [];
  for (const h of hits) {
    if (h.resultType === 'message') messages.push(h);
    else if (h.resultType === 'channel') channels.push(h);
    else if (h.resultType === 'person') people.push(h);
    else if (h.resultType === 'project') projects.push(h);
    else if (h.resultType === 'file') files.push(h);
  }
  return { messages, channels, people, projects, files };
}
