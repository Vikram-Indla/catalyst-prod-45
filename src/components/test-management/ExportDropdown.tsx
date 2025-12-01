import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Table } from 'lucide-react';
import { toast } from 'sonner';

interface ExportDropdownProps {
  onExportPDF: () => Promise<void>;
  onExportExcel: () => Promise<void>;
  onExportCSV: () => Promise<void>;
}

export function ExportDropdown({ onExportPDF, onExportExcel, onExportCSV }: ExportDropdownProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async (exportFn: () => Promise<void>, format: string) => {
    setIsExporting(true);
    try {
      await exportFn();
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error(`Export ${format} error:`, error);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={isExporting}
          className="border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white"
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport(onExportPDF, 'pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport(onExportExcel, 'excel')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport(onExportCSV, 'csv')}>
          <Table className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
