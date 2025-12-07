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
}

// CRITICAL: Only mapped fields should be imported - unmapped fields are completely ignored
const SKIP_MAPPING_VALUE = ''; // Empty string means "Don't map this field"

export function validateRow(
  row: Record<string, string>,
  rowIndex: number,
  fieldMappings: Map<string, string>,
  moduleConfig: ImportModuleConfig,
  dateFormat: string
): RowValidationResult {
  const errors: ValidationError[] = [];
  const data: Record<string, unknown> = {};
  
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
    
    // Type validation and conversion
    let parsedValue: unknown = rawValue;
    let hasError = false;
    
    switch (field.type) {
      case 'number':
        const num = parseFloat(rawValue);
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
            const result = parse(rawValue, fmt, new Date());
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
        if (field.options && !field.options.some(opt => 
          opt.toLowerCase() === rawValue.toLowerCase()
        )) {
          errors.push({
            row: rowIndex + 1,
            field: field.label,
            message: `"${rawValue}" is not a valid option. Expected: ${field.options.join(', ')}`,
            severity: 'warning',
          });
        } else {
          // Normalize to the correct case from options
          parsedValue = field.options?.find(opt => 
            opt.toLowerCase() === rawValue.toLowerCase()
          ) || rawValue;
        }
        break;
        
      case 'boolean':
        const truthy = ['true', '1', 'yes', 'y'];
        const falsy = ['false', '0', 'no', 'n'];
        if (truthy.includes(rawValue.toLowerCase())) {
          parsedValue = true;
        } else if (falsy.includes(rawValue.toLowerCase())) {
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
    if (!hasError) {
      data[field.dbColumn] = parsedValue;
    }
  }
  
  return {
    rowIndex,
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    data,
    errors,
  };
}

export function validateAllRows(
  rows: Record<string, string>[],
  fieldMappings: Map<string, string>,
  moduleConfig: ImportModuleConfig,
  dateFormat: string
): { results: RowValidationResult[]; summary: ValidationResult } {
  const results: RowValidationResult[] = [];
  let validRows = 0;
  let invalidRows = 0;
  let warningRows = 0;
  const allErrors: ValidationError[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i], i, fieldMappings, moduleConfig, dateFormat);
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
