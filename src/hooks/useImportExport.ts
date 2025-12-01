import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ImportHistory, ImportResult } from '@/types/importExport.types';
import type { TestCase } from '@/types/test-management';

export const useImportHistory = () => {
  return useQuery({
    queryKey: ['import-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ImportHistory[];
    },
  });
};

export const useImportTestCases = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testCases, fileName, fileType }: { 
      testCases: Partial<TestCase>[]; 
      fileName: string;
      fileType: 'csv' | 'excel';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let importedCount = 0;
      let failedCount = 0;
      const errors: any[] = [];

      // Import test cases
      for (let i = 0; i < testCases.length; i++) {
        try {
          const testCase = testCases[i];
          
          const { error } = await supabase
            .from('test_cases')
            .insert({
              title: testCase.title,
              description: testCase.description,
              test_type: testCase.test_type || 'manual',
              priority: testCase.priority || 'medium',
              status: testCase.status || 'draft',
              folder_id: testCase.folder_id,
              created_by: user.id,
            });

          if (error) {
            failedCount++;
            errors.push({ row: i + 1, message: error.message });
          } else {
            importedCount++;
          }
        } catch (error: any) {
          failedCount++;
          errors.push({ row: i + 1, message: error.message });
        }
      }

      // Log import history
      await supabase.from('import_history').insert({
        file_name: fileName,
        file_type: fileType,
        total_records: testCases.length,
        imported_records: importedCount,
        failed_records: failedCount,
        imported_by: user.id,
      });

      return {
        success: failedCount === 0,
        imported_count: importedCount,
        failed_count: failedCount,
        errors,
      } as ImportResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
    },
  });
};

export const parseImportFile = async (file: File): Promise<{ headers: string[]; rows: string[][] }> => {
  const fileType = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' : 'csv';

  if (fileType === 'excel') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
          
          if (jsonData.length === 0) {
            reject(new Error('Empty file'));
            return;
          }

          const headers = jsonData[0];
          const rows = jsonData.slice(1);
          resolve({ headers, rows });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  } else {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          if (results.data.length === 0) {
            reject(new Error('Empty file'));
            return;
          }
          const headers = results.data[0] as string[];
          const rows = results.data.slice(1) as string[][];
          resolve({ headers, rows });
        },
        error: (error) => reject(error),
      });
    });
  }
};

export const exportTestCasesToCSV = (testCases: TestCase[]): void => {
  const headers = ['Title', 'Description', 'Type', 'Priority', 'Status', 'Created By', 'Created At'];
  const rows = testCases.map(tc => [
    tc.title,
    tc.description || '',
    tc.test_type,
    tc.priority,
    tc.status,
    tc.created_by,
    new Date(tc.created_at).toLocaleDateString(),
  ]);

  const csv = Papa.unparse({ fields: headers, data: rows });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `test-cases-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

export const exportTestCasesToExcel = (testCases: TestCase[]): void => {
  const headers = ['Title', 'Description', 'Type', 'Priority', 'Status', 'Created By', 'Created At'];
  const rows = testCases.map(tc => [
    tc.title,
    tc.description || '',
    tc.test_type,
    tc.priority,
    tc.status,
    tc.created_by,
    new Date(tc.created_at).toLocaleDateString(),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');
  XLSX.writeFile(wb, `test-cases-${new Date().toISOString().split('T')[0]}.xlsx`);
};
