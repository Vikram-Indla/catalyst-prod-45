/**
 * useConversationMembers — full member roster for a conversation.
 * Joins chat_conversation_members → profiles. Returns id, name, email,
 * role (admin/member), joined_at, last_read_at, is_muted.
 *
 * RLS: SELECT on chat_conversation_members is gated by the recursion-safe
 * chat_is_member helper (CLAUDE.md 2026-06-03), so only members of the
 * conversation can read its roster.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationMember {
  userId: string;
  name: string;
  email: string | null;
  role: 'admin' | 'member';
  joinedAt: string;
  lastReadAt: string | null;
  isMuted: boolean;
}

const db = supabase as unknown as { from: (table: string) => any };

interface MemberRow {
  user_id: string;
  role: string | null;
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | { id: string; full_name: string | null; email: string | null }[] | null;
}

function pickProfile(p: MemberRow['profiles']): { id: string; full_name: string | null; email: string | null } | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

async function fetchMembers(conversationId: string): Promise<ConversationMember[]> {
  const { data, error } = await db
    .from('chat_conversation_members')
    .select(`
      user_id, role, joined_at, last_read_at, is_muted,
      profiles:user_id ( id, full_name, email )
    `)
    .eq('conversation_id', conversationId)
    .order('role', { ascending: true })
    .order('joined_at', { ascending: true });

  if (error || !data) return [];
  return (data as MemberRow[])
    .map((row) => {
      const p = pickProfile(row.profiles);
      return {
        userId: row.user_id,
        name: p?.full_name ?? '',
        email: p?.email ?? null,
        role: (row.role === 'admin' ? 'admin' : 'member') as 'admin' | 'member',
        joinedAt: row.joined_at,
        lastReadAt: row.last_read_at,
        isMuted: !!row.is_muted,
      };
    });
}

export function useConversationMembers(conversationId: string | null) {
  return useQuery({
    queryKey: ['chat', 'members', conversationId],
    enabled: !!conversationId,
    queryFn: () => fetchMembers(conversationId!),
    staleTime: 30_000,
  });
}
