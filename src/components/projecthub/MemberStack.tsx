import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MemberStackProps {
  memberIds: string[] | null;
  memberCount: number;
  max?: number;
}

function getMemberGradient(name: string): [string, string] {
  const c = (name || '?')[0].toUpperCase();
  const map: Record<string, [string, string]> = {
    A: ['#2563EB', '#1D4ED8'], B: ['#2563EB', '#1D4ED8'],
    C: ['#7C3AED', '#6D28D9'], D: ['#7C3AED', '#6D28D9'],
    E: ['#0D9488', '#0F766E'], F: ['#0D9488', '#0F766E'],
    G: ['#D97706', '#B45309'], H: ['#D97706', '#B45309'],
    I: ['#2563EB', '#1D4ED8'], J: ['#2563EB', '#1D4ED8'],
    K: ['#1D4ED8', '#1E3A8A'], L: ['#1D4ED8', '#1E3A8A'],
    M: ['#F59E0B', '#D97706'], N: ['#F59E0B', '#D97706'],
    O: ['#DC2626', '#B91C1C'], P: ['#DC2626', '#B91C1C'],
    Q: ['#16A34A', '#15803D'], R: ['#16A34A', '#15803D'],
    S: ['#0284C7', '#0369A1'], T: ['#0284C7', '#0369A1'],
    U: ['#0D9488', '#115E59'], V: ['#0D9488', '#115E59'],
    W: ['#0284C7', '#075985'], X: ['#0284C7', '#075985'],
    Y: ['#7C3AED', '#A78BFA'], Z: ['#7C3AED', '#A78BFA'],
  };
  return map[c] || ['#2563EB', '#1D4ED8'];
}

function getInitials(name: string): string {
  if (!name || name.length < 2) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

// Global profile cache
const profileCache = new Map<string, { full_name: string; avatar_url: string | null }>();

export function useMemberProfiles(allMemberIds: string[]) {
  const uniqueIds = useMemo(() => {
    const uncached = allMemberIds.filter(id => id && !profileCache.has(id));
    return [...new Set(uncached)];
  }, [allMemberIds]);

  return useQuery({
    queryKey: ['member-profiles-batch', uniqueIds.sort().join(',')],
    queryFn: async () => {
      if (uniqueIds.length === 0) return profileCache;
      for (let i = 0; i < uniqueIds.length; i += 100) {
        const chunk = uniqueIds.slice(i, i + 100);
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', chunk);
        if (data) {
          data.forEach(p => {
            profileCache.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url });
          });
        }
      }
      uniqueIds.forEach(id => {
        if (!profileCache.has(id)) {
          profileCache.set(id, { full_name: '', avatar_url: null });
        }
      });
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
    return <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center">
        {shown.map((id, i) => {
          const profile = profileCache.get(id);
          const name = profile?.full_name || '';
          const avatarUrl = profile?.avatar_url;
          const initials = name ? getInitials(name) : '?';
          const [from, to] = getMemberGradient(name || id);
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name || 'Unknown'}
                    className="h-[22px] w-[22px] shrink-0 rounded-full border-2 border-background object-cover"
                    style={{ marginLeft: i > 0 ? -6 : 0, zIndex: max - i }}
                  />
                ) : (
                  <div
                    className="flex h-[22px] w-[22px] shrink-0 cursor-default items-center justify-center rounded-full border-2 border-background text-[8px] font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${from}, ${to})`,
                      marginLeft: i > 0 ? -6 : 0,
                      zIndex: max - i,
                    }}
                  >
                    {initials}
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {name || 'Unknown'}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {overflow > 0 && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1">
            {overflow}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
