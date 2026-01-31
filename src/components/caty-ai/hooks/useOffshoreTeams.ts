/**
 * CATY AI V7 — Offshore Teams Hook
 * Uses actual Catalyst database schema
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OffshoreTeam } from '../types/database';

const ONSITE_COUNTRY_CODES = ['SA', 'KSA'];

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
  'KSA': '🇸🇦', 'LK': '🇱🇰', 'NP': '🇳🇵',
};

export function useOffshoreTeams(departmentId?: string | null) {
  return useQuery({
    queryKey: ['caty-offshore', departmentId],
    queryFn: async (): Promise<OffshoreTeam[]> => {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all countries first
      const { data: countries } = await supabase
        .from('resource_countries')
        .select('id, code, name')
        .eq('is_active', true);
      
      if (!countries) return [];
      
      // Create map of offshore countries (exclude on-site)
      const offshoreCountries = countries.filter(c => 
        !ONSITE_COUNTRY_CODES.includes((c.code || '').toUpperCase())
      );
      const offshoreCountryIds = offshoreCountries.map(c => c.id);
      const countryMap = new Map(countries.map(c => [c.id, { code: c.code || '', name: c.name }]));
      
      if (offshoreCountryIds.length === 0) return [];
      
      // Fetch resources in offshore countries
      let query = supabase
        .from('resource_inventory')
        .select('id, country_id')
        .eq('is_active', true)
        .in('country_id', offshoreCountryIds);
      
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
        .eq('status', 'active');
      
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
