/**
 * CSV and Markdown parsing utilities
 */

import type { ParsedRow } from './types';

/**
 * Parse CSV string into rows
 */
export function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  // Parse headers (first line)
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row: ParsedRow = {};
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      row[header] = value === '' ? null : value;
    });
    
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse Markdown table into rows
 */
export function parseMarkdown(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  // Find the header line (first line with |)
  const headerLineIndex = lines.findIndex(line => line.includes('|'));
  if (headerLineIndex === -1) {
    return { headers: [], rows: [] };
  }

  // Parse headers
  const headers = parseMarkdownLine(lines[headerLineIndex]);
  
  // Skip separator line (contains ---) and parse data rows
  const rows: ParsedRow[] = [];
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip separator lines
    if (line.match(/^\|?[\s\-:|]+\|?$/)) continue;
    if (!line.includes('|')) continue;
    
    const values = parseMarkdownLine(line);
    const row: ParsedRow = {};
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      row[header] = value === '' ? null : value;
    });
    
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single Markdown table line
 */
function parseMarkdownLine(line: string): string[] {
  return line
    .split('|')
    .map(cell => cell.trim())
    .filter((_, index, arr) => {
      // Remove empty first/last elements from | at start/end
      if (index === 0 && arr[0] === '') return false;
      if (index === arr.length - 1 && arr[arr.length - 1] === '') return false;
      return true;
    });
}

/**
 * Auto-detect input format
 */
export function detectFormat(text: string): 'csv' | 'markdown' | 'unknown' {
  const trimmed = text.trim();
  
  // Check for Markdown table (has | and --- separator)
  if (trimmed.includes('|') && trimmed.match(/\|[\s\-:]+\|/)) {
    return 'markdown';
  }
  
  // Check for CSV (has commas and newlines)
  if (trimmed.includes(',') && trimmed.includes('\n')) {
    return 'csv';
  }
  
  // Default to CSV if has newlines
  if (trimmed.includes('\n')) {
    return 'csv';
  }
  
  return 'unknown';
}

/**
 * Parse text based on format
 */
export function parseInput(text: string, format?: 'csv' | 'markdown'): { headers: string[]; rows: ParsedRow[] } {
  const detectedFormat = format || detectFormat(text);
  
  if (detectedFormat === 'markdown') {
    return parseMarkdown(text);
  }
  
  return parseCSV(text);
}

/**
 * Normalize header names for matching
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\-\s]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .trim();
}

/**
 * Find best matching field for a header
 */
export function findMatchingField<T extends { key: string; label: string; dbColumn: string }>(
  header: string,
  fields: T[]
): T | null {
  const normalized = normalizeHeader(header);
  
  // Exact match on key or dbColumn
  const exactMatch = fields.find(
    f => normalizeHeader(f.key) === normalized || 
         normalizeHeader(f.dbColumn) === normalized ||
         normalizeHeader(f.label) === normalized
  );
  
  if (exactMatch) return exactMatch;
  
  // Partial match
  const partialMatch = fields.find(
    f => normalized.includes(normalizeHeader(f.key)) ||
         normalizeHeader(f.key).includes(normalized) ||
         normalized.includes(normalizeHeader(f.label)) ||
         normalizeHeader(f.label).includes(normalized)
  );
  
  return partialMatch || null;
}
