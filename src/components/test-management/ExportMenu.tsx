import React, { useState } from 'react';
import { Download, FileText, Table, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { exportTestCasesToCSV, exportTestCasesToExcel } from '@/hooks/useImportExport';
import { useToast } from '@/hooks/use-toast';
import { generateReportPDF, downloadPDF } from '@/utils/pdfGenerator';
import type { TestCase } from '@/types/test-management';

interface ExportMenuProps {
  testCases: TestCase[];
  disabled?: boolean;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ testCases, disabled = false }) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    if (testCases.length === 0) {
      toast({
        title: 'No data',
        description: 'No test cases to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      exportTestCasesToCSV(testCases);
      toast({
        title: 'Export Complete',
        description: `Exported ${testCases.length} test cases to CSV`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export CSV',
        variant: 'destructive',
      });
    }
  };

  const handleExportExcel = () => {
    if (testCases.length === 0) {
      toast({
        title: 'No data',
        description: 'No test cases to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      exportTestCasesToExcel(testCases);
      toast({
        title: 'Export Complete',
        description: `Exported ${testCases.length} test cases to Excel`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export Excel',
        variant: 'destructive',
      });
    }
  };

  const handleExportPDF = async () => {
    if (testCases.length === 0) {
      toast({
        title: 'No data',
        description: 'No test cases to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const reportData = {
        title: 'Test Cases Report',
        totalTests: testCases.length,
        passedTests: 0,
        failedTests: 0,
        notRunTests: testCases.length,
        passRate: 0,
        testCases: testCases.slice(0, 50), // Limit to 50 for PDF
      };

      const doc = await generateReportPDF(reportData);
      downloadPDF(doc, `test-cases-report-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: 'Export Complete',
        description: `Exported ${Math.min(testCases.length, 50)} test cases to PDF`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || isExporting}
          className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
        >
          {isExporting ? (
            <>
              <Download className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <Table className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileDown className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
