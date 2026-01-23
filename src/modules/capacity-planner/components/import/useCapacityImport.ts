/**
 * Hook to manage capacity import with realtime sync
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ImportMode, ParsedRow, ImportPreviewRow, ValidationError, ImportField } from './types';
import { RESOURCE_IMPORT_FIELDS, UNIQUE_KEY_FIELD } from './fieldConfig';
import { parseInput, findMatchingField, normalizeHeader } from './parseUtils';

interface LookupData {
  departments: { id: string; name: string }[];
  assignments: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  countries: { id: string; name: string; code?: string }[];
  locations: { id: string; name: string }[];
}

export function useCapacityImport() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lookups, setLookups] = useState<LookupData | null>(null);

  // Load lookup data
  const loadLookups = useCallback(async () => {
    const [depts, assigns, vendors, countries, locations] = await Promise.all([
      supabase.from('capacity_departments').select('id, name').eq('is_active', true),
      supabase.from('resource_assignments').select('id, name').eq('is_active', true),
      supabase.from('resource_vendors').select('id, name'),
      supabase.from('resource_countries').select('id, name, code'),
      supabase.from('resource_locations').select('id, name'),
    ]);

    const data: LookupData = {
      departments: depts.data || [],
      assignments: assigns.data || [],
      vendors: vendors.data || [],
      countries: countries.data || [],
      locations: locations.data || [],
    };
    setLookups(data);
    return data;
  }, []);

  // Parse and validate input
  const parseData = useCallback((text: string, selectedFields: string[]) => {
    const { headers, rows } = parseInput(text);
    
    // Auto-map headers to fields
    const mappings = headers.map(h => ({
      sourceColumn: h,
      targetField: findMatchingField(h, RESOURCE_IMPORT_FIELDS),
    }));

    // Validate rows
    const previewRows: ImportPreviewRow[] = rows.map((row, idx) => {
      const errors: ValidationError[] = [];
      
      // Check required fields
      if (!row[headers.find(h => normalizeHeader(h) === 'name') || 'name']) {
        errors.push({ row: idx, field: 'name', message: 'Name is required' });
      }

      return {
        data: row,
        rowIndex: idx,
        errors,
        status: errors.length > 0 ? 'error' : 'valid',
      };
    });

    return { headers, rows, mappings, previewRows };
  }, []);

  // Resolve lookup value to ID
  const resolveLookup = useCallback((value: string | null, field: ImportField, lookupData: LookupData): string | null => {
    if (!value || !field.lookupTable) return null;
    
    const normalizedValue = value.toLowerCase().trim();
    let items: { id: string; name: string }[] = [];
    
    switch (field.lookupTable) {
      case 'capacity_departments': items = lookupData.departments; break;
      case 'resource_assignments': items = lookupData.assignments; break;
      case 'resource_vendors': items = lookupData.vendors; break;
      case 'resource_countries': items = lookupData.countries; break;
      case 'resource_locations': items = lookupData.locations; break;
    }
    
    const match = items.find(i => i.name.toLowerCase() === normalizedValue);
    return match?.id || null;
  }, []);

  // Execute import
  const executeImport = useCallback(async (
    rows: ParsedRow[],
    headers: string[],
    selectedFields: string[],
    mode: ImportMode
  ) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const lookupData = lookups || await loadLookups();
      
      // Get existing resources for update matching
      const { data: existingResources } = await supabase
        .from('resource_inventory')
        .select('id, name');
      
      const existingMap = new Map(existingResources?.map(r => [r.name.toLowerCase(), r.id]) || []);
      
      // If rewrite mode, delete all first
      if (mode === 'rewrite') {
        const { error: deleteError } = await supabase
          .from('resource_inventory')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (deleteError) throw deleteError;
        existingMap.clear();
      }

      const total = rows.length;
      let processed = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          // Build record from row
          const record: Record<string, unknown> = {};
          
          for (const header of headers) {
            const field = findMatchingField(header, RESOURCE_IMPORT_FIELDS);
            if (!field || !selectedFields.includes(field.key)) continue;
            
            let value = row[header];
            
            // Resolve lookups
            if (field.lookupTable && value) {
              value = resolveLookup(String(value), field, lookupData);
            }
            
            // Type conversions
            if (field.type === 'number' && value) {
              value = parseInt(String(value), 10);
            } else if (field.type === 'boolean') {
              value = String(value).toLowerCase() === 'true' || value === '1';
            }
            
            if (value !== null && value !== undefined) {
              record[field.dbColumn] = value;
            }
          }

          // Check if resource exists
          const nameHeader = headers.find(h => normalizeHeader(h) === 'name') || 'name';
          const name = String(row[nameHeader] || '').trim();
          
          if (!name) continue;
          
          const existingId = existingMap.get(name.toLowerCase());
          
          if (existingId) {
            // Update existing
            const { error } = await supabase
              .from('resource_inventory')
              .update(record)
              .eq('id', existingId);
            
            if (error) throw error;
          } else {
            // Insert new
            record.name = name;
            const { error } = await supabase
              .from('resource_inventory')
              .insert(record);
            
            if (error) throw error;
          }

          processed++;
          setProgress(Math.round((processed / total) * 100));
        } catch (rowError: unknown) {
          errors.push(`Row ${processed + 1}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
        }
      }

      // Invalidate queries for realtime sync
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-inventory'] });

      if (errors.length > 0) {
        toast.warning(`Import completed with ${errors.length} errors`, {
          description: errors.slice(0, 3).join('\n'),
        });
      } else {
        toast.success(`Successfully imported ${processed} resources`);
      }

      return { success: true, processed, errors };
    } catch (error) {
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, processed: 0, errors: [String(error)] };
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [lookups, loadLookups, resolveLookup, queryClient]);

  return {
    parseData,
    executeImport,
    loadLookups,
    lookups,
    isProcessing,
    progress,
  };
}
