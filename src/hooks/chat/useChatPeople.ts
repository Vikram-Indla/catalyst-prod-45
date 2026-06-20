/**
 * useChatPeople — roster for the chat people panel.
 *
 * Source: resource_inventory where is_active and profile_id is not null.
 * Presence: joined from user_presence by profile_id (default 'offline').
 * Grouped by presence in the order: available, busy, away, offline, on_leave.
 *
 * Avatars resolve ONLY via resolveAvatarUrl(name) → local asset, else null.
 * External image URLs are banned (CLAUDE.md §19).
 *
 * Defensive: missing tables resolve to empty groups, never throw.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { ChatPeopleGroup, ChatPerson, ChatPresence } from '@/types/chat';

const db = supabase as unknown as { from: (table: string) => any };

const PRESENCE_ORDER: ChatPresence[] = ['onsite', 'remote', 'away', 'on_leave'];
const VALID_PRESENCE = new Set<ChatPresence>(PRESENCE_ORDER);

interface ResourceRow {
  id: string;
  name: string | null;
  profile_id: string | null;
  is_active: boolean | null;
  role_code: string | null;
  avatar_url: string | null;
}

interface PresenceRow {
  user_id: string;
  state: string | null;
  location?: string | null;
}

function normalizePresence(state: string | null | undefined): ChatPresence {
  if (state && VALID_PRESENCE.has(state as ChatPresence)) return state as ChatPresence;
  return 'away';
}

async function fetchPeople(): Promise<ChatPeopleGroup[]> {
  try {
    const { data: resources, error } = await db
      .from('resource_inventory')
      .select('id, name, profile_id, is_active, role_code, avatar_url')
      .eq('is_active', true)
      .not('profile_id', 'is', null)
      .order('name', { ascending: true });

    if (error || !resources) return [];

    const rows = resources as ResourceRow[];
    const profileIds = Array.from(
      new Set(rows.map((r) => r.profile_id).filter((id): id is string => !!id)),
    );

    const presenceByProfile = new Map<string, PresenceRow>();
    if (profileIds.length > 0) {
      try {
        const { data: presence } = await db
          .from('user_presence')
          .select('user_id, state, location')
          .in('user_id', profileIds);
        if (presence) {
          for (const p of presence as PresenceRow[]) presenceByProfile.set(p.user_id, p);
        }
      } catch {
        // leave map empty → everyone defaults to offline
      }
    }

    const people: ChatPerson[] = rows.map((r) => {
      const pres = r.profile_id ? presenceByProfile.get(r.profile_id) : undefined;
      return {
        id: r.id,
        profileId: r.profile_id ?? null,
        name: r.name ?? '',
        role: r.role_code ?? null,
        avatarUrl: resolveAvatarUrl(r.name),
        presence: normalizePresence(pres?.state),
        presenceNote: pres?.location ?? null,
      };
    });

    return PRESENCE_ORDER
      .map((presence) => ({
        presence,
        people: people.filter((p) => p.presence === presence),
      }))
      .filter((g) => g.people.length > 0);
  } catch {
    return [];
  }
}

export function useChatPeople(): { groups: ChatPeopleGroup[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['chat', 'people'],
    queryFn: fetchPeople,
    staleTime: 5 * 60 * 1000,
  });

  return { groups: data ?? [], isLoading };
}
