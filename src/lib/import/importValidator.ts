// Import Validation Engine

import { ImportFieldConfig, ImportModuleConfig } from './importModuleConfig';
import { parse, isValid } from 'date-fns';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  validRows: number;
  invalidRows: number;
  warningRows: number;
}

export interface RowValidationResult {
  rowIndex: number;
  isValid: boolean;
  data: Record<string, unknown>;
  errors: ValidationError[];
  isHeaderRow?: boolean; // Flag to identify header rows
}

// CRITICAL: Only mapped fields should be imported - unmapped fields are completely ignored
const SKIP_MAPPING_VALUE = ''; // Empty string means "Don't map this field"

/**
 * Apply value mapping to transform CSV values to Catalyst values
 * This is CRITICAL for lookup fields like Process Step, Delivery Platform, etc.
 */
function applyValueMapping(
  rawValue: string,
  csvColumn: string,
  valueMappings: Map<string, Map<string, string>> | undefined
): string {
  if (!valueMappings || !rawValue) return rawValue;
  
  const columnMappings = valueMappings.get(csvColumn);
  if (!columnMappings || columnMappings.size === 0) return rawValue;
  
  // Normalize the raw value for matching
  const normalizedRaw = rawValue.trim();
  
  // Check for exact match first
  const exactMatch = columnMappings.get(normalizedRaw);
  if (exactMatch && exactMatch !== '') {
    return exactMatch;
  }
  
  // Check for case-insensitive match
  for (const [csvVal, targetVal] of columnMappings.entries()) {
    if (csvVal.toLowerCase().trim() === normalizedRaw.toLowerCase() && targetVal && targetVal !== '') {
      return targetVal;
    }
  }
  
  return rawValue;
}

/**
 * Check if a row appears to be a header row (all values match column names)
 * This prevents accidentally importing the header row as data
 */
function isLikelyHeaderRow(
  row: Record<string, string>,
  csvHeaders: string[]
): boolean {
  // If more than half of the values match their column names, it's likely a header
  let matchCount = 0;
  let totalValues = 0;
  
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === 'string') {
      totalValues++;
      const normalizedValue = value.trim().toLowerCase();
      const normalizedKey = key.trim().toLowerCase();
      
      // Check if value matches its own column name
      if (normalizedValue === normalizedKey) {
        matchCount++;
      }
      // Check if value matches any header
      if (csvHeaders.some(h => h.trim().toLowerCase() === normalizedValue)) {
        matchCount++;
      }
    }
  }
  
  // If 50%+ of values match header names, it's likely a duplicate header row
  return totalValues > 0 && (matchCount / totalValues) >= 0.5;
}

export function validateRow(
  row: Record<string, string>,
  rowIndex: number,
  fieldMappings: Map<string, string>,
  moduleConfig: ImportModuleConfig,
  dateFormat: string,
  valueMappings?: Map<string, Map<string, string>>,
  csvHeaders?: string[]
): RowValidationResult {
  const errors: ValidationError[] = [];
  const data: Record<string, unknown> = {};
  
  // Check if this is a header row (duplicate header detection)
  if (csvHeaders && isLikelyHeaderRow(row, csvHeaders)) {
    return {
      rowIndex,
      isValid: false,
      data: {},
      errors: [{
        row: rowIndex + 1,
        field: 'Row',
        message: 'This row appears to be a header row and will be skipped',
        severity: 'error',
      }],
      isHeaderRow: true,
    };
  }
  
  // Build a reverse mapping: dbColumn -> csvColumn (ONLY for explicitly mapped fields)
  const activeMappings = new Map<string, string>();
  for (const [csvColumn, dbKey] of fieldMappings.entries()) {
    // Skip unmapped fields (empty string or special marker)
    if (!dbKey || dbKey === SKIP_MAPPING_VALUE || dbKey === 'skip' || dbKey === '__skip__') {
      continue;
    }
    activeMappings.set(dbKey, csvColumn);
  }
  
  // First: Check that all REQUIRED fields are mapped
  for (const field of moduleConfig.fields) {
    if (field.required) {
      const csvColumn = activeMappings.get(field.key);
      const rawValue = csvColumn ? row[csvColumn]?.trim() : undefined;
      
      if (!csvColumn) {
        // Required field is not mapped at all
        errors.push({
          row: rowIndex + 1,
          field: field.label,
          message: `Required field "${field.label}" is not mapped`,
          severity: 'error',
        });
      } else if (!rawValue || rawValue === '') {
        // Required field is mapped but has no value
        errors.push({
          row: rowIndex + 1,
          field: field.label,
          message: `Required field "${field.label}" is empty`,
          severity: 'error',
        });
      }
    }
  }
  
  // Second: Process ONLY fields that are explicitly mapped
  for (const [csvColumn, dbKey] of fieldMappings.entries()) {
    // Skip unmapped fields
    if (!dbKey || dbKey === SKIP_MAPPING_VALUE || dbKey === 'skip' || dbKey === '__skip__') {
      continue;
    }
    
    // Find the field config for this mapping
    const field = moduleConfig.fields.find(f => f.key === dbKey);
    if (!field) {
      // Unknown field key - skip (shouldn't happen with proper UI)
      continue;
    }
    
    const rawValue = row[csvColumn]?.trim();
    
    // If value is empty, skip it entirely (don't write null or default)
    if (!rawValue || rawValue === '') {
      continue;
    }
    
    // CRITICAL: Apply value mapping FIRST for lookup/select fields
    // This transforms CSV values to Catalyst values based on user-configured mappings
    let processedValue = rawValue;
    let wasMapped = false;
    
    if (field.type === 'select' || field.isLookup) {
      const mappedValue = applyValueMapping(rawValue, csvColumn, valueMappings);
      if (mappedValue !== rawValue) {
        processedValue = mappedValue;
        wasMapped = true;
      }
    }
    
    // Type validation and conversion
    let parsedValue: unknown = processedValue;
    let hasError = false;
    
    switch (field.type) {
      case 'number':
        const num = parseFloat(processedValue);
        if (isNaN(num)) {
          errors.push({
            row: rowIndex + 1,
            field: field.label,
            message: `"${rawValue}" is not a valid number`,
            severity: 'error',
          });
          hasError = true;
        } else {
          parsedValue = num;
        }
        break;
        
      case 'date':
        const dateFormats = [dateFormat, 'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'dd-MMM-yyyy'];
        let parsed: Date | null = null;
        
        for (const fmt of dateFormats) {
          try {
            const result = parse(processedValue, fmt, new Date());
            if (isValid(result)) {
              parsed = result;
              break;
            }
          } catch {
            // Try next format
          }
        }
        
        if (!parsed) {
          errors.push({
            row: rowIndex + 1,
            field: field.label,
            message: `"${rawValue}" is not a valid date (expected: ${dateFormat})`,
            severity: 'error',
          });
          hasError = true;
        } else {
          parsedValue = parsed.toISOString().split('T')[0];
        }
        break;
        
      case 'select':
        // CRITICAL: Check if the MAPPED value (processedValue) is valid
        if (field.options) {
          const normalizedOptions = field.options.map(opt => opt.toLowerCase());
          const normalizedValue = processedValue.toLowerCase();
          
          if (!normalizedOptions.includes(normalizedValue)) {
            // Show clear message: if mapped, show both values; otherwise just show raw
            if (wasMapped) {
              errors.push({
                row: rowIndex + 1,
                field: field.label,
                message: `"${rawValue}" was mapped to "${processedValue}", but "${processedValue}" is not a valid option. Valid options: ${field.options.join(', ')}`,
                severity: 'warning',
              });
            } else {
              errors.push({
                row: rowIndex + 1,
                field: field.label,
                message: `"${rawValue}" is not mapped and is not a valid option. Valid options: ${field.options.join(', ')}`,
                severity: 'warning',
              });
            }
          } else {
            // Normalize to the correct case from options
            parsedValue = field.options.find(opt => 
              opt.toLowerCase() === normalizedValue
            ) || processedValue;
          }
        }
        break;
        
      case 'boolean':
        const truthy = ['true', '1', 'yes', 'y'];
        const falsy = ['false', '0', 'no', 'n'];
        if (truthy.includes(processedValue.toLowerCase())) {
          parsedValue = true;
        } else if (falsy.includes(processedValue.toLowerCase())) {
          parsedValue = false;
        } else {
          errors.push({
            row: rowIndex + 1,
            field: field.label,
            message: `"${rawValue}" is not a valid boolean (yes/no, true/false)`,
            severity: 'error',
          });
          hasError = true;
        }
        break;
    }
    
    // Only write to data if no error occurred
    // CRITICAL: Use the MAPPED/PROCESSED value, not the raw value
    if (!hasError) {
      data[field.dbColumn] = parsedValue;
    }
  }
  
  return {
    rowIndex,
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    data,
    errors,
    isHeaderRow: false,
  };
}

export function validateAllRows(
  rows: Record<string, string>[],
  fieldMappings: Map<string, string>,
  moduleConfig: ImportModuleConfig,
  dateFormat: string,
  valueMappings?: Map<string, Map<string, string>>,
  csvHeaders?: string[]
): { results: RowValidationResult[]; summary: ValidationResult } {
  const results: RowValidationResult[] = [];
  let validRows = 0;
  let invalidRows = 0;
  let warningRows = 0;
  const allErrors: ValidationError[] = [];
  
  // Get headers from the first row's keys if not provided
  const headers = csvHeaders || (rows.length > 0 ? Object.keys(rows[0]) : []);
  
  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i], i, fieldMappings, moduleConfig, dateFormat, valueMappings, headers);
    
    // Skip header rows from results count
    if (result.isHeaderRow) {
      results.push(result);
      invalidRows++;
      allErrors.push(...result.errors);
      continue;
    }
    
    results.push(result);
    
    if (result.isValid) {
      if (result.errors.length > 0) {
        warningRows++;
      } else {
        validRows++;
      }
    } else {
      invalidRows++;
    }
    
    allErrors.push(...result.errors);
  }
  
  return {
    results,
    summary: {
      isValid: invalidRows === 0,
      errors: allErrors,
      validRows,
      invalidRows,
      warningRows,
    },
  };
}

export function detectDuplicates(
  rows: RowValidationResult[],
  uniqueKeyField: string | undefined
): ValidationError[] {
  if (!uniqueKeyField) return [];
  
  const errors: ValidationError[] = [];
  const seen = new Map<string, number>();
  
  for (const row of rows) {
    // Skip header rows
    if (row.isHeaderRow) continue;
    
    const keyValue = row.data[uniqueKeyField] as string;
    if (!keyValue) continue;
    
    const existing = seen.get(keyValue);
    if (existing !== undefined) {
      errors.push({
        row: row.rowIndex + 1,
        field: uniqueKeyField,
        message: `Duplicate key "${keyValue}" found (first occurrence: row ${existing + 1})`,
        severity: 'warning',
      });
    } else {
      seen.set(keyValue, row.rowIndex);
    }
  }
  
  return errors;
}
