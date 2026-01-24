/**
 * Enterprise-grade Excel export for Resource Assignments data
 * Features: Professional column widths, formatted dates, clean data presentation
 * Primary Key: AID (Assignment ID)
 */
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { ResourceAssignment } from '@/modules/capacity-planner/hooks/useResourceAssignments';

interface ExportColumn {
  key: keyof ResourceAssignment | 'vendor_display' | 'type_display';
  header: string;
  width: number;
  formatter?: (value: any, assignment: ResourceAssignment) => string;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'assignment_id', header: 'AID', width: 8 },
  { key: 'name', header: 'Assignment Name', width: 28 },
  { key: 'type_display', header: 'Assignment Type', width: 16 },
  { key: 'assignment_status', header: 'Status', width: 14, formatter: (val) => formatStatus(val) },
  { 
    key: 'budget', 
    header: 'Budget (SAR)', 
    width: 16,
    formatter: (val) => val ? new Intl.NumberFormat('en-SA').format(val) : '—'
  },
  { 
    key: 'start_date', 
    header: 'Assignment Start Date', 
    width: 20,
    formatter: (val) => val ? format(new Date(val), 'dd MMM yyyy') : '—'
  },
  { 
    key: 'end_date', 
    header: 'Assignment End Date', 
    width: 20,
    formatter: (val) => val ? format(new Date(val), 'dd MMM yyyy') : '—'
  },
  { 
    key: 'vendor_display', 
    header: 'Vendor', 
    width: 18,
    formatter: (_, assignment) => assignment.vendor?.name || '—'
  },
  { key: 'payment_status', header: 'Payment Status', width: 16, formatter: (val) => formatPaymentStatus(val) },
  { key: 'is_active', header: 'Active', width: 10, formatter: (val) => val ? 'Yes' : 'No' },
];

function formatStatus(status: string | null): string {
  const map: Record<string, string> = {
    yet_to_start: 'Yet to Start',
    on_hold: 'On Hold',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return map[status || ''] || '—';
}

function formatPaymentStatus(status: string | null): string {
  const map: Record<string, string> = {
    not_applicable: 'N/A',
    unpaid: 'Unpaid',
    on_track: 'On Track',
    paid: 'Paid',
    closed: 'Closed',
  };
  return map[status || ''] || '—';
}

function normalizeAssignmentType(type: string | null | undefined): string {
  if (!type) return 'Unspecified';
  if (type === 'BAU') return 'Insourced';
  if (type === 'Project') return 'Outsourced';
  return type;
}

export function exportAssignmentsToExcel(assignments: ResourceAssignment[]): void {
  if (assignments.length === 0) {
    throw new Error('No data to export');
  }

  // Format data rows
  const formattedData = assignments.map(assignment => {
    const row: Record<string, any> = {};
    EXPORT_COLUMNS.forEach(col => {
      if (col.key === 'vendor_display') {
        row[col.header] = col.formatter ? col.formatter(null, assignment) : '—';
      } else if (col.key === 'type_display') {
        row[col.header] = normalizeAssignmentType(assignment.assignment_type);
      } else {
        const value = assignment[col.key as keyof ResourceAssignment];
        row[col.header] = col.formatter ? col.formatter(value, assignment) : (value ?? '—');
      }
    });
    return row;
  });

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create main data sheet
  const ws = XLSX.utils.json_to_sheet(formattedData);

  // Set enterprise-grade column widths
  ws['!cols'] = EXPORT_COLUMNS.map(col => ({ wch: col.width }));

  // Add autofilter for the header row
  const lastCol = String.fromCharCode(64 + EXPORT_COLUMNS.length);
  ws['!autofilter'] = { ref: `A1:${lastCol}${assignments.length + 1}` };

  XLSX.utils.book_append_sheet(wb, ws, 'Assignments');

  // Create summary sheet
  const typeBreakdown = {
    Outsourced: assignments.filter(a => normalizeAssignmentType(a.assignment_type) === 'Outsourced').length,
    Cosourced: assignments.filter(a => normalizeAssignmentType(a.assignment_type) === 'Cosourced').length,
    Insourced: assignments.filter(a => normalizeAssignmentType(a.assignment_type) === 'Insourced').length,
    Unspecified: assignments.filter(a => normalizeAssignmentType(a.assignment_type) === 'Unspecified').length,
  };

  const totalBudget = assignments.reduce((sum, a) => sum + (a.budget || 0), 0);

  const summaryData = [
    ['RESOURCE ASSIGNMENTS EXPORT'],
    [''],
    ['Export Information'],
    ['Generated On', format(new Date(), 'dd MMMM yyyy, HH:mm')],
    ['Total Assignments', assignments.length],
    ['Total Budget (SAR)', new Intl.NumberFormat('en-SA').format(totalBudget)],
    [''],
    ['Assignment Type Breakdown'],
    ['Outsourced', typeBreakdown.Outsourced],
    ['Cosourced', typeBreakdown.Cosourced],
    ['Insourced', typeBreakdown.Insourced],
    ['Unspecified', typeBreakdown.Unspecified],
    [''],
    ['Status Breakdown'],
    ['In Progress', assignments.filter(a => a.assignment_status === 'in_progress').length],
    ['On Hold', assignments.filter(a => a.assignment_status === 'on_hold').length],
    ['Completed', assignments.filter(a => a.assignment_status === 'completed').length],
    ['Yet to Start', assignments.filter(a => a.assignment_status === 'yet_to_start').length],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 22 }, { wch: 30 }];
  summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Generate filename with timestamp
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  const filename = `Resource-Assignments-${timestamp}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
}
