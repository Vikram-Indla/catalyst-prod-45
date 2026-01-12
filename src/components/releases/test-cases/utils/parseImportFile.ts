/**
 * Parse imported files (CSV, JSON, XLSX) into test case data
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedTestCase {
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  status?: string;
  folder?: string;
  tags?: string[];
  preconditions?: string;
  steps?: string;
}

export interface ParseResult {
  success: boolean;
  data: ParsedTestCase[];
  headers: string[];
  error?: string;
  rowCount: number;
}

/**
 * Parse a CSV file into test case data
 */
export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const data = results.data as Record<string, string>[];
        
        const testCases: ParsedTestCase[] = data.map(row => ({
          title: row['Title'] || row['title'] || row['Name'] || row['name'] || row['Test Case Name'] || '',
          description: row['Description'] || row['description'] || '',
          type: row['Type'] || row['type'] || row['Category'] || row['category'] || '',
          priority: row['Priority'] || row['priority'] || row['Priority Level'] || '',
          status: row['Status'] || row['status'] || row['Current Status'] || '',
          folder: row['Folder'] || row['folder'] || row['Folder Path'] || '',
          tags: (row['Tags'] || row['tags'] || row['Labels'] || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
          preconditions: row['Preconditions'] || row['preconditions'] || row['Prerequisites'] || '',
          steps: row['Steps'] || row['steps'] || row['Test Steps'] || row['Steps to Reproduce'] || '',
        })).filter(tc => tc.title); // Filter out rows without title

        resolve({
          success: true,
          data: testCases,
          headers,
          rowCount: testCases.length,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          headers: [],
          error: error.message,
          rowCount: 0,
        });
      },
    });
  });
}

/**
 * Parse a JSON file into test case data
 */
export async function parseJSON(file: File): Promise<ParseResult> {
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    
    // Handle both array and object with test_cases key
    const items = Array.isArray(json) ? json : (json.test_cases || json.testCases || json.data || []);
    
    if (!Array.isArray(items)) {
      return {
        success: false,
        data: [],
        headers: [],
        error: 'Invalid JSON format. Expected an array of test cases.',
        rowCount: 0,
      };
    }

    const headers = items.length > 0 ? Object.keys(items[0]) : [];
    
    const testCases: ParsedTestCase[] = items.map((item: Record<string, unknown>) => ({
      title: String(item.title || item.name || item.Title || item.Name || ''),
      description: String(item.description || item.Description || ''),
      type: String(item.type || item.Type || item.category || ''),
      priority: String(item.priority || item.Priority || ''),
      status: String(item.status || item.Status || ''),
      folder: String(item.folder || item.Folder || ''),
      tags: Array.isArray(item.tags) 
        ? item.tags 
        : typeof item.tags === 'string' 
          ? item.tags.split(',').map((t: string) => t.trim())
          : [],
      preconditions: String(item.preconditions || item.Preconditions || item.prerequisites || ''),
      steps: typeof item.steps === 'string' 
        ? item.steps 
        : Array.isArray(item.steps) 
          ? item.steps.map((s: { description?: string; action?: string }, i: number) => 
              `${i + 1}. ${s.description || s.action || s}`
            ).join('\n')
          : '',
    })).filter(tc => tc.title);

    return {
      success: true,
      data: testCases,
      headers,
      rowCount: testCases.length,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      headers: [],
      error: error instanceof Error ? error.message : 'Failed to parse JSON',
      rowCount: 0,
    };
  }
}

/**
 * Parse an XLSX file into test case data
 */
export async function parseXLSX(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    
    const testCases: ParsedTestCase[] = data.map(row => ({
      title: row['Title'] || row['title'] || row['Name'] || row['name'] || row['Test Case Name'] || '',
      description: row['Description'] || row['description'] || '',
      type: row['Type'] || row['type'] || row['Category'] || row['category'] || '',
      priority: row['Priority'] || row['priority'] || row['Priority Level'] || '',
      status: row['Status'] || row['status'] || row['Current Status'] || '',
      folder: row['Folder'] || row['folder'] || row['Folder Path'] || '',
      tags: (row['Tags'] || row['tags'] || row['Labels'] || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
      preconditions: row['Preconditions'] || row['preconditions'] || row['Prerequisites'] || '',
      steps: row['Steps'] || row['steps'] || row['Test Steps'] || row['Steps to Reproduce'] || '',
    })).filter(tc => tc.title);

    return {
      success: true,
      data: testCases,
      headers,
      rowCount: testCases.length,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      headers: [],
      error: error instanceof Error ? error.message : 'Failed to parse Excel file',
      rowCount: 0,
    };
  }
}

/**
 * Parse any supported file type
 */
export async function parseImportFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'csv':
      return parseCSV(file);
    case 'json':
      return parseJSON(file);
    case 'xlsx':
    case 'xls':
      return parseXLSX(file);
    default:
      return {
        success: false,
        data: [],
        headers: [],
        error: `Unsupported file format: ${ext}`,
        rowCount: 0,
      };
  }
}

/**
 * Generate a CSV template for import
 */
export function generateImportTemplate(): string {
  const headers = ['Title', 'Description', 'Type', 'Priority', 'Status', 'Folder', 'Tags', 'Preconditions', 'Steps'];
  const exampleRow = [
    'Verify user login',
    'Test that users can log in with valid credentials',
    'functional',
    'high',
    'ready',
    'Authentication',
    'login,auth',
    'User account must exist',
    '1. Navigate to login page\n2. Enter valid credentials\n3. Click Login button',
  ];
  
  return [headers.join(','), exampleRow.map(v => `"${v.replace(/"/g, '""')}"`).join(',')].join('\n');
}

/**
 * Download the import template as a CSV file
 */
export function downloadImportTemplate(): void {
  const csv = generateImportTemplate();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'test-cases-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
