import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MemberStackProps {
  memberIds: string[] | null;
  memberCount: number;
  max?: number;
}

// Gradient by first letter of name
function getMemberGradient(name: string): [string, string] {
  const c = (name || '?')[0].toUpperCase();
  if ('ABCDE'.includes(c)) return ['#2563EB', '#1D4ED8'];
  if ('FGHIJ'.includes(c)) return ['#7C3AED', '#6D28D9'];
  if ('KLMNO'.includes(c)) return ['#0D9488', '#0F766E'];
  if ('PQRST'.includes(c)) return ['#F59E0B', '#D97706'];
  return ['#16A34A', '#15803D'];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

// Batch-fetch profiles for all member IDs across visible projects
const profileCache = new Map<string, { full_name: string; avatar_url: string | null }>();

export function useMemberProfiles(allMemberIds: string[]) {
  const uniqueIds = useMemo(() => {
    const uncached = allMemberIds.filter(id => !profileCache.has(id));
    return [...new Set(uncached)];
  }, [allMemberIds]);

  return useQuery({
    queryKey: ['member-profiles', uniqueIds.sort().join(',')],
    queryFn: async () => {
      if (uniqueIds.length === 0) return profileCache;
      // Batch in chunks of 100
      for (let i = 0; i < uniqueIds.length; i += 100) {
        const chunk = uniqueIds.slice(i, i + 100);
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', chunk);
        if (data) {
          data.forEach(p => profileCache.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url }));
        }
      }
      return new Map(profileCache);
    },
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60_000,
  });
}

export function MemberStack({ memberIds, memberCount, max = 3 }: MemberStackProps) {
  const ids = memberIds ?? [];
  const shown = ids.slice(0, max);
  const overflow = memberCount - shown.length;

  if (memberCount === 0) {
    return <span style={{ fontSize: 10, color: '#94A3B8' }}>—</span>;
  }

  return (
    <div className="flex items-center">
      {shown.map((id, i) => {
        const profile = profileCache.get(id);
        const name = profile?.full_name || id.substring(0, 4);
        const initials = getInitials(name);
        const [from, to] = getMemberGradient(name);
        return (
          <div
            key={id}
            className="flex items-center justify-center rounded-full border-2 border-white"
            title={name}
            style={{
              width: 24,
              height: 24,
              background: `linear-gradient(135deg, ${from}, ${to})`,
              marginLeft: i > 0 ? -7 : 0,
              fontSize: 8,
              fontWeight: 700,
              color: '#FFF',
              zIndex: max - i,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center rounded-full border-2 border-white"
          style={{
            width: 24,
            height: 24,
            background: '#F1F5F9',
            marginLeft: -7,
            fontSize: 9,
            fontWeight: 600,
            color: '#64748B',
            flexShrink: 0,
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
