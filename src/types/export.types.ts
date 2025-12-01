export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  reportType: 'summary' | 'detailed' | 'trends';
  filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    priority?: string;
  };
}

export interface NotificationPreferences {
  notifyOnFailure: boolean;
  notifyOnCycleComplete: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
}
