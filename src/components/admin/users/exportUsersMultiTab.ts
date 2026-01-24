import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  rid: string | null;
  full_name: string | null;
  job_role: string | null;
  department_id: string | null;
  department_name: string | null;
  assignment_id: string | null;
  assignment_name: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  resource_type: string | null;
  country_id: string | null;
  country_name: string | null;
  location_id: string | null;
  location_name: string | null;
  cost_to_company: number | null;
}

interface ResourceUtilizationRow {
  rid: string;
  resource_name: string;
  assignment_name: string;
  contract_end_date: string;
  [key: string]: string | number;
}

interface ResourceAssignmentRow {
  aid: string;
  name: string;
  type: string;
  status: string;
  budget: number | string;
  start_date: string;
  end_date: string;
  vendor: string;
  payment_status: string;
  active: string;
}

const MONTHS = [
  { num: 1, name: 'Jan' }, { num: 2, name: 'Feb' }, { num: 3, name: 'Mar' },
  { num: 4, name: 'Apr' }, { num: 5, name: 'May' }, { num: 6, name: 'Jun' },
  { num: 7, name: 'Jul' }, { num: 8, name: 'Aug' }, { num: 9, name: 'Sep' },
  { num: 10, name: 'Oct' }, { num: 11, name: 'Nov' }, { num: 12, name: 'Dec' },
];

function formatDate(date: string | null): string {
  if (!date) return '—';
  try {
    return format(new Date(date), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

function normalizeType(type: string | null): string {
  if (!type) return 'Unspecified';
  if (type === 'BAU') return 'Insourced';
  if (type === 'Project') return 'Outsourced';
  return type;
}

function formatStatus(status: string | null): string {
  if (!status) return '—';
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export async function exportUsersMultiTab(
  users: UserProfile[],
  departments: Array<{ id: string; department_id: string | null }>,
  assignments: Array<{ id: string; assignment_id: string | null }>,
  vendors: Array<{ id: string; vendor_code: string | null }>
) {
  const workbook = XLSX.utils.book_new();
  const today = format(new Date(), 'yyyy-MM-dd');

  // ==================== SHEET 1: RESOURCES ====================
  const userHeaders = ['RID', 'Name', 'Job Role', 'DID', 'Department', 'AID', 'Assignment', 
    'Contract Start', 'Contract End', 'VID', 'Vendor', 'Resource Type', 'Country', 'Location', 'CTC (SAR)'];
  
  const userData = users.map(u => [
    u.rid || '—',
    u.full_name || '—',
    u.job_role || '—',
    departments.find(d => d.id === u.department_id)?.department_id || '—',
    u.department_name || '—',
    assignments.find(a => a.id === u.assignment_id)?.assignment_id || '—',
    u.assignment_name || '—',
    formatDate(u.contract_start_date),
    formatDate(u.contract_end_date),
    vendors.find(v => v.id === u.vendor_id)?.vendor_code || '—',
    u.vendor_name || '—',
    u.resource_type || '—',
    u.country_name || '—',
    u.location_name || '—',
    u.cost_to_company ?? '—',
  ]);

  const usersSheet = XLSX.utils.aoa_to_sheet([userHeaders, ...userData]);
  usersSheet['!cols'] = [
    { wch: 8 }, { wch: 28 }, { wch: 22 }, { wch: 6 }, { wch: 20 }, 
    { wch: 6 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 6 },
    { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }
  ];
  usersSheet['!autofilter'] = { ref: `A1:O${userData.length + 1}` };
  XLSX.utils.book_append_sheet(workbook, usersSheet, 'Resources');

  // ==================== SHEET 2: UTILIZATION ====================
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;
  
  const utilizationHeaders = ['RID', 'Resource Name', 'Assignment', 'Contract End', 
    ...MONTHS.map(m => m.name), 'Avg'];

  // Fetch utilization data
  const { data: inventory } = await supabase
    .from('resource_inventory')
    .select('id, rid, name, assignment_id, contract_end_date, default_capacity_percent')
    .eq('is_active', true)
    .order('rid', { ascending: true, nullsFirst: false });

  const { data: allocations } = await supabase
    .from('resource_allocations')
    .select('id, resource_id, assignment_id, allocation_percent, start_date, end_date, status')
    .gte('start_date', yearStart)
    .lte('end_date', yearEnd)
    .eq('status', 'committed');

  const { data: assignmentList } = await supabase
    .from('resource_assignments')
    .select('id, name')
    .or('is_active.is.null,is_active.eq.true');

  const assignmentMap = new Map((assignmentList || []).map(a => [a.id, a.name]));
  
  // Build allocation map: resource_id -> month -> allocation_percent
  const allocationMap = new Map<string, Map<number, number>>();
  
  (allocations || []).forEach(a => {
    if (!a.start_date || !a.end_date) return;
    const startDate = new Date(a.start_date);
    const endDate = new Date(a.end_date);
    
    // For each month, check if allocation covers it
    for (const m of MONTHS) {
      const monthStart = new Date(currentYear, m.num - 1, 1);
      const monthEnd = new Date(currentYear, m.num, 0);
      
      if (startDate <= monthEnd && endDate >= monthStart) {
        const key = `${a.resource_id}:${a.assignment_id || 'null'}`;
        if (!allocationMap.has(key)) allocationMap.set(key, new Map());
        allocationMap.get(key)!.set(m.num, a.allocation_percent);
      }
    }
  });

  const utilizationData = (inventory || []).map(r => {
    const key = `${r.id}:${r.assignment_id || 'null'}`;
    const monthlyAllocs = allocationMap.get(key) || new Map();
    const monthValues = MONTHS.map(m => monthlyAllocs.get(m.num) ?? r.default_capacity_percent ?? 100);
    const avg = Math.round(monthValues.reduce((a, b) => a + b, 0) / 12);
    
    return [
      r.rid || '—',
      r.name,
      r.assignment_id ? (assignmentMap.get(r.assignment_id) || '—') : '—',
      formatDate(r.contract_end_date),
      ...monthValues,
      avg
    ];
  });

  const utilizationSheet = XLSX.utils.aoa_to_sheet([utilizationHeaders, ...utilizationData]);
  utilizationSheet['!cols'] = [
    { wch: 8 }, { wch: 28 }, { wch: 22 }, { wch: 14 },
    ...MONTHS.map(() => ({ wch: 6 })), { wch: 6 }
  ];
  utilizationSheet['!autofilter'] = { ref: `A1:Q${utilizationData.length + 1}` };
  XLSX.utils.book_append_sheet(workbook, utilizationSheet, 'Utilization');

  // ==================== SHEET 3: ASSIGNMENTS ====================
  const assignmentHeaders = ['AID', 'Assignment Name', 'Type', 'Status', 'Budget (SAR)', 
    'Start Date', 'End Date', 'Vendor', 'Payment Status', 'Active'];

  const { data: assignmentsData } = await supabase
    .from('resource_assignments')
    .select(`*, resource_vendors(name)`)
    .order('assignment_type', { ascending: true });

  const { data: vendorList } = await supabase.from('resource_vendors').select('id, name');
  const vendorMap = new Map((vendorList || []).map(v => [v.id, v.name]));

  const assignmentRows = (assignmentsData || []).map(a => [
    a.assignment_id || '—',
    a.name,
    normalizeType(a.assignment_type),
    formatStatus(a.assignment_status),
    a.budget ?? '—',
    formatDate(a.start_date),
    formatDate(a.end_date),
    a.vendor_id ? (vendorMap.get(a.vendor_id) || '—') : '—',
    formatStatus(a.payment_status),
    a.is_active ? 'Yes' : 'No'
  ]);

  const assignmentsSheet = XLSX.utils.aoa_to_sheet([assignmentHeaders, ...assignmentRows]);
  assignmentsSheet['!cols'] = [
    { wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 8 }
  ];
  assignmentsSheet['!autofilter'] = { ref: `A1:J${assignmentRows.length + 1}` };
  XLSX.utils.book_append_sheet(workbook, assignmentsSheet, 'Assignments');

  // ==================== DOWNLOAD ====================
  const filename = `Resource-Master-Export-${today}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
