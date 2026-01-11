// ============================================================
// REQUIREMENT ASSIST EXPORT UTILITIES
// Export work items to Excel, CSV, and JSON formats
// ============================================================

import * as XLSX from 'xlsx';

interface WorkItem {
  id: string;
  displayId: string;
  itemType: string;
  title: string;
  description?: string | null;
  acceptanceCriteria?: string[];
  confidenceScore: number;
  parentId?: string | null;
}

export function exportToExcel(workItems: WorkItem[], filename: string = 'requirements') {
  const data = workItems.map(item => ({
    'ID': item.displayId,
    'Type': item.itemType.toUpperCase(),
    'Title': item.title,
    'Description': item.description || '',
    'Acceptance Criteria': (item.acceptanceCriteria || []).join('\n'),
    'Confidence': `${Math.round(item.confidenceScore * 100)}%`,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Work Items');

  // Set column widths
  ws['!cols'] = [
    { wch: 12 },  // ID
    { wch: 10 },  // Type
    { wch: 50 },  // Title
    { wch: 60 },  // Description
    { wch: 80 },  // Acceptance Criteria
    { wch: 12 },  // Confidence
  ];

  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportToCSV(workItems: WorkItem[], filename: string = 'requirements') {
  const headers = ['ID', 'Type', 'Title', 'Description', 'Acceptance Criteria', 'Confidence'];
  
  const escapeCSV = (str: string) => {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = workItems.map(item => [
    item.displayId,
    item.itemType.toUpperCase(),
    escapeCSV(item.title),
    escapeCSV(item.description || ''),
    escapeCSV((item.acceptanceCriteria || []).join('; ')),
    `${Math.round(item.confidenceScore * 100)}%`,
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `${filename}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

export function exportToJSON(workItems: WorkItem[], filename: string = 'requirements') {
  const data = workItems.map(item => ({
    id: item.displayId,
    type: item.itemType,
    title: item.title,
    description: item.description,
    acceptanceCriteria: item.acceptanceCriteria,
    confidence: item.confidenceScore,
  }));

  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
