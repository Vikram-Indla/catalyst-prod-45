import { BacklogItem } from '../types';

export function exportBacklogToCsv(items: BacklogItem[], filename: string = 'backlog-export.csv') {
  // Define CSV headers
  const headers = [
    'ID',
    'Name',
    'State',
    'Health',
    'Points',
    'MVP',
    'Blocked',
    'Owner',
    'Description',
  ];

  // Convert items to CSV rows
  const rows = items.map(item => [
    item.displayId || item.id,
    item.name,
    item.state || '',
    item.health || '',
    item.points?.toString() || '',
    item.mvp ? 'Yes' : 'No',
    item.blocked ? 'Yes' : 'No',
    item.owner || '',
    item.description || '',
  ]);

  // Escape CSV values
  const escapeCsvValue = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Build CSV content
  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
