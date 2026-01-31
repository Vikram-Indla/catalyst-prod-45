/**
 * CATY AI V7 — Resource Utilization Hook
 * Uses actual Catalyst database schema
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ResourceWithUtilization } from '../types/database';

export function useResourceUtilization(departmentId?: string | null) {
  return useQuery({
    queryKey: ['caty-resources', departmentId],
    queryFn: async (): Promise<ResourceWithUtilization[]> => {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch resources
      let query = supabase
        .from('resource_inventory')
        .select(`
          id, name, role_name, department_id, department_name, 
          vendor_id, vendor_name, country_id, location_id, 
          contract_end_date, contract_start_date, is_active
        `)
        .eq('is_active', true);
      
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }
      
      const { data: resources, error } = await query;
      if (error) throw error;
      if (!resources || resources.length === 0) return [];
      
      // Fetch countries for country name
      const { data: countries } = await supabase
        .from('resource_countries')
        .select('id, code, name')
        .eq('is_active', true);
      
      const countryMap = new Map(countries?.map(c => [c.id, { code: c.code || '', name: c.name }]) || []);
      
      // Fetch locations for On-Site/Off-Shore determination
      const { data: locations } = await supabase
        .from('resource_locations')
        .select('id, name')
        .eq('is_active', true);
      
      const locationMap = new Map(locations?.map(l => [l.id, l.name]) || []);
      
      // Fetch allocations for the current period - include all valid statuses
      const resourceIds = resources.map(r => r.id);
      const { data: allocations } = await supabase
        .from('resource_allocations')
        .select('resource_id, allocation_percent')
        .in('resource_id', resourceIds)
        .lte('start_date', today)
        .gte('end_date', today)
        .in('status', ['active', 'committed', 'forecast']);
      
      return resources.map(resource => {
        const resourceAllocs = allocations?.filter(a => a.resource_id === resource.id) || [];
        const utilization = resourceAllocs.reduce((sum, a) => sum + (a.allocation_percent || 0), 0);
        
        const country = countryMap.get(resource.country_id || '');
        const countryCode = country?.code || '';
        
        // FIXED: Use location_id to determine On-Site vs Off-Shore
        const locationName = locationMap.get(resource.location_id || '') || '';
        const isOnSite = locationName.toLowerCase().includes('onsite') || 
                         locationName.toLowerCase().includes('on-site') ||
                         locationName.toLowerCase() === 'on site';
        
        let status: 'critical' | 'warning' | 'normal' | 'available';
        if (utilization > 100) status = 'critical';
        else if (utilization >= 90) status = 'warning';
        else if (utilization < 30) status = 'available';
        else status = 'normal';
        
        return {
          ...resource,
          current_utilization: utilization,
          utilization_status: status,
          location: isOnSite ? 'On-Site' : 'Off-Shore',
          country_name: country?.name || 'Unknown',
          country_code: countryCode,
        } as ResourceWithUtilization;
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}
