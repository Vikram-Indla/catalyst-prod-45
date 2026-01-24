/**
 * Enterprise-grade Excel export for Resource Utilization data
 * Features: Professional column widths, monthly breakdown, clean data presentation
 * Primary Key: RID (Resource ID)
 */
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { ResourceUtilizationItem } from '@/hooks/useResourceUtilization';
import { MONTHS } from '@/hooks/useResourceUtilization';

interface ExportColumn {
  key: string;
  header: string;
  width: number;
  formatter?: (resource: ResourceUtilizationItem) => string | number;
}

const buildExportColumns = (): ExportColumn[] => {
  const baseColumns: ExportColumn[] = [
    { key: 'rid', header: 'RID', width: 8, formatter: (r) => r.rid || '—' },
    { key: 'resource_name', header: 'Resource Name', width: 28, formatter: (r) => r.resource_name },
    { key: 'assignment_name', header: 'Assignment', width: 22, formatter: (r) => r.assignment_name || '—' },
    { 
      key: 'contract_end_date', 
      header: 'Contract End', 
      width: 14,
      formatter: (r) => r.contract_end_date ? format(new Date(r.contract_end_date), 'dd MMM yyyy') : '—'
    },
  ];

  // Add monthly columns
  const monthColumns: ExportColumn[] = MONTHS.map(m => ({
    key: `month_${m.num}`,
    header: m.name,
    width: 6,
    formatter: (r: ResourceUtilizationItem) => {
      const monthData = r.monthly_allocations.find(ma => ma.month === m.num);
      return monthData?.allocation_percent ?? r.default_capacity_percent;
    }
  }));

  // Add average column
  const avgColumn: ExportColumn = {
    key: 'avg',
    header: 'Avg',
    width: 8,
    formatter: (r: ResourceUtilizationItem) => {
      const values = MONTHS.map(m => {
        const monthData = r.monthly_allocations.find(ma => ma.month === m.num);
        return monthData?.allocation_percent ?? r.default_capacity_percent;
      });
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return Math.round(avg);
    }
  };

  return [...baseColumns, ...monthColumns, avgColumn];
};

export function exportUtilizationToExcel(resources: ResourceUtilizationItem[], year: number): void {
  if (resources.length === 0) {
    throw new Error('No data to export');
  }

  const EXPORT_COLUMNS = buildExportColumns();

  // Format data rows
  const formattedData = resources.map(resource => {
    const row: Record<string, any> = {};
    EXPORT_COLUMNS.forEach(col => {
      row[col.header] = col.formatter ? col.formatter(resource) : '—';
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
  const lastCol = EXPORT_COLUMNS.length <= 26 
    ? String.fromCharCode(64 + EXPORT_COLUMNS.length)
    : 'A' + String.fromCharCode(64 + (EXPORT_COLUMNS.length - 26));
  ws['!autofilter'] = { ref: `A1:${lastCol}${resources.length + 1}` };

  XLSX.utils.book_append_sheet(wb, ws, 'Utilization');

  // Calculate stats for summary
  const avgUtilization = resources.map(r => {
    const values = MONTHS.map(m => {
      const monthData = r.monthly_allocations.find(ma => ma.month === m.num);
      return monthData?.allocation_percent ?? r.default_capacity_percent;
    });
    return values.reduce((a, b) => a + b, 0) / values.length;
  });

  const overallAvg = avgUtilization.length > 0 
    ? Math.round(avgUtilization.reduce((a, b) => a + b, 0) / avgUtilization.length) 
    : 0;

  const healthy = avgUtilization.filter(a => a > 0 && a <= 80).length;
  const atCapacity = avgUtilization.filter(a => a > 80 && a <= 100).length;
  const overloaded = avgUtilization.filter(a => a > 100).length;
  const unallocated = avgUtilization.filter(a => a === 0).length;

  // Get unique assignments
  const uniqueAssignments = new Set(resources.map(r => r.assignment_name).filter(Boolean));

  const summaryData = [
    ['RESOURCE UTILIZATION EXPORT'],
    [''],
    ['Export Information'],
    ['Generated On', format(new Date(), 'dd MMMM yyyy, HH:mm')],
    ['Year', year],
    ['Total Resource-Assignment Rows', resources.length],
    ['Unique Assignments', uniqueAssignments.size],
    [''],
    ['Utilization Summary'],
    ['Overall Average Utilization', `${overallAvg}%`],
    [''],
    ['Utilization Breakdown'],
    ['Healthy (1-80%)', healthy],
    ['At Capacity (81-100%)', atCapacity],
    ['Overloaded (>100%)', overloaded],
    ['Unallocated (0%)', unallocated],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 26 }, { wch: 30 }];
  summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Generate filename with timestamp
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  const filename = `Resource-Utilization-${year}-${timestamp}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
}
