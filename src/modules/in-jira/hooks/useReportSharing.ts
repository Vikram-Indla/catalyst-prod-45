/**
 * Report Sharing Hook
 * Manages report sharing via tokens and export
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

export interface SharedReport {
  id: string;
  program_id: string | null;
  report_type: 'daily' | 'weekly';
  share_token: string;
  expires_at: string;
  created_by: string;
  created_at: string;
  view_count: number;
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function useReportSharing(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [exportProgress, setExportProgress] = useState(0);

  // Note: We'll store shares in local storage for now since we don't have a shares table
  // In production, you'd create a proper table for this

  const createShareLink = useMutation({
    mutationFn: async (reportType: 'daily' | 'weekly') => {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

      // In a real implementation, store this in a database table
      const shareData = {
        id: crypto.randomUUID(),
        program_id: programId,
        report_type: reportType,
        share_token: token,
        expires_at: expiresAt.toISOString(),
        created_by: user?.id,
        created_at: new Date().toISOString(),
        view_count: 0,
      };

      // Store in localStorage for demo purposes
      const existingShares = JSON.parse(localStorage.getItem('report_shares') || '[]');
      existingShares.push(shareData);
      localStorage.setItem('report_shares', JSON.stringify(existingShares));

      return {
        token,
        url: `${window.location.origin}/shared/report/${token}`,
        expiresAt: expiresAt.toISOString(),
      };
    },
    onSuccess: (data) => {
      toast.success('Share link created', {
        description: 'Link expires in 7 days',
      });
    },
    onError: (err: Error) => {
      toast.error('Failed to create share link', { description: err.message });
    },
  });

  const exportToPDF = async (
    reportType: 'daily' | 'weekly',
    metrics: Record<string, any>,
    risks: any[],
    actions: any[]
  ) => {
    setExportProgress(10);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(
        reportType === 'daily' ? 'Daily Command Center Report' : 'Weekly Runway Report',
        pageWidth / 2,
        20,
        { align: 'center' }
      );
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${format(new Date(), 'PPP p')}`, pageWidth / 2, 28, { align: 'center' });
      
      setExportProgress(30);
      
      // Metrics Section
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Key Metrics', 14, 45);
      
      doc.setFontSize(10);
      let y = 55;
      
      if (reportType === 'daily' && metrics.dailyMetrics) {
        const dm = metrics.dailyMetrics;
        doc.text(`Tests Executed: ${dm.testsExecuted} (${dm.testsExecuted - dm.testsExecutedYesterday >= 0 ? '+' : ''}${dm.testsExecuted - dm.testsExecutedYesterday} vs yesterday)`, 14, y);
        y += 7;
        doc.text(`Pass Rate: ${dm.passRate}%`, 14, y);
        y += 7;
        doc.text(`New Defects: ${dm.newDefects}`, 14, y);
        y += 7;
        doc.text(`Blocked Tests: ${dm.blockedTests}`, 14, y);
        y += 7;
      } else if (reportType === 'weekly' && metrics.weeklyMetrics) {
        const wm = metrics.weeklyMetrics;
        doc.text(`Total Executed: ${wm.totalExecuted}`, 14, y);
        y += 7;
        doc.text(`Average Pass Rate: ${wm.avgPassRate}%`, 14, y);
        y += 7;
        doc.text(`Coverage: ${wm.coveragePercent}%`, 14, y);
        y += 7;
        doc.text(`Total Defects: ${wm.totalDefects}`, 14, y);
        y += 7;
      }
      
      setExportProgress(50);
      
      // Risks Section
      if (risks.length > 0) {
        y += 10;
        doc.setFontSize(14);
        doc.text('Top Risks', 14, y);
        y += 10;
        
        doc.setFontSize(9);
        risks.slice(0, 5).forEach((risk, i) => {
          doc.setTextColor(
            risk.severity === 'critical' ? 220 : risk.severity === 'high' ? 200 : 100,
            risk.severity === 'critical' ? 50 : risk.severity === 'high' ? 100 : 100,
            50
          );
          doc.text(`${i + 1}. [${risk.severity.toUpperCase()}] ${risk.title}`, 14, y);
          y += 6;
          doc.setTextColor(100, 100, 100);
          doc.text(`   ${risk.description}`, 14, y);
          y += 8;
        });
      }
      
      setExportProgress(70);
      
      // Actions Section
      if (actions.length > 0) {
        y += 5;
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Recommended Actions', 14, y);
        y += 10;
        
        doc.setFontSize(9);
        actions.slice(0, 5).forEach((action, i) => {
          doc.setTextColor(40, 40, 40);
          doc.text(`${i + 1}. ${action.title}`, 14, y);
          y += 6;
          doc.setTextColor(100, 100, 100);
          doc.text(`   ${action.description}`, 14, y);
          y += 8;
        });
      }
      
      setExportProgress(90);
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Confidential - Internal Use Only', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      
      // Save
      const filename = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);
      
      setExportProgress(100);
      toast.success('Report exported successfully');
      
      setTimeout(() => setExportProgress(0), 1000);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
      setExportProgress(0);
    }
  };

  const exportToCSV = (
    reportType: 'daily' | 'weekly',
    data: Record<string, any>
  ) => {
    try {
      let csvContent = '';
      
      if (reportType === 'daily' && data.dailyMetrics) {
        csvContent = 'Metric,Value,Change\n';
        const dm = data.dailyMetrics;
        csvContent += `Tests Executed,${dm.testsExecuted},${dm.testsExecuted - dm.testsExecutedYesterday}\n`;
        csvContent += `Pass Rate,${dm.passRate}%,${dm.passRate - dm.passRateYesterday}%\n`;
        csvContent += `New Defects,${dm.newDefects},${dm.newDefects - dm.newDefectsYesterday}\n`;
        csvContent += `Blocked Tests,${dm.blockedTests},${dm.blockedTests - dm.blockedTestsYesterday}\n`;
        csvContent += `Passed,${dm.passed},-\n`;
        csvContent += `Failed,${dm.failed},-\n`;
        csvContent += `Blocked,${dm.blocked},-\n`;
        csvContent += `Skipped,${dm.skipped},-\n`;
      } else if (reportType === 'weekly' && data.weeklyMetrics) {
        csvContent = 'Metric,This Week,Last Week,Change\n';
        const wm = data.weeklyMetrics;
        csvContent += `Total Executed,${wm.totalExecuted},${wm.totalExecutedLastWeek},${wm.totalExecuted - wm.totalExecutedLastWeek}\n`;
        csvContent += `Pass Rate,${wm.avgPassRate}%,${wm.avgPassRateLastWeek}%,${wm.avgPassRate - wm.avgPassRateLastWeek}%\n`;
        csvContent += `Coverage,${wm.coveragePercent}%,${wm.coveragePercentLastWeek}%,${wm.coveragePercent - wm.coveragePercentLastWeek}%\n`;
        csvContent += `Total Defects,${wm.totalDefects},${wm.totalDefectsLastWeek},${wm.totalDefects - wm.totalDefectsLastWeek}\n`;
        
        if (wm.dailyTrend) {
          csvContent += '\nDaily Trend\nDate,Passed,Failed,Blocked\n';
          wm.dailyTrend.forEach((d: any) => {
            csvContent += `${d.date},${d.passed},${d.failed},${d.blocked}\n`;
          });
        }
      }

      // Add risks if available
      if (data.risks && data.risks.length > 0) {
        csvContent += '\nRisks\nSeverity,Type,Title,Description\n';
        data.risks.forEach((r: any) => {
          csvContent += `${r.severity},${r.type},"${r.title}","${r.description}"\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  return {
    createShareLink: createShareLink.mutateAsync,
    isCreatingShare: createShareLink.isPending,
    exportToPDF,
    exportToCSV,
    exportProgress,
  };
}
