/**
 * Module 5C-4: Scheduled Reports & Export Hooks
 * Manages scheduled report configuration and export jobs
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import type {
  ScheduledReport,
  ExportJob,
  ScheduleFrequency,
} from '../types/analytics';

// In-memory storage (would be persisted to Supabase in production)
const scheduledReportsStore = new Map<string, ScheduledReport>();
const exportJobsStore = new Map<string, ExportJob>();

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useScheduledReports - List scheduled reports
// ─────────────────────────────────────────────────────────────────────────────

export function useScheduledReports(releaseId?: string) {
  return useQuery({
    queryKey: ['scheduled-reports', releaseId],
    queryFn: async (): Promise<ScheduledReport[]> => {
      const reports = Array.from(scheduledReportsStore.values());
      
      if (releaseId) {
        return reports.filter(r => r.releaseId === releaseId || !r.releaseId);
      }
      
      return reports;
    },
    staleTime: 30000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useCreateScheduledReport
// ─────────────────────────────────────────────────────────────────────────────

interface CreateScheduledReportInput {
  name: string;
  description?: string;
  releaseId?: string;
  dashboardId?: string;
  reportType: ScheduledReport['reportType'];
  format: ScheduledReport['format'];
  schedule: ScheduledReport['schedule'];
  recipients: string[];
}

export function useCreateScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScheduledReportInput): Promise<ScheduledReport> => {
      const report: ScheduledReport = {
        id: uuidv4(),
        name: input.name,
        description: input.description,
        releaseId: input.releaseId,
        dashboardId: input.dashboardId,
        reportType: input.reportType,
        format: input.format,
        schedule: input.schedule,
        recipients: input.recipients,
        isActive: true,
        createdBy: 'current-user',
        createdAt: new Date().toISOString(),
        nextScheduledAt: calculateNextSchedule(input.schedule),
      };

      scheduledReportsStore.set(report.id, report);
      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useUpdateScheduledReport
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<ScheduledReport> & { id: string }): Promise<ScheduledReport> => {
      const existing = scheduledReportsStore.get(input.id);
      if (!existing) {
        throw new Error('Scheduled report not found');
      }

      const updated: ScheduledReport = {
        ...existing,
        ...input,
        nextScheduledAt: input.schedule 
          ? calculateNextSchedule(input.schedule) 
          : existing.nextScheduledAt,
      };

      scheduledReportsStore.set(updated.id, updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useDeleteScheduledReport
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string): Promise<void> => {
      scheduledReportsStore.delete(reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useToggleScheduledReport
// ─────────────────────────────────────────────────────────────────────────────

export function useToggleScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string): Promise<ScheduledReport> => {
      const report = scheduledReportsStore.get(reportId);
      if (!report) {
        throw new Error('Scheduled report not found');
      }

      report.isActive = !report.isActive;
      if (report.isActive) {
        report.nextScheduledAt = calculateNextSchedule(report.schedule);
      }

      scheduledReportsStore.set(report.id, report);
      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useExportJobs - Track export jobs
// ─────────────────────────────────────────────────────────────────────────────

export function useExportJobs() {
  return useQuery({
    queryKey: ['export-jobs'],
    queryFn: async (): Promise<ExportJob[]> => {
      return Array.from(exportJobsStore.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20); // Keep last 20
    },
    staleTime: 10000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useCreateExportJob
// ─────────────────────────────────────────────────────────────────────────────

interface CreateExportInput {
  format: ExportJob['format'];
  releaseId?: string;
  dashboardId?: string;
  reportType?: string;
}

export function useCreateExportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExportInput): Promise<ExportJob> => {
      const job: ExportJob = {
        id: uuidv4(),
        type: 'immediate',
        status: 'pending',
        format: input.format,
        createdAt: new Date().toISOString(),
      };

      exportJobsStore.set(job.id, job);

      // Simulate async export processing
      setTimeout(() => {
        const updatedJob = exportJobsStore.get(job.id);
        if (updatedJob) {
          updatedJob.status = 'processing';
          exportJobsStore.set(job.id, updatedJob);
          queryClient.invalidateQueries({ queryKey: ['export-jobs'] });

          // Simulate completion
          setTimeout(() => {
            const finalJob = exportJobsStore.get(job.id);
            if (finalJob) {
              finalJob.status = 'completed';
              finalJob.completedAt = new Date().toISOString();
              finalJob.downloadUrl = `#export-${job.id}`;
              finalJob.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
              exportJobsStore.set(job.id, finalJob);
              queryClient.invalidateQueries({ queryKey: ['export-jobs'] });
            }
          }, 2000);
        }
      }, 500);

      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-jobs'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Calculate next scheduled time
// ─────────────────────────────────────────────────────────────────────────────

function calculateNextSchedule(schedule: ScheduledReport['schedule']): string {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);
  
  let next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  switch (schedule.frequency) {
    case 'daily':
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;
      
    case 'weekly':
      const targetDay = schedule.dayOfWeek ?? 1; // Monday default
      const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
      next.setDate(now.getDate() + daysUntilTarget);
      if (next <= now && daysUntilTarget === 0) {
        next.setDate(next.getDate() + 7);
      }
      break;
      
    case 'biweekly':
      const biweeklyTarget = schedule.dayOfWeek ?? 1;
      const biweeklyDays = (biweeklyTarget - now.getDay() + 7) % 7 || 14;
      next.setDate(now.getDate() + biweeklyDays);
      break;
      
    case 'monthly':
      const targetDate = schedule.dayOfMonth ?? 1;
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
      
    case 'on_release':
      // Triggered by release status change, no fixed schedule
      return 'On release status change';
  }

  return next.toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useExportToFormat - Immediate export utilities
// ─────────────────────────────────────────────────────────────────────────────

export function useExportToFormat() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = useCallback((data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = row[h];
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val}"`;
          }
          return val;
        }).join(',')
      ),
    ].join('\n');

    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  }, []);

  const exportToJSON = useCallback((data: unknown, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `${filename}.json`, 'application/json');
  }, []);

  const exportToHTML = useCallback((html: string, filename: string) => {
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${filename}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 1200px; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 0.5rem; border: 1px solid #e5e7eb; text-align: left; }
            th { background: #f9fafb; font-weight: 600; }
            .metric { font-size: 2rem; font-weight: 700; }
            .label { color: #6b7280; font-size: 0.875rem; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;
    downloadFile(fullHtml, `${filename}.html`, 'text/html');
  }, []);

  return {
    isExporting,
    exportToCSV,
    exportToJSON,
    exportToHTML,
  };
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
