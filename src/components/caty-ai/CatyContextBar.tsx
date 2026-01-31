/**
 * Caty AI V7 — Context Bar Component
 * Shows only department names from database as clickable filters
 */

import React from 'react';
import { CatyContext } from './types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Department {
  id: string;
  name: string;
}

interface CatyContextBarProps {
  context: CatyContext;
  onDepartmentChange: (department: string, departmentId: string | null) => void;
}

export const CatyContextBar: React.FC<CatyContextBarProps> = ({ 
  context,
  onDepartmentChange 
}) => {
  // Fetch departments from resource_inventory table (users module)
  const { data: departments = [] } = useQuery({
    queryKey: ['caty-user-departments-with-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('department_id, department_name')
        .not('department_name', 'is', null)
        .order('department_name');
      
      if (error) {
        console.error('[CATY] Failed to fetch departments:', error);
        return [];
      }
      
      // Get unique department entries
      const seen = new Set<string>();
      const uniqueDepts: { id: string; name: string }[] = [];
      data.forEach(d => {
        if (d.department_name && !seen.has(d.department_name)) {
          seen.add(d.department_name);
          uniqueDepts.push({ id: d.department_id, name: d.department_name });
        }
      });
      return uniqueDepts;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Add "All" option at the beginning
  const allDepartments = [
    { id: 'all', name: 'All Departments' },
    ...departments
  ];

  const isSelected = (deptName: string) => {
    if (deptName === 'All Departments') {
      return context.department === 'All Departments' || context.department === 'All';
    }
    return context.department.includes(deptName);
  };

  return (
    <div className="caty-context-bar">
      <div className="caty-department-pills">
        {allDepartments.map((dept) => (
          <button
            key={dept.id}
            className={`caty-department-pill ${isSelected(dept.name) ? 'active' : ''}`}
            onClick={() => onDepartmentChange(dept.name, dept.id === 'all' ? null : dept.id)}
          >
            {dept.name}
          </button>
        ))}
      </div>
    </div>
  );
};
