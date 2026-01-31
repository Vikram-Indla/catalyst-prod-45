/**
 * CATY Viewport Data Fetching — Enterprise Probing Questions
 * Generates generic aggregate questions about utilization & contracts
 * WITHOUT exposing individual resource names
 */

import { supabase } from '@/integrations/supabase/client';
import type { ViewportData, ViewportStats, ViewportSection, ProbingQuestion } from '@/types/caty-viewport';

export async function fetchViewportData(departmentId: string | null): Promise<ViewportData> {
  const today = new Date();
  const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  // Fetch resources from resource_inventory view
  let resourceQuery = supabase
    .from('resource_inventory')
    .select(`
      id,
      name,
      role_name,
      department_id,
      department_name,
      vendor_id,
      vendor_name,
      contract_end_date
    `);

  // Apply department filter if selected
  if (departmentId) {
    resourceQuery = resourceQuery.eq('department_id', departmentId);
  }

  const { data: resources, error: resourceError } = await resourceQuery;
  if (resourceError) throw resourceError;

  // Fetch allocation data to calculate utilization - MUST filter for CURRENT allocations only
  const todayStr = today.toISOString().split('T')[0];
  const { data: allocations } = await supabase
    .from('resource_allocations')
    .select('resource_id, allocation_percent')
    .lte('start_date', todayStr)  // Started on or before today
    .gte('end_date', todayStr)    // Ends on or after today
    .in('status', ['active', 'committed', 'forecast']); // Include all valid statuses

  // Build utilization map: resource_id -> total allocation %
  const utilizationMap = new Map<string, number>();
  (allocations || []).forEach((alloc: { resource_id: string; allocation_percent: number | null }) => {
    const current = utilizationMap.get(alloc.resource_id) || 0;
    utilizationMap.set(alloc.resource_id, current + (alloc.allocation_percent || 0));
  });

  // Calculate stats and categorize resources
  const stats: ViewportStats = {
    totalResources: resources?.length || 0,
    expiringContracts: 0,
    overAllocated: 0,
    zeroUtilization: 0,
  };

  // Aggregation buckets
  const expiringData = {
    within30Days: [] as any[],
    within60Days: [] as any[],
    within90Days: [] as any[],
    byVendor: new Map<string, any[]>(),
    byDepartment: new Map<string, any[]>(),
  };

  const overAllocatedData = {
    above150: [] as any[],
    above120: [] as any[],
    above100: [] as any[],
    byDepartment: new Map<string, any[]>(),
  };

  const lowUtilData = {
    zeroUtil: [] as any[],
    below25: [] as any[],
    below50: [] as any[],
    byDepartment: new Map<string, any[]>(),
  };

  (resources || []).forEach(resource => {
    const contractEnd = resource.contract_end_date ? new Date(resource.contract_end_date) : null;
    const utilization = utilizationMap.get(resource.id) || 0;
    const deptName = resource.department_name || 'Unknown';
    const vendorName = resource.vendor_name || 'Unknown';

    // Expiring contracts categorization
    if (contractEnd && contractEnd >= today && contractEnd <= ninetyDaysFromNow) {
      stats.expiringContracts++;
      const daysLeft = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const entry = { id: resource.id, daysLeft, deptName, vendorName };

      if (contractEnd <= thirtyDaysFromNow) {
        expiringData.within30Days.push(entry);
      } else if (contractEnd <= sixtyDaysFromNow) {
        expiringData.within60Days.push(entry);
      } else {
        expiringData.within90Days.push(entry);
      }

      // Group by vendor
      if (!expiringData.byVendor.has(vendorName)) expiringData.byVendor.set(vendorName, []);
      expiringData.byVendor.get(vendorName)!.push(entry);

      // Group by department
      if (!expiringData.byDepartment.has(deptName)) expiringData.byDepartment.set(deptName, []);
      expiringData.byDepartment.get(deptName)!.push(entry);
    }

    // Over-allocated categorization
    if (utilization > 100) {
      stats.overAllocated++;
      const entry = { id: resource.id, utilization, deptName };

      if (utilization >= 150) {
        overAllocatedData.above150.push(entry);
      } else if (utilization >= 120) {
        overAllocatedData.above120.push(entry);
      } else {
        overAllocatedData.above100.push(entry);
      }

      if (!overAllocatedData.byDepartment.has(deptName)) overAllocatedData.byDepartment.set(deptName, []);
      overAllocatedData.byDepartment.get(deptName)!.push(entry);
    }

    // Low utilization categorization
    if (utilization === 0) {
      stats.zeroUtilization++;
      const entry = { id: resource.id, utilization, deptName };
      lowUtilData.zeroUtil.push(entry);

      if (!lowUtilData.byDepartment.has(deptName)) lowUtilData.byDepartment.set(deptName, []);
      lowUtilData.byDepartment.get(deptName)!.push(entry);
    } else if (utilization < 25) {
      const entry = { id: resource.id, utilization, deptName };
      lowUtilData.below25.push(entry);
    } else if (utilization < 50) {
      const entry = { id: resource.id, utilization, deptName };
      lowUtilData.below50.push(entry);
    }
  });

  // Build sections with generic questions
  const sections: ViewportSection[] = [];

  if (stats.expiringContracts > 0) {
    sections.push(buildExpiringSection(expiringData, departmentId));
  }

  if (stats.overAllocated > 0) {
    sections.push(buildOverAllocatedSection(overAllocatedData, departmentId));
  }

  if (stats.zeroUtilization > 0 || lowUtilData.below25.length > 0) {
    sections.push(buildLowUtilSection(lowUtilData, departmentId));
  }

  return { stats, sections };
}

function buildExpiringSection(data: any, departmentId: string | null): ViewportSection {
  const questions: ProbingQuestion[] = [];
  const totalCount = data.within30Days.length + data.within60Days.length + data.within90Days.length;

  // Question 1: Urgent contracts (within 30 days)
  if (data.within30Days.length > 0) {
    questions.push({
      id: 'expiring-30-days',
      severity: 'danger',
      text: `<strong>${data.within30Days.length} contract${data.within30Days.length > 1 ? 's' : ''}</strong> expiring within 30 days — review renewal pipeline`,
      highlightedText: `${data.within30Days.length} contract${data.within30Days.length > 1 ? 's' : ''}`,
      tags: [
        { type: 'date', label: '< 30 days' },
        { type: 'count', label: `${data.within30Days.length} urgent` },
      ],
      resourceIds: data.within30Days.map((r: any) => r.id),
    });
  }

  // Question 2: Vendor concentration risk
  const topVendor = [...data.byVendor.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (topVendor && topVendor[1].length >= 2) {
    questions.push({
      id: 'expiring-vendor-concentration',
      severity: 'warning',
      text: `<strong>${topVendor[1].length} contracts</strong> from single vendor expiring — assess vendor dependency risk`,
      highlightedText: `${topVendor[1].length} contracts`,
      tags: [
        { type: 'vendor', label: topVendor[0] },
        { type: 'count', label: 'concentration risk' },
      ],
      resourceIds: topVendor[1].map((r: any) => r.id),
    });
  }

  // Question 3: Department planning
  if (data.within60Days.length > 0 || data.within90Days.length > 0) {
    const count = data.within60Days.length + data.within90Days.length;
    questions.push({
      id: 'expiring-planning-horizon',
      severity: 'info',
      text: `<strong>${count} contract${count > 1 ? 's' : ''}</strong> expiring in 30-90 days — plan capacity transition`,
      highlightedText: `${count} contract${count > 1 ? 's' : ''}`,
      tags: [
        { type: 'date', label: '30-90 days' },
        { type: 'count', label: 'planning window' },
      ],
      resourceIds: [...data.within60Days, ...data.within90Days].map((r: any) => r.id),
    });
  }

  return {
    id: 'expiring',
    title: 'Contracts Expiring',
    severity: 'danger',
    totalCount,
    questions: questions.slice(0, 3),
  };
}

function buildOverAllocatedSection(data: any, departmentId: string | null): ViewportSection {
  const questions: ProbingQuestion[] = [];
  const totalCount = data.above150.length + data.above120.length + data.above100.length;

  // Question 1: Critical overload (150%+)
  if (data.above150.length > 0) {
    const maxUtil = Math.max(...data.above150.map((r: any) => r.utilization));
    questions.push({
      id: 'over-allocated-critical',
      severity: 'danger',
      text: `<strong>${data.above150.length} assignment${data.above150.length > 1 ? 's' : ''}</strong> at 150%+ utilization — immediate rebalancing required`,
      highlightedText: `${data.above150.length} assignment${data.above150.length > 1 ? 's' : ''}`,
      tags: [
        { type: 'count', label: `up to ${maxUtil}%` },
        { type: 'project', label: 'critical' },
      ],
      resourceIds: data.above150.map((r: any) => r.id),
    });
  }

  // Question 2: High overload (120-149%)
  if (data.above120.length > 0) {
    questions.push({
      id: 'over-allocated-high',
      severity: 'warning',
      text: `<strong>${data.above120.length} assignment${data.above120.length > 1 ? 's' : ''}</strong> at 120-149% — review allocation conflicts`,
      highlightedText: `${data.above120.length} assignment${data.above120.length > 1 ? 's' : ''}`,
      tags: [
        { type: 'count', label: '120-149%' },
        { type: 'project', label: 'high load' },
      ],
      resourceIds: data.above120.map((r: any) => r.id),
    });
  }

  // Question 3: Moderate overload (100-119%)
  if (data.above100.length > 0) {
    questions.push({
      id: 'over-allocated-moderate',
      severity: 'info',
      text: `<strong>${data.above100.length} assignment${data.above100.length > 1 ? 's' : ''}</strong> slightly over capacity (100-119%) — validate assignment overlap`,
      highlightedText: `${data.above100.length} assignment${data.above100.length > 1 ? 's' : ''}`,
      tags: [
        { type: 'count', label: '100-119%' },
        { type: 'project', label: 'overlap' },
      ],
      resourceIds: data.above100.map((r: any) => r.id),
    });
  }

  return {
    id: 'over-allocated',
    title: 'Over-Allocated (>100%)',
    severity: 'warning',
    totalCount,
    questions: questions.slice(0, 3),
  };
}

function buildLowUtilSection(data: any, departmentId: string | null): ViewportSection {
  const questions: ProbingQuestion[] = [];
  const totalCount = data.zeroUtil.length;

  // Question 1: Unassigned capacity
  if (data.zeroUtil.length > 0) {
    questions.push({
      id: 'low-util-unassigned',
      severity: 'warning',
      text: `<strong>${data.zeroUtil.length} assignment${data.zeroUtil.length > 1 ? 's' : ''}</strong> with 0% utilization — review bench capacity`,
      highlightedText: `${data.zeroUtil.length} assignment${data.zeroUtil.length > 1 ? 's' : ''}`,
      tags: [
        { type: 'count', label: '0% utilized' },
        { type: 'project', label: 'bench' },
      ],
      resourceIds: data.zeroUtil.map((r: any) => r.id),
    });
  }

  // Question 2: Department bench concentration
  const topDept = [...data.byDepartment.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (topDept && topDept[1].length >= 2) {
    questions.push({
      id: 'low-util-dept-concentration',
      severity: 'info',
      text: `<strong>${topDept[1].length} unassigned</strong> in ${topDept[0]} — optimize team allocation`,
      highlightedText: `${topDept[1].length} unassigned`,
      tags: [
        { type: 'project', label: topDept[0] },
        { type: 'count', label: 'idle capacity' },
      ],
      resourceIds: topDept[1].map((r: any) => r.id),
    });
  }

  // Question 3: Low utilization (below 25%)
  if (data.below25.length > 0) {
    questions.push({
      id: 'low-util-underutilized',
      severity: 'info',
      text: `<strong>${data.below25.length} assignment${data.below25.length > 1 ? 's' : ''}</strong> below 25% utilization — opportunity for additional workload`,
      highlightedText: `${data.below25.length} assignment${data.below25.length > 1 ? 's' : ''}`,
      tags: [
        { type: 'count', label: '< 25%' },
        { type: 'project', label: 'capacity available' },
      ],
      resourceIds: data.below25.map((r: any) => r.id),
    });
  }

  return {
    id: 'low-util',
    title: 'Low Utilization',
    severity: 'info',
    totalCount,
    questions: questions.slice(0, 3),
  };
}
