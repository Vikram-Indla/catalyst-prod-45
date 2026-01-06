/**
 * Export Service
 * Handles CSV and Excel export functionality
 */

export const exportService = {
  /**
   * Export data to CSV file
   */
  toCSV: (data: Record<string, any>[], filename: string) => {
    if (!data.length) {
      console.warn('No data to export');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = row[h];
          // Handle null/undefined
          if (val == null) return '';
          // Escape commas, quotes, and newlines
          const strVal = String(val);
          if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
            return `"${strVal.replace(/"/g, '""')}"`;
          }
          return strVal;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },
  
  /**
   * Export data to Excel file
   */
  toExcel: async (data: Record<string, any>[], filename: string) => {
    if (!data.length) {
      console.warn('No data to export');
      return;
    }
    
    // Import xlsx dynamically
    const XLSX = await import('xlsx');
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
};
