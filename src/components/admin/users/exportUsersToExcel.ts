/**
 * Enterprise-grade Excel export for User/Resource data
 * Features: Professional column widths, formatted dates, clean data presentation
 */
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { UserProfile } from '@/hooks/useUsers';

interface ExportColumn {
  key: keyof UserProfile | 'roles_display';
  header: string;
  width: number; // Character width for column
  formatter?: (value: any, user: UserProfile) => string;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'rid', header: 'Resource ID', width: 14 },
  { key: 'full_name', header: 'Full Name', width: 28 },
  { key: 'email', header: 'Email Address', width: 35 },
  { key: 'job_role', header: 'Job Role', width: 25 },
  { key: 'department_name', header: 'Department', width: 22 },
  { key: 'assignment_name', header: 'Assignment', width: 22 },
  { key: 'resource_type', header: 'Resource Type', width: 16 },
  { key: 'vendor', header: 'Vendor', width: 20 },
  { 
    key: 'contract_start_date', 
    header: 'Contract Start', 
    width: 16,
    formatter: (val) => val ? format(new Date(val), 'dd MMM yyyy') : '—'
  },
  { 
    key: 'contract_end_date', 
    header: 'Contract End', 
    width: 16,
    formatter: (val) => val ? format(new Date(val), 'dd MMM yyyy') : '—'
  },
  { key: 'country', header: 'Country', width: 18 },
  { key: 'location', header: 'Location', width: 20 },
  { 
    key: 'roles_display', 
    header: 'System Roles', 
    width: 30,
    formatter: (_, user) => user.roles?.map(r => r.role_name).join(', ') || '—'
  },
  { 
    key: 'approval_status', 
    header: 'Status', 
    width: 14,
    formatter: (val) => {
      if (!val) return 'Pending';
      return String(val).charAt(0).toUpperCase() + String(val).slice(1);
    }
  },
];

export function exportUsersToExcel(users: UserProfile[]): void {
  if (users.length === 0) {
    throw new Error('No data to export');
  }

  // Format data rows
  const formattedData = users.map(user => {
    const row: Record<string, any> = {};
    EXPORT_COLUMNS.forEach(col => {
      const value = col.key === 'roles_display' ? null : user[col.key as keyof UserProfile];
      row[col.header] = col.formatter ? col.formatter(value, user) : (value ?? '—');
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
  ws['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + EXPORT_COLUMNS.length)}${users.length + 1}` };

  XLSX.utils.book_append_sheet(wb, ws, 'Resources');

  // Create summary sheet
  const summaryData = [
    ['RESOURCE DIRECTORY EXPORT'],
    [''],
    ['Export Information'],
    ['Generated On', format(new Date(), 'dd MMMM yyyy, HH:mm')],
    ['Total Resources', users.length],
    [''],
    ['Resource Type Breakdown'],
    ['Fixed', users.filter(u => u.resource_type === 'Fixed').length],
    ['Core', users.filter(u => u.resource_type === 'Core').length],
    ['Freelance', users.filter(u => u.resource_type === 'Freelance').length],
    ['Unclassified', users.filter(u => !u.resource_type).length],
    [''],
    ['Status Breakdown'],
    ['Approved', users.filter(u => String(u.approval_status) === 'approved').length],
    ['Pending', users.filter(u => !u.approval_status || String(u.approval_status) === 'pending').length],
    ['Disabled', users.filter(u => String(u.approval_status) === 'disabled').length],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 22 }, { wch: 30 }];
  
  // Style the title (make it span columns)
  summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Generate filename with timestamp
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  const filename = `Resource-Directory-${timestamp}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
}
