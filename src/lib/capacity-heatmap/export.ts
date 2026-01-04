/**
 * Export utilities for Catalyst V5 Capacity Heatmap
 * PDF, PNG, and CSV export functionality
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { HeatmapResource } from '@/types/capacity-heatmap';
import { formatMonth } from './utils';

export async function exportToPNG(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
  });
  
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportToPDF(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [canvas.width / 2, canvas.height / 2],
  });
  
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save(`${filename}.pdf`);
}

export function exportToCSV(resources: HeatmapResource[], months: Date[], filename: string): void {
  const headers = ['Name', 'Role', 'Department', 'Team', ...months.map(m => 
    formatMonth(m, 'short')
  ), 'Average', 'Trend', 'Conflicts'];
  
  const rows = resources.map(r => [
    r.name,
    r.role,
    r.department,
    r.team,
    ...r.monthlyUtilization.map(u => `${u.percentage}%`),
    `${r.averageUtilization}%`,
    r.trend,
    r.conflictCount.toString(),
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.download = `${filename}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToJSON(resources: HeatmapResource[], filename: string): void {
  const data = resources.map(r => ({
    id: r.id,
    name: r.name,
    role: r.role,
    department: r.department,
    team: r.team,
    averageUtilization: r.averageUtilization,
    trend: r.trend,
    conflictCount: r.conflictCount,
    monthlyData: r.monthlyUtilization.map(u => ({
      month: u.month.toISOString(),
      percentage: u.percentage,
      status: u.status,
      isConflict: u.isConflict,
    })),
  }));
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `${filename}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}
