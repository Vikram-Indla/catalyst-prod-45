/**
 * Enterprise-grade PDF & Excel export utilities for Planner module
 * Uses jsPDF for PDF generation with professional formatting
 */

import type { PlannerTask } from '../types';

import { loadJsPDF } from '@/lib/exportLoaders';
const loadAutoTable = () => import('jspdf-autotable').then(m => m.default);

interface ExportOptions {
  title: string;
  subtitle?: string;
  viewType: string;
  tasks: PlannerTask[];
  dateRange?: { start: string; end: string };
  filters?: Record<string, string>;
}

// Brand colors for enterprise styling
const BRAND_COLORS = {
  primary: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
  secondary: '#1e40af',
  accent: 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: 'var(--ds-border, var(--ds-border, #e5e7eb))',
  success: '#10b981',
  warning: 'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))',
  danger: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))',
  high: '#f97316',
  medium: '#eab308',
  low: 'var(--ds-text-success, var(--ds-text-success, #22c55e))',
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
};

/**
 * Generate enterprise-grade PDF report for Planner data
 */
export async function exportPlannerToPDF(options: ExportOptions): Promise<void> {
  const { title, subtitle, viewType, tasks, dateRange, filters } = options;
  
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (currentY + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      addHeader();
      return true;
    }
    return false;
  };

  // Add header with branding
  const addHeader = () => {
    // Logo placeholder / Brand name
    pdf.setFillColor(BRAND_COLORS.primary);
    pdf.rect(margin, currentY, 8, 8, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(BRAND_COLORS.text);
    pdf.text('CATALYST', margin + 12, currentY + 6);
    
    // Title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(BRAND_COLORS.textMuted);
    pdf.text(`Planner ${title}`, pageWidth - margin, currentY + 6, { align: 'right' });
    
    currentY += 12;
    
    // Divider line
    pdf.setDrawColor(BRAND_COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
  };

  // Add metadata section
  const addMetadata = () => {
    const exportDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(BRAND_COLORS.textMuted);
    
    pdf.text(`Generated: ${exportDate}`, margin, currentY);
    pdf.text(`View: ${viewType}`, margin + 80, currentY);
    pdf.text(`Total Tasks: ${tasks.length}`, margin + 140, currentY);
    
    if (dateRange) {
      pdf.text(`Period: ${dateRange.start} - ${dateRange.end}`, pageWidth - margin, currentY, { align: 'right' });
    }
    
    currentY += 6;

    // Active filters
    if (filters && Object.keys(filters).length > 0) {
      const filterText = Object.entries(filters)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
      
      if (filterText) {
        pdf.setFontSize(9);
        pdf.text(`Filters: ${filterText}`, margin, currentY);
        currentY += 5;
      }
    }
    
    currentY += 5;
  };

  // Add summary statistics
  const addSummaryStats = () => {
    const stats = calculateStats(tasks);
    
    pdf.setFillColor('var(--ds-surface-sunken, var(--ds-surface-sunken, #f8fafc))');
    pdf.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 3, 3, 'F');
    
    const statBoxWidth = (pageWidth - (margin * 2)) / 5;
    let statX = margin + 8;
    const statY = currentY + 8;

    const statItems = [
      { label: 'Total', value: stats.total.toString(), color: BRAND_COLORS.primary },
      { label: 'In Progress', value: stats.inProgress.toString(), color: BRAND_COLORS.accent },
      { label: 'Completed', value: stats.done.toString(), color: BRAND_COLORS.success },
      { label: 'Blocked', value: stats.blocked.toString(), color: BRAND_COLORS.danger },
      { label: 'Overdue', value: stats.overdue.toString(), color: BRAND_COLORS.warning },
    ];

    statItems.forEach((stat, i) => {
      const x = statX + (i * statBoxWidth);
      
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(stat.color);
      pdf.text(stat.value, x, statY);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(BRAND_COLORS.textMuted);
      pdf.text(stat.label, x, statY + 6);
    });

    currentY += 32;
  };

  // Add tasks table
  // Add tasks table
  const addTasksTable = async () => {
    // Add spacing prefix for priority to make room for the indicator
    const tableData = tasks.map(task => [
      task.key,
      truncateText(task.title, 40),
      STATUS_LABELS[task.status] || task.status,
      '    ' + task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
      task.teamName || '—',
      task.assigneeName || 'Unassigned',
      formatDate(task.dueDate),
      `${task.progress}%`,
    ]);

    const autoTable = await loadAutoTable();
    autoTable(pdf, {
      startY: currentY,
      head: [['ID', 'Title', 'Status', 'Priority', 'Workstream', 'Assignee', 'Due Date', 'Progress']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND_COLORS.primary,
        textColor: 'var(--ds-surface, var(--ds-surface, #ffffff))',
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: BRAND_COLORS.text,
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: '#f9fafb',
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold', textColor: BRAND_COLORS.primary },
        1: { cellWidth: 65 },
        2: { cellWidth: 25 },
        3: { cellWidth: 28 },
        4: { cellWidth: 35 },
        5: { cellWidth: 35 },
        6: { cellWidth: 25 },
        7: { cellWidth: 20, halign: 'center' },
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data: any) => {
        // Color priority cells with indicator dot
        if (data.section === 'body' && data.column.index === 3) {
          const cellText = String(data.cell.raw || '').trim().toLowerCase();
          const color = PRIORITY_COLORS[cellText];
          if (color) {
            pdf.setFillColor(color);
            pdf.circle(data.cell.x + 4, data.cell.y + data.cell.height / 2, 1.5, 'F');
          }
        }
      },
    });

    currentY = (pdf as any).lastAutoTable.finalY + 10;
  };

  // Add footer
  const addFooter = () => {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(BRAND_COLORS.textMuted);
      
      // Page number
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      
      // Confidential notice
      pdf.text('Confidential - For Internal Use Only', margin, pageHeight - 8);
      
      // Divider
      pdf.setDrawColor(BRAND_COLORS.border);
      pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    }
  };

  // Build the PDF
  addHeader();
  addMetadata();
  addSummaryStats();
  
  if (tasks.length > 0) {
    await addTasksTable();
  } else {
    pdf.setFontSize(12);
    pdf.setTextColor(BRAND_COLORS.textMuted);
    pdf.text('No tasks to display for the selected filters.', margin, currentY);
  }
  
  addFooter();

  // Save the PDF
  const fileName = `planner-${viewType.toLowerCase().replace(/\s+/g, '-')}-${formatDateForFilename(new Date())}.pdf`;
  pdf.save(fileName);
}

/**
 * Export tasks to Excel/CSV format
 */
export function exportPlannerToExcel(options: ExportOptions): void {
  const { title, viewType, tasks } = options;
  
  const headers = [
    'ID',
    'Title',
    'Description',
    'Status',
    'Priority',
    'Workstream',
    'Assignee',
    'Start Date',
    'Due Date',
    'Progress',
    'Blocked',
    'Created At',
  ];

  const rows = tasks.map(task => [
    task.key,
    task.title,
    task.description || '',
    STATUS_LABELS[task.status] || task.status,
    task.priority,
    task.teamName || '',
    task.assigneeName || '',
    task.startDate || '',
    task.dueDate || '',
    `${task.progress}%`,
    task.blocked ? 'Yes' : 'No',
    task.createdAt || '',
  ]);

  const csvContent = [
    `# Catalyst Planner - ${title}`,
    `# Generated: ${new Date().toISOString()}`,
    `# View: ${viewType}`,
    `# Total Tasks: ${tasks.length}`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.download = `planner-${viewType.toLowerCase().replace(/\s+/g, '-')}-${formatDateForFilename(new Date())}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

// Helper functions
function calculateStats(tasks: PlannerTask[]) {
  const now = new Date();
  return {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.blocked).length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length,
  };
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}
