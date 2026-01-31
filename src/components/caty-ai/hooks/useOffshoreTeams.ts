/**
 * CATY AI V7 — Offshore Teams Hook
 * Uses location_id to determine Off-Shore (NOT country codes)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OffshoreTeam } from '../types/database';

const FLAGS: Record<string, string> = {
  'EG': '🇪🇬', 'IN': '🇮🇳', 'JO': '🇯🇴', 'PK': '🇵🇰', 'PH': '🇵🇭',
  'BD': '🇧🇩', 'AE': '🇦🇪', 'SA': '🇸🇦', 'US': '🇺🇸', 'UK': '🇬🇧',
  'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷', 'ES': '🇪🇸', 'IT': '🇮🇹',
  'NL': '🇳🇱', 'BE': '🇧🇪', 'AU': '🇦🇺', 'CA': '🇨🇦', 'JP': '🇯🇵',
  'KR': '🇰🇷', 'CN': '🇨🇳', 'SG': '🇸🇬', 'MY': '🇲🇾', 'ID': '🇮🇩',
  'TH': '🇹🇭', 'VN': '🇻🇳', 'BR': '🇧🇷', 'MX': '🇲🇽', 'AR': '🇦🇷',
  'ZA': '🇿🇦', 'NG': '🇳🇬', 'KE': '🇰🇪', 'RU': '🇷🇺', 'UA': '🇺🇦',
  'PL': '🇵🇱', 'RO': '🇷🇴', 'TR': '🇹🇷', 'IL': '🇮🇱', 'QA': '🇶🇦',
  'KW': '🇰🇼', 'BH': '🇧🇭', 'OM': '🇴🇲', 'LB': '🇱🇧', 'SY': '🇸🇾',
  'KSA': '🇸🇦', 'LK': '🇱🇰', 'NP': '🇳🇵', 'SD': '🇸🇩', 'XK': '🇽🇰',
};

export function useOffshoreTeams(departmentId?: string | null) {
  return useQuery({
    queryKey: ['caty-offshore', departmentId],
    queryFn: async (): Promise<OffshoreTeam[]> => {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch locations to determine Off-Shore location IDs
      const { data: locations } = await supabase
        .from('resource_locations')
        .select('id, name')
        .eq('is_active', true);
      
      // Build set of Off-Shore location IDs (NOT onsite)
      const offShoreLocationIds = new Set<string>();
      (locations || []).forEach(loc => {
        const locName = (loc.name || '').toLowerCase().trim();
        // If location name does NOT contain "onsite", it's Off-Shore
        const isOnSite = locName.includes('onsite') || locName.includes('on-site') || locName.includes('on site');
        if (!isOnSite) {
          offShoreLocationIds.add(loc.id);
        }
      });
      
      if (offShoreLocationIds.size === 0) return [];
      
      // Fetch all countries for mapping
      const { data: countries } = await supabase
        .from('resource_countries')
        .select('id, code, name')
        .eq('is_active', true);
      
      const countryMap = new Map(countries?.map(c => [c.id, { code: c.code || '', name: c.name }]) || []);
      
      // Fetch resources that are Off-Shore (based on location_id)
      let query = supabase
        .from('resource_inventory')
        .select('id, country_id, location_id')
        .eq('is_active', true)
        .in('location_id', Array.from(offShoreLocationIds));
      
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }
      
      const { data: resources, error } = await query;
      if (error) throw error;
      if (!resources || resources.length === 0) return [];
      
      // Fetch allocations
      const resourceIds = resources.map(r => r.id);
      const { data: allocations } = await supabase
        .from('resource_allocations')
        .select('resource_id, allocation_percent')
        .in('resource_id', resourceIds)
        .lte('start_date', today)
        .gte('end_date', today)
        .in('status', ['active', 'committed', 'forecast']);
      
      // Group by country
      const countryStats = new Map<string, { count: number; totalUtil: number }>();
      
      resources.forEach(r => {
        const countryId = r.country_id || '';
        if (!countryStats.has(countryId)) {
          countryStats.set(countryId, { count: 0, totalUtil: 0 });
        }
        const stats = countryStats.get(countryId)!;
        stats.count++;
        
        const allocs = allocations?.filter(a => a.resource_id === r.id) || [];
        stats.totalUtil += allocs.reduce((sum, a) => sum + (a.allocation_percent || 0), 0);
      });
      
      return Array.from(countryStats.entries())
        .map(([countryId, stats]) => {
          const country = countryMap.get(countryId);
          const code = country?.code || '';
          return {
            country_id: countryId,
            country_name: country?.name || 'Unknown',
            country_code: code,
            flag: FLAGS[code.toUpperCase()] || '🏳️',
            resource_count: stats.count,
            avg_utilization: stats.count > 0 ? Math.round(stats.totalUtil / stats.count) : 0,
          };
        })
        .sort((a, b) => b.resource_count - a.resource_count);
    },
    staleTime: 2 * 60 * 1000,
  });
}
