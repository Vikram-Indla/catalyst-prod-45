/**
 * useContractHorizon Hook
 * Fetches and processes contract data for the Contract Horizon view
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';
import type { 
  ContractResource, 
  ContractResourceWithStatus, 
  DepartmentStats,
  ContractFilter,
  ContractStatus 
} from '@/types/contract-horizon';

// Current date context: January 8, 2026
const TODAY = new Date('2026-01-08');

function getStatus(daysRemaining: number): ContractStatus {
  if (daysRemaining <= 60) return 'critical';
  if (daysRemaining <= 90) return 'warning';
  return 'safe';
}

function processResource(resource: ContractResource): ContractResourceWithStatus {
  const endDate = new Date(resource.contractEnd);
  const startDate = new Date(resource.contractStart);
  
  const daysRemaining = Math.ceil((endDate.getTime() - TODAY.getTime()) / 86400000);
  const progress = Math.min(100, Math.max(0, 
    ((TODAY.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100
  ));
  
  return {
    ...resource,
    daysRemaining,
    status: getStatus(daysRemaining),
    progress,
    endMonth: endDate.getMonth()
  };
}

export function useContractHorizon() {
  const [filter, setFilter] = useState<ContractFilter>('all');
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set(['Delivery']));
  const [selectedResource, setSelectedResource] = useState<ContractResourceWithStatus | null>(null);

  // Fetch departments first
  const { data: departments = [] } = useQuery({
    queryKey: ['capacity-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_departments')
        .select('id, name');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ['resource-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_vendors')
        .select('id, name');
      if (error) throw error;
      return data || [];
    }
  });

  // Create department lookup map
  const departmentMap = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach((d: any) => {
      map[d.id] = d.name;
    });
    return map;
  }, [departments]);

  // Create vendor lookup map
  const vendorMap = useMemo(() => {
    const map: Record<string, string> = {};
    vendors.forEach((v: any) => {
      map[v.id] = v.name;
    });
    return map;
  }, [vendors]);

  // Fetch locations to determine On-Site vs Off-Shore
  const { data: locationData = [] } = useQuery({
    queryKey: ['resource-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_locations')
        .select('id, name')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    }
  });

  // Build set of On-Site location IDs
  const onSiteLocationIds = useMemo(() => {
    const ids = new Set<string>();
    locationData.forEach(loc => {
      const locName = (loc.name || '').toLowerCase().trim();
      if (locName.includes('onsite') || locName.includes('on-site') || locName.includes('on site')) {
        ids.add(loc.id);
      }
    });
    return ids;
  }, [locationData]);

  // Fetch ALL resources from resource_inventory (no filters - parity with Utilization/Gantt views)
  const { data: rawResources = [], isLoading } = useQuery({
    queryKey: ['contract-horizon-resources', departmentMap, vendorMap, onSiteLocationIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select(`
          id,
          name,
          role_name,
          department_id,
          vendor_id,
          vendor_name,
          contract_start_date,
          contract_end_date,
          profile_id,
          country_id,
          location_id
        `);

      if (error) throw error;

      // Map to contract resources - use location_id to determine On-Site vs Off-Shore
      return (data || []).map((r: any) => {
        const isOnSite = r.location_id && onSiteLocationIds.has(r.location_id);
        return {
          id: r.id,
          name: r.name || 'Unknown',
          role: r.role_name || 'Team Member',
          department: departmentMap[r.department_id] || 'Unassigned',
          vendor: r.vendor_id ? vendorMap[r.vendor_id] || r.vendor_name || 'Unknown' : r.vendor_name || 'Unknown',
          country: 'Saudi Arabia',
          location: isOnSite ? 'On-Site' : 'Off-Shore',
          contractStart: r.contract_start_date || '2026-01-01',
          contractEnd: r.contract_end_date,
          profileId: r.profile_id
        };
      }) as ContractResource[];
    },
    enabled: departments.length > 0 && vendors.length > 0 && locationData.length > 0
  });

  // Process resources with computed status
  const resources = useMemo(() => {
    return rawResources.map(processResource);
  }, [rawResources]);

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      if (filter === 'all') return true;
      if (filter === 'delivery') return r.department.toLowerCase().includes('delivery');
      if (filter === 'product') return r.department.toLowerCase().includes('product');
      if (filter === 'operations') return r.department.toLowerCase().includes('operations');
      if (filter === 'technical_support') return r.department.toLowerCase().includes('technical support');
      if (filter === 'governance') return r.department.toLowerCase().includes('governance');
      return true;
    });
  }, [resources, filter]);

  // Group by department with stats
  const departmentStats = useMemo(() => {
    const stats: Record<string, DepartmentStats> = {};
    
    filteredResources.forEach(r => {
      const dept = r.department;
      if (!stats[dept]) {
        stats[dept] = {
          department: dept,
          total: 0,
          critical: 0,
          warning: 0,
          safe: 0,
          byMonth: {}
        };
      }
      
      stats[dept].total++;
      stats[dept][r.status]++;
      
      if (!stats[dept].byMonth[r.endMonth]) {
        stats[dept].byMonth[r.endMonth] = [];
      }
      stats[dept].byMonth[r.endMonth].push(r);
    });
    
    return stats;
  }, [filteredResources]);

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (let m = 0; m < 12; m++) totals[m] = 0;
    
    filteredResources.forEach(r => {
      totals[r.endMonth] = (totals[r.endMonth] || 0) + 1;
    });
    
    return totals;
  }, [filteredResources]);

  // Summary stats
  const summary = useMemo(() => {
    return {
      total: resources.length,
      byDepartment: {
        delivery: resources.filter(r => r.department.toLowerCase().includes('delivery')).length,
        product: resources.filter(r => r.department.toLowerCase().includes('product')).length,
        operations: resources.filter(r => r.department.toLowerCase().includes('operations')).length,
        technical_support: resources.filter(r => r.department.toLowerCase().includes('technical support')).length,
        governance: resources.filter(r => r.department.toLowerCase().includes('governance')).length
      }
    };
  }, [resources]);

  const toggleDepartment = (dept: string) => {
    setExpandedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  return {
    resources: filteredResources,
    departmentStats,
    monthlyTotals,
    summary,
    filter,
    setFilter,
    expandedDepartments,
    toggleDepartment,
    selectedResource,
    setSelectedResource,
    isLoading,
    currentMonth: TODAY.getMonth()
  };
}
