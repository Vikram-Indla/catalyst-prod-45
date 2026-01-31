/**
 * CATY AI V7 — Expiring Contracts Hook
 * Uses actual Catalyst database schema
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContractExpiring, ResourceWithUtilization } from '../types/database';

const ONSITE_COUNTRY_CODES = ['SA', 'KSA'];

export function useExpiringContracts(departmentId?: string | null, days = 30) {
  return useQuery({
    queryKey: ['caty-contracts', departmentId, days],
    queryFn: async (): Promise<ContractExpiring[]> => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);
      const todayStr = today.toISOString().split('T')[0];
      const futureStr = futureDate.toISOString().split('T')[0];
      
      // Fetch resources with contracts expiring soon
      let query = supabase
        .from('resource_inventory')
        .select(`
          id, name, role_name, department_id, department_name, 
          vendor_id, vendor_name, country_id, location_id, 
          contract_end_date, contract_start_date, is_active
        `)
        .eq('is_active', true)
        .gte('contract_end_date', todayStr)
        .lte('contract_end_date', futureStr)
        .order('contract_end_date');
      
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }
      
      const { data: resources, error } = await query;
      if (error) throw error;
      if (!resources || resources.length === 0) return [];
      
      // Fetch countries for location mapping
      const { data: countries } = await supabase
        .from('resource_countries')
        .select('id, code, name')
        .eq('is_active', true);
      
      const countryMap = new Map(countries?.map(c => [c.id, { code: c.code || '', name: c.name }]) || []);
      
      // Fetch allocations for utilization
      const resourceIds = resources.map(r => r.id);
      const { data: allocations } = await supabase
        .from('resource_allocations')
        .select('resource_id, allocation_percent')
        .in('resource_id', resourceIds)
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)
        .eq('status', 'active');
      
      return resources.map(resource => {
        const resourceAllocs = allocations?.filter(a => a.resource_id === resource.id) || [];
        const utilization = resourceAllocs.reduce((sum, a) => sum + (a.allocation_percent || 0), 0);
        
        const country = countryMap.get(resource.country_id || '');
        const countryCode = country?.code || '';
        const isOnSite = ONSITE_COUNTRY_CODES.includes(countryCode.toUpperCase());
        
        const endDate = resource.contract_end_date!;
        const daysUntil = Math.ceil(
          (new Date(endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const resourceWithUtil: ResourceWithUtilization = {
          ...resource,
          current_utilization: utilization,
          utilization_status: utilization > 100 ? 'critical' : utilization >= 90 ? 'warning' : 'normal',
          location: isOnSite ? 'On-Site' : 'Off-Shore',
          country_name: country?.name || 'Unknown',
          country_code: countryCode,
        };
        
        return {
          resource: resourceWithUtil,
          end_date: endDate,
          days_until_expiry: daysUntil,
          status: daysUntil <= 7 ? 'critical' : daysUntil <= 14 ? 'warning' : 'normal',
        } as ContractExpiring;
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}
