/**
 * Live hooks for Budget Overview and Capacity Overview widgets.
 * Sources: resource_inventory, resource_assignments, resource_allocations,
 * capacity_departments, software_licenses, resource_vendors.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ═══════════════════════════════════════════════
   BUDGET OVERVIEW — Live data
   ═══════════════════════════════════════════════ */

export interface DepartmentBudget {
  name: string;
  did: string;
  color: string;
  headcount: number;
  monthlyCTC: number;
  annualCTC: number;
  missingCTC: number;
  variable: number;
  fixed: number;
  freelance: number;
}

export interface ContractBudget {
  type: 'Outsourced' | 'Cosourced';
  name: string;
  vendor: string | null;
  budget: number;
  status: string | null;
  paymentStatus: string | null;
}

export interface BudgetLiveData {
  departments: DepartmentBudget[];
  contracts: ContractBudget[];
  totalInsourced: number;
  totalOutsourced: number;
  totalCosourced: number;
  totalLicenses: number;
  totalBudget: number;
  totalHeadcount: number;
  missingCTC: number;
  unpaidInvoices: number;
  renewals90d: number;
  dataQualityPct: number;
  licenseCount: number;
}

export function useBudgetLive() {
  return useQuery({
    queryKey: ['strategy', 'budget-live'],
    queryFn: async (): Promise<BudgetLiveData> => {
      // Parallel fetches
      const [deptRes, assignRes, licenseRes] = await Promise.all([
        supabase.from('resource_inventory')
          .select('id, ctc, resource_type, department_id, contract_end_date')
          .eq('is_active', true),
        supabase.from('resource_assignments')
          .select('id, name, assignment_id, assignment_type, assignment_status, payment_status, budget, vendor_id')
          .eq('is_active', true),
        supabase.from('software_licenses')
          .select('id, annual_cost')
          .eq('is_active', true),
      ]);

      // Fetch departments and vendors
      const [deptLookup, vendorLookup] = await Promise.all([
        supabase.from('capacity_departments').select('id, name, department_id, color, sort_order').eq('is_active', true),
        supabase.from('resource_vendors').select('id, name').or('is_active.eq.true,is_active.is.null'),
      ]);

      const resources = deptRes.data || [];
      const assignments = assignRes.data || [];
      const licenses = licenseRes.data || [];
      const departments = deptLookup.data || [];
      const vendors = vendorLookup.data || [];

      const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
      const deptMap = new Map(departments.map(d => [d.id, d]));

      // Department breakdown
      const deptBudgets = new Map<string, DepartmentBudget>();
      for (const dept of departments) {
        deptBudgets.set(dept.id, {
          name: dept.name,
          did: dept.department_id,
          color: dept.color || '#2563EB',
          headcount: 0,
          monthlyCTC: 0,
          annualCTC: 0,
          missingCTC: 0,
          variable: 0,
          fixed: 0,
          freelance: 0,
        });
      }

      let totalMissingCTC = 0;
      let renewals90d = 0;
      const now = new Date();
      const in90d = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      for (const r of resources) {
        const dept = deptBudgets.get(r.department_id);
        if (!dept) continue;
        dept.headcount++;
        const ctc = Number(r.ctc) || 0;
        dept.monthlyCTC += ctc;
        dept.annualCTC += ctc * 12;
        if (!r.ctc || ctc === 0) {
          dept.missingCTC++;
          totalMissingCTC++;
        }
        if (r.resource_type === 'Variable') dept.variable++;
        else if (r.resource_type === 'Fixed') dept.fixed++;
        else if (r.resource_type === 'Freelance') dept.freelance++;

        if (r.contract_end_date) {
          const end = new Date(r.contract_end_date);
          if (end <= in90d) renewals90d++;
        }
      }

      const deptArray = Array.from(deptBudgets.values())
        .sort((a, b) => {
          const da = departments.find(d => d.department_id === a.did);
          const db = departments.find(d => d.department_id === b.did);
          return (da?.sort_order || 0) - (db?.sort_order || 0);
        });

      // Insourced = sum of all resource CTC × 12
      const totalInsourced = resources.reduce((s, r) => s + (Number(r.ctc) || 0) * 12, 0);

      // Outsourced + Cosourced contracts
      const contracts: ContractBudget[] = assignments
        .filter(a => a.assignment_type === 'Outsourced' || a.assignment_type === 'Cosourced')
        .map(a => ({
          type: a.assignment_type as 'Outsourced' | 'Cosourced',
          name: a.name,
          vendor: a.vendor_id ? vendorMap.get(a.vendor_id) || null : null,
          budget: Number(a.budget) || 0,
          status: a.assignment_status,
          paymentStatus: a.payment_status,
        }));

      const totalOutsourced = contracts.filter(c => c.type === 'Outsourced').reduce((s, c) => s + c.budget, 0);
      const totalCosourced = contracts.filter(c => c.type === 'Cosourced').reduce((s, c) => s + c.budget, 0);
      const unpaidInvoices = contracts.filter(c => c.paymentStatus === 'unpaid').length;

      // Licenses
      const totalLicenses = licenses.reduce((s, l) => s + (Number(l.annual_cost) || 0), 0);

      const totalBudget = totalInsourced + totalOutsourced + totalCosourced + totalLicenses;
      const totalHeadcount = resources.length;

      // Data quality = % of resources with CTC populated
      const dataQualityPct = totalHeadcount > 0
        ? Math.round(((totalHeadcount - totalMissingCTC) / totalHeadcount) * 100)
        : 100;

      return {
        departments: deptArray,
        contracts,
        totalInsourced,
        totalOutsourced,
        totalCosourced,
        totalLicenses,
        totalBudget,
        totalHeadcount,
        missingCTC: totalMissingCTC,
        unpaidInvoices,
        renewals90d,
        dataQualityPct,
        licenseCount: licenses.length,
      };
    },
    staleTime: 60_000,
  });
}

/* ═══════════════════════════════════════════════
   CAPACITY OVERVIEW — Live data
   ═══════════════════════════════════════════════ */

export interface DepartmentCapacity {
  name: string;
  did: string;
  color: string;
  headcount: number;
  avgUtilization: number;
  available: number;
  healthy: number;
  atCapacity: number;
  overAllocated: number;
}

export interface CapacityLiveData {
  departments: DepartmentCapacity[];
  totalHeadcount: number;
  avgUtilization: number;
  available: number;
  healthy: number;
  atCapacity: number;
  overAllocated: number;
  contractsEnding30d: number;
  freeingSoon: number;
  vendorBreakdown: { name: string; headcount: number; annualCost: number }[];
  countryBreakdown: { name: string; code: string; headcount: number }[];
  fixedCount: number;
  variableCount: number;
  freelanceCount: number;
}

export function useCapacityLive() {
  return useQuery({
    queryKey: ['strategy', 'capacity-live'],
    queryFn: async (): Promise<CapacityLiveData> => {
      const [resourcesRes, allocsRes, deptsRes, vendorsRes, countriesRes] = await Promise.all([
        supabase.from('resource_inventory')
          .select('id, name, department_id, department_name, vendor_id, country_id, resource_type, ctc, contract_end_date')
          .eq('is_active', true),
        supabase.from('resource_allocations')
          .select('resource_id, allocation_percent')
          .eq('status', 'committed'),
        supabase.from('capacity_departments')
          .select('id, name, department_id, color, sort_order')
          .eq('is_active', true),
        supabase.from('resource_vendors')
          .select('id, name')
          .or('is_active.eq.true,is_active.is.null'),
        supabase.from('resource_countries')
          .select('id, name, code')
          .or('is_active.eq.true,is_active.is.null'),
      ]);

      const resources = resourcesRes.data || [];
      const allocations = allocsRes.data || [];
      const departments = deptsRes.data || [];
      const vendors = vendorsRes.data || [];
      const countries = countriesRes.data || [];

      const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
      const countryMap = new Map(countries.map(c => [c.id, { name: c.name, code: c.code }]));

      // Build allocation map: resource_id → total %
      const allocMap = new Map<string, number>();
      for (const a of allocations) {
        allocMap.set(a.resource_id, (allocMap.get(a.resource_id) || 0) + (Number(a.allocation_percent) || 0));
      }

      // Department capacity
      const deptCap = new Map<string, DepartmentCapacity>();
      for (const d of departments) {
        deptCap.set(d.id, {
          name: d.name,
          did: d.department_id,
          color: d.color || '#2563EB',
          headcount: 0,
          avgUtilization: 0,
          available: 0,
          healthy: 0,
          atCapacity: 0,
          overAllocated: 0,
        });
      }

      let totalAvailable = 0, totalHealthy = 0, totalAtCapacity = 0, totalOverAllocated = 0;
      let contractsEnding30d = 0, freeingSoon = 0;
      const now = new Date();
      const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in90d = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const utilizations: number[] = [];

      // Vendor aggregation
      const vendorAgg = new Map<string, { headcount: number; annualCost: number }>();
      // Country aggregation
      const countryAgg = new Map<string, { name: string; code: string; headcount: number }>();

      for (const r of resources) {
        const alloc = Math.min(allocMap.get(r.id) || 0, 150);
        utilizations.push(Math.min(alloc, 100));

        const dept = deptCap.get(r.department_id);
        if (dept) {
          dept.headcount++;
          if (alloc === 0) { dept.available++; totalAvailable++; }
          else if (alloc <= 80) { dept.healthy++; totalHealthy++; }
          else if (alloc <= 100) { dept.atCapacity++; totalAtCapacity++; }
          else { dept.overAllocated++; totalOverAllocated++; }
        }

        if (r.contract_end_date) {
          const end = new Date(r.contract_end_date);
          if (end <= in30d) contractsEnding30d++;
          else if (end <= in90d) freeingSoon++;
        }

        // Vendor
        if (r.vendor_id) {
          const vName = vendorMap.get(r.vendor_id) || 'Unknown';
          const v = vendorAgg.get(vName) || { headcount: 0, annualCost: 0 };
          v.headcount++;
          v.annualCost += (Number(r.ctc) || 0) * 12;
          vendorAgg.set(vName, v);
        }

        // Country
        if (r.country_id) {
          const c = countryMap.get(r.country_id);
          if (c) {
            const agg = countryAgg.get(c.code) || { name: c.name, code: c.code, headcount: 0 };
            agg.headcount++;
            countryAgg.set(c.code, agg);
          }
        }
      }

      // Compute department avg utilization
      for (const dept of deptCap.values()) {
        const deptResources = resources.filter(r => r.department_id === [...deptCap.entries()].find(([, v]) => v === dept)?.[0]);
        if (deptResources.length > 0) {
          dept.avgUtilization = Math.round(
            deptResources.reduce((s, r) => s + Math.min(allocMap.get(r.id) || 0, 100), 0) / deptResources.length
          );
        }
      }

      const avgUtilization = utilizations.length > 0
        ? Math.round(utilizations.reduce((a, b) => a + b, 0) / utilizations.length)
        : 0;

      const deptArray = Array.from(deptCap.values())
        .sort((a, b) => {
          const da = departments.find(d => d.department_id === a.did);
          const db = departments.find(d => d.department_id === b.did);
          return (da?.sort_order || 0) - (db?.sort_order || 0);
        });

      // Workforce composition
      const fixedCount = resources.filter(r => r.resource_type === 'Fixed').length;
      const variableCount = resources.filter(r => r.resource_type === 'Variable').length;
      const freelanceCount = resources.filter(r => r.resource_type === 'Freelance').length;

      return {
        departments: deptArray,
        totalHeadcount: resources.length,
        avgUtilization,
        available: totalAvailable,
        healthy: totalHealthy,
        atCapacity: totalAtCapacity,
        overAllocated: totalOverAllocated,
        contractsEnding30d,
        freeingSoon,
        fixedCount,
        variableCount,
        freelanceCount,
        vendorBreakdown: Array.from(vendorAgg.entries())
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.headcount - a.headcount),
        countryBreakdown: Array.from(countryAgg.values())
          .sort((a, b) => b.headcount - a.headcount),
      };
    },
    staleTime: 60_000,
  });
}
