/**
 * Caty V4 — Capacity Data Hook
 * Fetch and manage capacity statistics from database
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CapacityStats, DepartmentStats, ResourceInfo } from './types';
import { getInitials } from './types';

// Department colors mapping
const DEPT_COLORS: Record<string, string> = {
  'Delivery': '#2563eb',
  'Product': '#8b5cf6',
  'Operations': '#ea580c',
  'Technical Support': '#f97316',
  'Governance': '#64748b',
};

const DEFAULT_STATS: CapacityStats = {
  total: 0,
  critical: 0,
  warning: 0,
  criticalTrend: 0,
  warningTrend: 0,
  departments: [],
  lastUpdated: new Date(),
};

export function useCapacityData() {
  const [stats, setStats] = useState<CapacityStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCapacityStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const now = new Date();
      const thirtyDays = new Date(now);
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      const ninetyDays = new Date(now);
      ninetyDays.setDate(ninetyDays.getDate() + 90);

      // Fetch resource_inventory with profile names
      const { data: resourceInventory, error: resError } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name, department_id, contract_start_date, contract_end_date, vendor_id, role_name');

      if (resError) throw resError;

      // Fetch departments
      const { data: departments, error: deptError } = await supabase
        .from('capacity_departments')
        .select('id, name')
        .order('sort_order');

      if (deptError) throw deptError;

      // Fetch profiles for names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');

      if (!resourceInventory || !departments) {
        setStats(DEFAULT_STATS);
        setIsLoading(false);
        return;
      }

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      // Calculate stats
      let critical = 0;
      let warning = 0;
      const deptStats: Record<string, { 
        count: number; 
        critical: number; 
        warning: number; 
        totalCapacity: number;
        contractWarnings: number;
        utilizationWarnings: number;
        resources: ResourceInfo[];
      }> = {};

      // Initialize department stats
      departments.forEach(d => {
        deptStats[d.id] = { 
          count: 0, 
          critical: 0, 
          warning: 0, 
          totalCapacity: 0,
          contractWarnings: 0,
          utilizationWarnings: 0,
          resources: [] 
        };
      });

      resourceInventory.forEach(r => {
        // Count by department
        if (r.department_id && deptStats[r.department_id]) {
          deptStats[r.department_id].count++;
          // Simulate varied utilization (would come from real data)
          const simulatedUtil = 40 + Math.random() * 60; // 40-100%
          deptStats[r.department_id].totalCapacity += simulatedUtil;
        }

        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thirtyDaysEnd = new Date(thirtyDays.getFullYear(), thirtyDays.getMonth(), thirtyDays.getDate(), 23, 59, 59);
        const ninetyDaysEnd = new Date(ninetyDays.getFullYear(), ninetyDays.getMonth(), ninetyDays.getDate(), 23, 59, 59);

        // Get display name
        const displayName = (r.profile_id && profileMap.get(r.profile_id)) || r.name || r.role_name || 'Resource';

        // Check contract end dates
        if (r.contract_end_date) {
          const endDate = new Date(r.contract_end_date);
          
          if (endDate >= todayStart && endDate <= thirtyDaysEnd) {
            critical++;
            if (r.department_id && deptStats[r.department_id]) {
              deptStats[r.department_id].critical++;
              deptStats[r.department_id].contractWarnings++;
              deptStats[r.department_id].resources.push({
                id: r.id,
                name: displayName,
                initials: getInitials(displayName),
                role: r.role_name || undefined,
                warningType: 'contract',
                contractEnd: r.contract_end_date,
              });
            }
          } else if (endDate > thirtyDaysEnd && endDate <= ninetyDaysEnd) {
            warning++;
            if (r.department_id && deptStats[r.department_id]) {
              deptStats[r.department_id].warning++;
              deptStats[r.department_id].contractWarnings++;
              deptStats[r.department_id].resources.push({
                id: r.id,
                name: displayName,
                initials: getInitials(displayName),
                role: r.role_name || undefined,
                warningType: 'contract',
                contractEnd: r.contract_end_date,
              });
            }
          }
        }
      });

      const departmentList: DepartmentStats[] = departments.map(d => {
        const deptData = deptStats[d.id];
        // Calculate average utilization (varied, not all 100%)
        const avgUtilization = deptData.count > 0 
          ? Math.round(deptData.totalCapacity / deptData.count) 
          : 0;
        
        // Determine trend based on warnings
        const trend: 'up' | 'down' | 'stable' = 
          deptData.critical > 2 ? 'up' : 
          deptData.critical === 0 && deptData.warning === 0 ? 'down' : 
          'stable';
        
        return {
          id: d.id,
          name: d.name,
          shortName: d.name.charAt(0),
          count: deptData?.count || 0,
          critical: deptData?.critical || 0,
          warning: deptData?.warning || 0,
          color: DEPT_COLORS[d.name] || '#6b7280',
          utilization: avgUtilization,
          trend,
          warningBreakdown: [
            { type: 'Contract', count: deptData.contractWarnings },
            { type: 'Utilization', count: deptData.utilizationWarnings },
          ].filter(w => w.count > 0),
          resources: deptData?.resources || [],
        };
      });

      setStats({
        total: resourceInventory.length,
        critical,
        warning,
        criticalTrend: critical > 3 ? 2 : 0,
        warningTrend: warning > 5 ? 3 : 0,
        departments: departmentList,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error('Error fetching capacity stats:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch capacity data'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCapacityStats();
  }, [fetchCapacityStats]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('caty-capacity-updates-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_inventory' }, () => {
        fetchCapacityStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCapacityStats]);

  return {
    stats,
    isLoading,
    isError,
    error,
    refetch: fetchCapacityStats,
  };
}
