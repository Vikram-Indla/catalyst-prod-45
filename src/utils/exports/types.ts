/**
 * Export Utility Types
 * Shared type definitions for export functionality
 */

export interface ExportColumn<T> {
  key: keyof T;
  header: string;
  formatter?: (value: any) => string;
}

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  title?: string;
  includeTimestamp?: boolean;
}

export interface CsvExportOptions {
  filename: string;
  includeTimestamp?: boolean;
}

export interface PdfExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  includeTimestamp?: boolean;
  headerColor?: string;
  brandName?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string | Date;
}

export interface MarkdownExportOptions {
  filename: string;
  title?: string;
  includeTimestamp?: boolean;
}
