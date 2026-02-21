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
    Y: ['#7C3AED', '#5B21B6'], Z: ['#7C3AED', '#5B21B6'],
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
    return <span style={{ fontSize: 10, color: '#94A3B8' }}>—</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {shown.map((id, i) => {
          const profile = profileCache.get(id);
          const name = profile?.full_name || '';
          const initials = name ? getInitials(name) : '?';
          const [from, to] = getMemberGradient(name || id);
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <div
                  style={{
                    width: 22, height: 22, borderRadius: 99, border: '2px solid #FFF',
                    background: `linear-gradient(135deg, ${from}, ${to})`,
                    marginLeft: i > 0 ? -6 : 0,
                    fontSize: 8, fontWeight: 700, color: '#FFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: max - i, flexShrink: 0, cursor: 'default',
                  }}
                >
                  {initials}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {name || 'Unknown'}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {overflow > 0 && (
          <span style={{ fontSize: 10, color: '#64748B', marginLeft: 4 }}>
            {overflow}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
