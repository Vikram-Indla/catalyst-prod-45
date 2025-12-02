import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type ExportFormat = 'excel' | 'csv' | 'pdf' | 'feature';

export interface ExportOptions {
  format: ExportFormat;
  scope: {
    type: 'all' | 'folder' | 'selected' | 'filtered';
    ids?: string[];
    folderId?: string;
  };
  include: {
    steps: boolean;
    parameters: boolean;
    attachments: boolean;
    versionHistory: boolean;
    executionHistory: boolean;
  };
  featureFileOptions?: {
    grouping: 'per_case' | 'per_folder' | 'per_component' | 'single';
  };
}

export async function exportTestCases(
  programId: string,
  options: ExportOptions
): Promise<void> {
  try {
    toast({
      title: 'Exporting...',
      description: 'Preparing your export file...',
    });

    const cases = await fetchCasesForExport(programId, options.scope);

    switch (options.format) {
      case 'excel':
        await exportToExcel(cases, options);
        break;
      case 'csv':
        await exportToCSV(cases, options);
        break;
      case 'pdf':
        await exportToPDF(cases, options);
        break;
      case 'feature':
        await exportToFeatureFiles(cases, options);
        break;
    }

    toast({
      title: 'Export Complete',
      description: `Successfully exported ${cases.length} test cases`,
    });
  } catch (error) {
    console.error('Export error:', error);
    toast({
      title: 'Export Failed',
      description: error instanceof Error ? error.message : 'Failed to export test cases',
      variant: 'destructive',
    });
  }
}

async function fetchCasesForExport(
  programId: string,
  scope: ExportOptions['scope']
): Promise<any[]> {
  let query = supabase
    .from('test_cases')
    .select(`
      *,
      test_folders (name),
      test_steps (*)
    `)
    .eq('program_id', programId);

  if (scope.type === 'folder' && scope.folderId) {
    query = query.eq('folder_id', scope.folderId);
  } else if (scope.type === 'selected' && scope.ids) {
    query = query.in('id', scope.ids);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

async function exportToExcel(cases: any[], options: ExportOptions): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Main test cases sheet
  const casesData = cases.map(tc => ({
    Key: tc.key,
    Title: tc.title,
    Objective: tc.objective || '',
    Preconditions: tc.preconditions || '',
    Priority: tc.priority,
    Status: tc.status,
    Type: tc.type,
    'Estimated Effort': tc.estimated_effort || '',
    Component: tc.component || '',
    Release: tc.release || '',
    'Folder Path': tc.test_folders?.name || 'Root',
    Labels: tc.labels?.join(', ') || '',
  }));

  const casesSheet = XLSX.utils.json_to_sheet(casesData);
  
  // Style headers
  const range = XLSX.utils.decode_range(casesSheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!casesSheet[address]) continue;
    casesSheet[address].s = {
      fill: { fgColor: { rgb: 'C69C6D' } },
      font: { bold: true, color: { rgb: 'FEFFFF' } },
    };
  }

  XLSX.utils.book_append_sheet(workbook, casesSheet, 'Test Cases');

  // Steps sheet (if included)
  if (options.include.steps) {
    const stepsData: any[] = [];
    cases.forEach(tc => {
      tc.test_steps?.forEach((step: any, index: number) => {
        stepsData.push({
          'Case Key': tc.key,
          'Step Number': index + 1,
          Description: step.description,
          'Expected Result': step.expected_result || '',
          'Test Data': step.test_data || '',
        });
      });
    });
    const stepsSheet = XLSX.utils.json_to_sheet(stepsData);
    XLSX.utils.book_append_sheet(workbook, stepsSheet, 'Steps');
  }

  const fileName = `TestCases_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

async function exportToCSV(cases: any[], options: ExportOptions): Promise<void> {
  const rows = cases.map(tc => {
    const steps = tc.test_steps?.map((s: any) => s.description).join(' | ') || '';
    return {
      Key: tc.key,
      Title: tc.title,
      Objective: tc.objective || '',
      Priority: tc.priority,
      Status: tc.status,
      Steps: steps,
    };
  });

  const csv = [
    Object.keys(rows[0]).join(','),
    ...rows.map(row => Object.values(row).map(v => `"${v}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TestCases_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportToPDF(cases: any[], options: ExportOptions): Promise<void> {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(26, 26, 26);
  doc.text('Test Cases Report', 20, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
  
  let yPos = 45;
  
  cases.forEach((tc, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Case key and title
    doc.setFontSize(14);
    doc.setTextColor(198, 156, 109);
    doc.text(`${tc.key}: ${tc.title}`, 20, yPos);
    yPos += 8;
    
    // Priority and status
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Priority: ${tc.priority} | Status: ${tc.status}`, 20, yPos);
    yPos += 8;
    
    // Objective
    if (tc.objective) {
      doc.setTextColor(60);
      const lines = doc.splitTextToSize(tc.objective, 170);
      doc.text(lines, 20, yPos);
      yPos += lines.length * 5;
    }
    
    yPos += 10;
  });
  
  doc.save(`TestCases_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function exportToFeatureFiles(cases: any[], options: ExportOptions): Promise<void> {
  const bddCases = cases.filter(c => c.type === 'bdd');
  
  if (bddCases.length === 0) {
    toast({
      title: 'No BDD Cases',
      description: 'No BDD test cases found to export',
      variant: 'destructive',
    });
    return;
  }
  
  // For now, create a single feature file
  let featureContent = '';
  
  bddCases.forEach(tc => {
    featureContent += `Feature: ${tc.title}\n`;
    if (tc.objective) {
      featureContent += `  ${tc.objective}\n\n`;
    }
    
    featureContent += `  Scenario: ${tc.title}\n`;
    
    tc.test_steps?.forEach((step: any) => {
      const keyword = step.type === 'precondition' ? 'Given' :
                     step.type === 'action' ? 'When' : 'Then';
      featureContent += `    ${keyword} ${step.description}\n`;
    });
    
    featureContent += '\n';
  });
  
  const blob = new Blob([featureContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TestCases.feature`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadTemplate(): Promise<void> {
  const workbook = XLSX.utils.book_new();
  
  // Instructions sheet
  const instructions = [
    ['Catalyst Tests Import Template'],
    [''],
    ['Instructions:'],
    ['1. Fill in the Test Cases sheet with your test case data'],
    ['2. Title is required, all other fields are optional'],
    ['3. Use the dropdowns for Status, Priority, and Type'],
    ['4. Save the file and import it in Catalyst Tests'],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  
  // Test Cases sheet with sample data
  const sampleData = [
    {
      Title: 'Example: User login validation',
      Objective: 'Verify user can log in with valid credentials',
      Preconditions: 'User account exists',
      Priority: 'High',
      Status: 'Draft',
      Type: 'Functional',
      'Estimated Effort': '30m',
      Component: 'Authentication',
      Release: 'v1.0',
      Labels: 'smoke, login',
    },
  ];
  const casesSheet = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(workbook, casesSheet, 'Test Cases');
  
  XLSX.writeFile(workbook, 'CatalystTests_ImportTemplate.xlsx');
}
