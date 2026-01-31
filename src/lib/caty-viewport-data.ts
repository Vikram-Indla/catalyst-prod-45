/**
 * CATY Viewport Data Fetching — Enterprise Probing Questions
 * Calculates stats and builds intelligent question sections
 */

import { supabase } from '@/integrations/supabase/client';
import type { ViewportData, ViewportStats, ViewportSection, ProbingQuestion } from '@/types/caty-viewport';

export async function fetchViewportData(departmentId: string | null): Promise<ViewportData> {
  const today = new Date();
  const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

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

  // Calculate stats
  const stats: ViewportStats = {
    totalResources: resources?.length || 0,
    expiringContracts: 0,
    overAllocated: 0,
    zeroUtilization: 0,
  };

  const expiringResources: any[] = [];
  const overAllocatedResources: any[] = [];
  const zeroUtilResources: any[] = [];

  (resources || []).forEach(resource => {
    const contractEnd = resource.contract_end_date ? new Date(resource.contract_end_date) : null;
    // Get actual utilization from allocation data
    const utilization = utilizationMap.get(resource.id) || 0;

    // Expiring within 90 days
    if (contractEnd && contractEnd >= today && contractEnd <= ninetyDaysFromNow) {
      stats.expiringContracts++;
      const daysLeft = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      expiringResources.push({ 
        id: resource.id,
        name: resource.name,
        department_name: resource.department_name,
        vendor_name: resource.vendor_name,
        contractEnd, 
        daysLeft 
      });
    }

    // Over-allocated (>100%)
    if (utilization > 100) {
      stats.overAllocated++;
      overAllocatedResources.push({ 
        id: resource.id,
        name: resource.name,
        department_name: resource.department_name,
        vendor_name: resource.vendor_name,
        utilization 
      });
    }

    // Zero utilization - only count resources with NO allocations
    if (utilization === 0) {
      stats.zeroUtilization++;
      zeroUtilResources.push({ 
        id: resource.id,
        name: resource.name,
        department_name: resource.department_name,
        vendor_name: resource.vendor_name,
        utilization 
      });
    }
  });

  // Build sections
  const sections: ViewportSection[] = [];

  // Section 1: Contracts Expiring
  if (expiringResources.length > 0) {
    sections.push(buildExpiringSection(expiringResources, departmentId));
  }

  // Section 2: Over-Allocated
  if (overAllocatedResources.length > 0) {
    sections.push(buildOverAllocatedSection(overAllocatedResources, departmentId));
  }

  // Section 3: Zero Utilization
  if (zeroUtilResources.length > 0) {
    sections.push(buildZeroUtilSection(zeroUtilResources, departmentId));
  }

  return { stats, sections };
}

function buildExpiringSection(resources: any[], departmentId: string | null): ViewportSection {
  const questions: ProbingQuestion[] = [];

  // Sort by days left (most urgent first)
  resources.sort((a, b) => a.daysLeft - b.daysLeft);

  // Group by vendor
  const byVendor = groupBy(resources, r => r.vendor_name || 'Unassigned');

  Object.entries(byVendor).forEach(([vendorName, vendorResources]) => {
    const vendorDisplay = vendorName === 'Unassigned' ? 'resources with no vendor' : `vendor ${vendorName}`;
    if (vendorResources.length >= 2) {
      // Group question
      const earliestDate = Math.min(...vendorResources.map(r => r.daysLeft));
      questions.push({
        id: `expiring-${vendorName.replace(/\s+/g, '-')}`,
        severity: 'danger',
        text: `Show <strong>${vendorResources.length} expiring contracts</strong> for ${vendorDisplay}`,
        highlightedText: `${vendorResources.length} expiring contracts`,
        tags: [
          { type: 'vendor', label: vendorName },
          { type: 'date', label: `${earliestDate} days` },
        ],
        resourceIds: vendorResources.map(r => r.id),
      });
    } else {
      // Individual question
      const r = vendorResources[0];
      questions.push({
        id: `expiring-${r.id}`,
        severity: 'danger',
        text: `Show contract expiring for <strong>${r.name}</strong>`,
        highlightedText: r.name,
        tags: [
          { type: 'vendor', label: vendorName },
          { type: 'date', label: `${r.daysLeft} days` },
        ],
        resourceIds: [r.id],
      });
    }
  });

  return {
    id: 'expiring',
    title: 'Contracts Expiring',
    severity: 'danger',
    totalCount: resources.length,
    questions: questions.slice(0, 3), // Max 3 questions per section
  };
}

function buildOverAllocatedSection(resources: any[], departmentId: string | null): ViewportSection {
  const questions: ProbingQuestion[] = [];

  // Always show 2-3 individual questions for better visibility
  const showIndividualFirst = resources.length <= 4 || departmentId;
  
  if (showIndividualFirst) {
    // Individual questions (max 3)
    resources.slice(0, 3).forEach(r => {
      questions.push({
        id: `over-allocated-${r.id}`,
        severity: 'warning',
        text: `Is <strong>${r.name}</strong> correctly at ${r.utilization}% allocation?`,
        highlightedText: r.name,
        tags: [
          { type: 'vendor', label: r.vendor_name || 'Unknown' },
          { type: 'count', label: `${r.utilization}%` },
        ],
        resourceIds: [r.id],
      });
    });
  } else {
    // Grouped by department when viewing all with many resources
    const byDept = groupBy(resources, r => r.department_name || 'Unknown');
    
    // Show top 3 department groups
    Object.entries(byDept).slice(0, 3).forEach(([deptName, deptResources]) => {
      const maxUtil = Math.max(...deptResources.map(r => r.utilization));
      questions.push({
        id: `over-allocated-${deptName.replace(/\s+/g, '-')}`,
        severity: 'warning',
        text: `Resolve <strong>${deptResources.length} resources</strong> in ${deptName} above 100%`,
        highlightedText: `${deptResources.length} resources`,
        tags: [
          { type: 'project', label: deptName },
          { type: 'count', label: `up to ${maxUtil}%` },
        ],
        resourceIds: deptResources.map(r => r.id),
      });
    });
  }

  return {
    id: 'over-allocated',
    title: 'Over-Allocated (>100%)',
    severity: 'warning',
    totalCount: resources.length,
    questions: questions.slice(0, 3), // Ensure max 3 questions
  };
}

function buildZeroUtilSection(resources: any[], departmentId: string | null): ViewportSection {
  const questions: ProbingQuestion[] = [];

  // Always show 2-3 individual questions first for better visibility
  const showIndividualFirst = resources.length <= 5 || departmentId;
  
  if (showIndividualFirst) {
    // Individual questions (max 3)
    resources.slice(0, 3).forEach(r => {
      questions.push({
        id: `zero-util-${r.id}`,
        severity: 'info',
        text: `Should <strong>${r.name}</strong> be assigned to active projects?`,
        highlightedText: r.name,
        tags: [
          { type: 'vendor', label: r.vendor_name || 'Unknown' },
          { type: 'count', label: `0% since ${getCurrentMonth()}` },
        ],
        resourceIds: [r.id],
      });
    });
  } else {
    // Grouped by department when viewing all with many resources
    const byDept = groupBy(resources, r => r.department_name || 'Unknown');
    
    // Show top 3 department groups
    Object.entries(byDept).slice(0, 3).forEach(([deptName, deptResources]) => {
      questions.push({
        id: `zero-util-${deptName.replace(/\s+/g, '-')}`,
        severity: 'info',
        text: `Assign <strong>${deptResources.length} resources</strong> in ${deptName} with 0% utilization`,
        highlightedText: `${deptResources.length} resources`,
        tags: [
          { type: 'project', label: deptName },
          { type: 'count', label: `${deptResources.length} idle` },
        ],
        resourceIds: deptResources.map(r => r.id),
      });
    });
  }

  return {
    id: 'zero-util',
    title: 'Zero Utilization',
    severity: 'info',
    totalCount: resources.length,
    questions: questions.slice(0, 3), // Ensure max 3 questions
  };
}

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function getCurrentMonth(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short' });
}
