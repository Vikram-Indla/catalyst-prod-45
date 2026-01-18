import * as XLSX from 'xlsx';

interface DefectAssignee {
  name: string;
  initials: string;
}

interface Defect {
  id: string;
  title: string;
  severity: string;
  priority?: string;
  status: string;
  assignee: DefectAssignee;
  createdAt: string;
  updatedAt?: string;
  resolution?: string;
  releaseId?: string;
  description?: string;
}

export const exportDefects = async (
  defects: Defect[], 
  format: 'csv' | 'xlsx'
): Promise<void> => {
  const data = defects.map(d => ({
    'ID': d.id,
    'Title': d.title,
    'Severity': d.severity,
    'Priority': d.priority,
    'Status': d.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    'Assignee': d.assignee?.name || 'Unassigned',
    'Created Date': d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
    'Updated Date': d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : '',
    'Resolution': d.resolution || '',
    'Release': d.releaseId || '',
    'Description': d.description || ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key as keyof typeof row] || '').length))
  }));
  ws['!cols'] = colWidths;
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Defects');

  const filename = `defects-export-${new Date().toISOString().split('T')[0]}.${format}`;
  
  if (format === 'csv') {
    XLSX.writeFile(wb, filename, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, filename, { bookType: 'xlsx' });
  }
};

export const exportDefectsByStatus = async (
  defects: Defect[],
  format: 'csv' | 'xlsx'
): Promise<void> => {
  const wb = XLSX.utils.book_new();
  
  const statuses = [...new Set(defects.map(d => d.status))];
  
  statuses.forEach(status => {
    const statusDefects = defects.filter(d => d.status === status);
    const data = statusDefects.map(d => ({
      'ID': d.id,
      'Title': d.title,
      'Severity': d.severity,
      'Priority': d.priority,
      'Assignee': d.assignee?.name || 'Unassigned',
      'Created Date': d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
      'Resolution': d.resolution || ''
    }));
    
    if (data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data);
      const sheetName = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()).substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  });

  const filename = `defects-by-status-${new Date().toISOString().split('T')[0]}.${format}`;
  XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
};
