/**
 * CATY AI V7 — Stats Hook
 * Uses location_id to determine On-Site vs Off-Shore (NOT country codes)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CatyStats {
  totalResources: number;
  avgUtilization: number;
  overUtilized: number;
  available: number;
  expiringContracts: number;
  onSite: number;
  offShore: number;
}

export function useCatyStats(departmentId?: string | null) {
  return useQuery({
    queryKey: ['caty-stats', departmentId],
    queryFn: async (): Promise<CatyStats> => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);
      const todayStr = today.toISOString().split('T')[0];
      const futureStr = futureDate.toISOString().split('T')[0];
      
      // Fetch locations to determine On-Site vs Off-Shore
      const { data: locations } = await supabase
        .from('resource_locations')
        .select('id, name')
        .eq('is_active', true);
      
      // Build set of On-Site location IDs based on location NAME
      const onSiteLocationIds = new Set<string>();
      (locations || []).forEach(loc => {
        const locName = (loc.name || '').toLowerCase().trim();
        if (locName.includes('onsite') || locName.includes('on-site') || locName.includes('on site')) {
          onSiteLocationIds.add(loc.id);
        }
      });
      
      // Fetch resources
      let resourceQuery = supabase
        .from('resource_inventory')
        .select('id, location_id, contract_end_date')
        .eq('is_active', true);
      
      if (departmentId) {
        resourceQuery = resourceQuery.eq('department_id', departmentId);
      }
      
      const { data: resources } = await resourceQuery;
      
      if (!resources || resources.length === 0) {
        return {
          totalResources: 0,
          avgUtilization: 0,
          overUtilized: 0,
          available: 0,
          expiringContracts: 0,
          onSite: 0,
          offShore: 0,
        };
      }
      
      // Fetch allocations
      const resourceIds = resources.map(r => r.id);
      const { data: allocations } = await supabase
        .from('resource_allocations')
        .select('resource_id, allocation_percent')
        .in('resource_id', resourceIds)
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)
        .in('status', ['active', 'committed', 'forecast']);
      
      // Calculate utilization per resource
      const utilMap = new Map<string, number>();
      allocations?.forEach(a => {
        utilMap.set(a.resource_id, (utilMap.get(a.resource_id) || 0) + (a.allocation_percent || 0));
      });
      
      let totalUtil = 0;
      let overUtilized = 0;
      let available = 0;
      let onSite = 0;
      let expiringContracts = 0;
      
      resources.forEach(r => {
        const u = utilMap.get(r.id) || 0;
        totalUtil += u;
        if (u > 100) overUtilized++;
        if (u < 30) available++;
        
        // Check if On-Site using location_id (NOT country)
        if (r.location_id && onSiteLocationIds.has(r.location_id)) {
          onSite++;
        }
        
        // Check if contract is expiring soon
        if (r.contract_end_date) {
          const endDate = new Date(r.contract_end_date);
          if (endDate >= today && endDate <= futureDate) {
            expiringContracts++;
          }
        }
      });
      
      return {
        totalResources: resources.length,
        avgUtilization: resources.length > 0 ? Math.round(totalUtil / resources.length) : 0,
        overUtilized,
        available,
        expiringContracts,
        onSite,
        offShore: resources.length - onSite,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}
