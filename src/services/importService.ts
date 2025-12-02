import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ImportPreview {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

export interface ColumnMapping {
  [fileColumn: string]: string; // file column -> system field
}

export interface ValidationResult {
  validCount: number;
  warningCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export interface ImportOptions {
  mode: 'create' | 'update' | 'hybrid';
  folderId: string | null;
  duplicateHandling: 'skip' | 'overwrite' | 'version';
  onlyUpdateEmpty: boolean;
  createActivityLog: boolean;
}

export interface ImportResult {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  created: string[];
  updated: string[];
  skipped: Array<{ row: number; reason: string }>;
  errors: Array<{ row: number; field: string; message: string }>;
}

export async function parseFile(file: File): Promise<ImportPreview> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  } else {
    throw new Error('Unsupported file format');
  }
}

async function parseCSV(file: File): Promise<ImportPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data.map((row: any) => 
          headers.map(h => row[h])
        );
        
        resolve({
          headers,
          rows: rows.slice(0, 5), // Preview first 5 rows
          totalRows: rows.length,
        });
      },
      error: (error) => reject(error),
    });
  });
}

async function parseExcel(file: File): Promise<ImportPreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        const headers = (jsonData[0] as any[]) || [];
        const rows = jsonData.slice(1, 6) as any[][]; // Preview first 5 rows
        
        resolve({
          headers,
          rows,
          totalRows: jsonData.length - 1,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  
  const fieldMappings: { [key: string]: string[] } = {
    title: ['title', 'name', 'test case', 'test name', 'case name'],
    objective: ['objective', 'description', 'desc', 'summary'],
    preconditions: ['preconditions', 'precondition', 'pre-conditions', 'setup'],
    priority: ['priority', 'pri', 'importance'],
    status: ['status', 'state'],
    type: ['type', 'test type', 'category'],
    estimated_effort: ['effort', 'estimated effort', 'duration', 'time'],
    component: ['component', 'module', 'area'],
    release: ['release', 'version', 'sprint'],
    labels: ['labels', 'tags', 'keywords'],
  };
  
  headers.forEach(header => {
    const normalized = header.toLowerCase().trim();
    
    for (const [field, patterns] of Object.entries(fieldMappings)) {
      if (patterns.some(pattern => normalized.includes(pattern))) {
        mapping[header] = field;
        break;
      }
    }
  });
  
  return mapping;
}

export async function validateImportData(
  file: File,
  mapping: ColumnMapping
): Promise<ValidationResult> {
  const preview = await parseFile(file);
  const errors: ValidationResult['errors'] = [];
  let validCount = 0;
  let warningCount = 0;
  
  // Parse full file for validation
  const extension = file.name.split('.').pop()?.toLowerCase();
  let allRows: any[][] = [];
  
  if (extension === 'csv') {
    const result = await new Promise<any>((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: resolve,
      });
    });
    const headers = result.meta.fields || [];
    allRows = result.data.map((row: any) => headers.map(h => row[h]));
  } else {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    allRows = jsonData.slice(1) as any[][];
  }
  
  allRows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header and 0-indexing
    let hasError = false;
    
    // Check required fields
    const titleIndex = preview.headers.findIndex(h => mapping[h] === 'title');
    if (titleIndex === -1 || !row[titleIndex]) {
      errors.push({
        row: rowNum,
        field: 'Title',
        message: 'Title is required',
      });
      hasError = true;
    }
    
    // Validate priority
    const priorityIndex = preview.headers.findIndex(h => mapping[h] === 'priority');
    if (priorityIndex !== -1 && row[priorityIndex]) {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(row[priorityIndex].toLowerCase())) {
        errors.push({
          row: rowNum,
          field: 'Priority',
          message: `Invalid priority: ${row[priorityIndex]}`,
        });
        hasError = true;
      }
    }
    
    // Validate status
    const statusIndex = preview.headers.findIndex(h => mapping[h] === 'status');
    if (statusIndex !== -1 && row[statusIndex]) {
      const validStatuses = ['draft', 'under review', 'published', 'deprecated'];
      if (!validStatuses.includes(row[statusIndex].toLowerCase())) {
        errors.push({
          row: rowNum,
          field: 'Status',
          message: `Invalid status: ${row[statusIndex]}`,
        });
        hasError = true;
      }
    }
    
    if (hasError) {
      // Count as error
    } else {
      validCount++;
    }
  });
  
  return {
    validCount,
    warningCount,
    errorCount: errors.length,
    errors,
  };
}

export async function executeImport(
  file: File,
  mapping: ColumnMapping,
  options: ImportOptions,
  programId: string,
  onProgress?: (progress: number, counts: Partial<ImportResult>) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    created: [],
    updated: [],
    skipped: [],
    errors: [],
  };
  
  try {
    // Parse file
    const extension = file.name.split('.').pop()?.toLowerCase();
    let allRows: any[][] = [];
    let headers: string[] = [];
    
    if (extension === 'csv') {
      const parseResult = await new Promise<any>((resolve) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: resolve,
        });
      });
      headers = parseResult.meta.fields || [];
      allRows = parseResult.data.map((row: any) => headers.map(h => row[h]));
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      headers = (jsonData[0] as any[]) || [];
      allRows = jsonData.slice(1) as any[][];
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Process rows
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const progress = ((i + 1) / allRows.length) * 100;
      
      try {
        // Map row data to case object
        const caseData: any = {
          program_id: programId,
          created_by: user.id,
        };
        
        headers.forEach((header, index) => {
          const systemField = mapping[header];
          if (systemField && row[index]) {
            caseData[systemField] = row[index];
          }
        });
        
        // Ensure title exists
        if (!caseData.title) {
          result.skipped.push({
            row: i + 2,
            reason: 'Missing title',
          });
          result.skippedCount++;
          continue;
        }
        
        // Set defaults
        if (!caseData.status) caseData.status = 'draft';
        if (!caseData.priority) caseData.priority = 'medium';
        if (!caseData.type) caseData.type = 'functional';
        if (options.folderId) caseData.folder_id = options.folderId;
        
        // Create case
        const { data: newCase, error } = await supabase
          .from('test_cases')
          .insert([caseData])
          .select()
          .single();
        
        if (error) throw error;
        
        result.created.push(newCase.id);
        result.createdCount++;
        
      } catch (error) {
        result.errors.push({
          row: i + 2,
          field: 'general',
          message: error instanceof Error ? error.message : 'Import failed',
        });
        result.errorCount++;
      }
      
      if (onProgress) {
        onProgress(progress, result);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
}

export function downloadErrorReport(errors: ValidationResult['errors']): void {
  const csv = [
    'Row,Field,Error',
    ...errors.map(e => `${e.row},"${e.field}","${e.message}"`),
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Import_Errors_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
