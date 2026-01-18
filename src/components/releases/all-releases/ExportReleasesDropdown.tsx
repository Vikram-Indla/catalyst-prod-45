/**
 * Export Releases Dropdown
 * Dropdown menu for exporting releases in various formats
 */

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { exportReleases, ReleaseExportData } from '@/utils/exportReleases';

interface ExportReleasesDropdownProps {
  releases: ReleaseExportData[];
  selectedReleases?: ReleaseExportData[];
  hasSelection?: boolean;
}

export function ExportReleasesDropdown({
  releases,
  selectedReleases = [],
  hasSelection = false,
}: ExportReleasesDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'all-csv' | 'all-excel' | 'selected') => {
    setIsExporting(true);
    try {
      const dataToExport = type === 'selected' ? selectedReleases : releases;
      const format = type.includes('excel') ? 'xlsx' : 'csv';
      
      await exportReleases(dataToExport, format);
      toast.success(`Exported ${dataToExport.length} releases as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white">
        <DropdownMenuItem onClick={() => handleExport('all-csv')}>
          <FileText className="w-4 h-4 mr-2" />
          Export All as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('all-excel')}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export All as Excel
        </DropdownMenuItem>
        {hasSelection && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleExport('selected')}
              disabled={selectedReleases.length === 0}
            >
              <FileText className="w-4 h-4 mr-2" />
              Export Selected ({selectedReleases.length})
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
