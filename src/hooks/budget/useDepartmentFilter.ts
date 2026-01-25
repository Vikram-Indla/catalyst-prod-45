/**
 * Department Filter Hook - Budget Governance
 * Handles department selection and data filtering with recalculation
 */

import { useMemo, useState, useCallback } from 'react';
import type { BudgetAssignment, BudgetResource, BudgetLicense, BudgetPeriod } from '@/lib/budget/types';
import { getPeriodMonths } from '@/lib/budget/utils';

export interface DepartmentSummary {
  insourced: number;
  cosourced: number;
  outsourced: number;
  licenses: number;
  total: number;
  resources: number;
  dataIssues: number;
}

export function useDepartmentFilter(
  assignments: BudgetAssignment[],
  resources: BudgetResource[],
  licenses: BudgetLicense[],
  period: BudgetPeriod = 'H1'
) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');

  // Get unique departments from resources
  const departments = useMemo(() => {
    const depts = [...new Set(resources.map(r => r.department))].filter(Boolean).sort();
    return ['All', ...depts];
  }, [resources]);

  // Count resources per department
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { All: resources.length };
    departments.slice(1).forEach(dept => {
      counts[dept] = resources.filter(r => r.department === dept).length;
    });
    return counts;
  }, [resources, departments]);

  const months = getPeriodMonths(period);

  // Calculate summary for a specific department
  const calculateDeptSummary = useCallback((dept: string): DepartmentSummary => {
    const isAll = dept === 'All';
    
    // Filter resources by department
    const deptResources = isAll 
      ? resources 
      : resources.filter(r => r.department === dept);

    // INSOURCED: CTC sum × months
    const insourcedBudget = deptResources.reduce(
      (sum, r) => sum + (r.ctc || 0) * months, 0
    );

    // COSOURCED: assignment.budget sum for dept
    const cosourcedAssignments = assignments.filter(a => a.type === 'Cosourced');
    const cosourcedBudget = isAll
      ? cosourcedAssignments.reduce((sum, a) => sum + (a.budget || 0), 0)
      : 0;

    // OUTSOURCED: assignment.budget sum
    const outsourcedAssignments = assignments.filter(a => a.type === 'Outsourced');
    const outsourcedBudget = isAll 
      ? outsourcedAssignments.reduce((sum, a) => sum + (a.budget || 0), 0)
      : 0;

    // LICENSES
    const licensesMonthly = licenses.reduce((sum, l) => sum + l.monthlyCost, 0);
    const deptCount = departments.length - 1;
    const licensesPeriod = isAll
      ? licensesMonthly * months
      : Math.round((licensesMonthly * months) / deptCount);

    // Missing CTC count
    const dataIssues = deptResources.filter(r => !r.ctc || r.ctc === 0).length;

    const total = insourcedBudget + cosourcedBudget + outsourcedBudget + licensesPeriod;

    return {
      insourced: insourcedBudget,
      cosourced: cosourcedBudget,
      outsourced: outsourcedBudget,
      licenses: licensesPeriod,
      total,
      resources: deptResources.length,
      dataIssues
    };
  }, [assignments, resources, licenses, months, departments]);

  // Navigation helpers for keyboard
  const selectNextDepartment = useCallback(() => {
    const idx = departments.indexOf(selectedDepartment);
    const nextIdx = (idx + 1) % departments.length;
    setSelectedDepartment(departments[nextIdx]);
  }, [departments, selectedDepartment]);

  const selectPreviousDepartment = useCallback(() => {
    const idx = departments.indexOf(selectedDepartment);
    const prevIdx = (idx - 1 + departments.length) % departments.length;
    setSelectedDepartment(departments[prevIdx]);
  }, [departments, selectedDepartment]);

  return {
    selectedDepartment,
    setSelectedDepartment,
    departments,
    departmentCounts,
    currentSummary: calculateDeptSummary(selectedDepartment),
    selectNextDepartment,
    selectPreviousDepartment
  };
}
