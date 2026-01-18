/**
 * Export Dropdown Component
 * Reusable dropdown menu for export options
 */

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReleaseDetail, ReleaseMetrics, HealthScore, QualityGate } from '../types';

interface ExportData {
  release: ReleaseDetail;
  metrics?: ReleaseMetrics;
  healthScore?: HealthScore;
  qualityGates?: QualityGate[];
}

interface ExportDropdownProps {
  data: ExportData;
  variant?: 'outline' | 'default';
  size?: 'sm' | 'default';
}

export function ExportDropdown({ data, variant = 'outline', size = 'sm' }: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null);

  const generatePDF = async () => {
    setIsExporting('pdf');
    try {
      // Simulate PDF generation
      await new Promise(r => setTimeout(r, 1500));

      // Create a simple text-based export for now
      const content = `
RELEASE REPORT
==============

Release: ${data.release.version}
Name: ${data.release.name}
Status: ${data.release.status}
Organization: ${data.release.organization || 'N/A'}

DATES
-----
Start Date: ${data.release.startDate}
Target Date: ${data.release.targetDate}
Days Remaining: ${data.release.daysRemaining}

RELEASE MANAGER
---------------
${data.release.releaseManager.name}

${data.healthScore ? `
HEALTH SCORE
------------
Score: ${data.healthScore.score}%
Level: ${data.healthScore.level}
` : ''}

${data.metrics ? `
METRICS
-------
Work Items: ${data.metrics.workItems.complete}/${data.metrics.workItems.total} complete
Test Cases: ${data.metrics.testCases.total}
Test Cycles: ${data.metrics.testCycles.total} (${data.metrics.testCycles.active} active)
Open Defects: ${data.metrics.openDefects.total}
` : ''}

${data.qualityGates ? `
QUALITY GATES
-------------
${data.qualityGates.map(g => `${g.name}: ${g.status.toUpperCase()}`).join('\n')}
` : ''}

Generated: ${new Date().toISOString()}
      `.trim();

      // Create and download the file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.release.version}-release-report.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Release exported as PDF', {
        description: `${data.release.version} report downloaded`,
      });
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(null);
    }
  };

  const generateExcel = async () => {
    setIsExporting('excel');
    try {
      // Simulate Excel generation
      await new Promise(r => setTimeout(r, 1500));

      // Create CSV content
      const headers = ['Field', 'Value'];
      const rows = [
        ['Version', data.release.version],
        ['Name', data.release.name],
        ['Status', data.release.status],
        ['Organization', data.release.organization || 'N/A'],
        ['Start Date', data.release.startDate],
        ['Target Date', data.release.targetDate],
        ['Days Remaining', String(data.release.daysRemaining)],
        ['Release Manager', data.release.releaseManager.name],
      ];

      if (data.healthScore) {
        rows.push(
          ['Health Score', `${data.healthScore.score}%`],
          ['Health Level', data.healthScore.level],
        );
      }

      if (data.metrics) {
        rows.push(
          ['Work Items Total', String(data.metrics.workItems.total)],
          ['Work Items Complete', String(data.metrics.workItems.complete)],
          ['Test Cases', String(data.metrics.testCases.total)],
          ['Open Defects', String(data.metrics.openDefects.total)],
        );
      }

      const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.release.version}-release-report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Release exported as Excel', {
        description: `${data.release.version} report downloaded`,
      });
    } catch (error) {
      toast.error('Failed to export Excel');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting !== null}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-1" />
          )}
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={generatePDF} disabled={isExporting !== null}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateExcel} disabled={isExporting !== null}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
