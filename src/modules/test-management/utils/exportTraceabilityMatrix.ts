/**
 * Export Traceability Matrix to Excel
 */

import * as XLSX from 'xlsx';

interface Requirement {
  id: string;
  requirement_key: string;
  title: string;
  priority?: string;
  status?: string;
}

interface TestCase {
  id: string;
  case_key: string;
  title: string;
}

interface RequirementLink {
  requirement_id: string;
  test_case_id: string;
}

export const exportTraceabilityMatrix = (
  requirements: Requirement[],
  testCases: TestCase[],
  links: RequirementLink[],
  projectName?: string
) => {
  if (!requirements.length) {
    throw new Error('No requirements to export');
  }

  // Build matrix data
  const matrixData = requirements.map(req => {
    const linkedCaseIds = links
      .filter(l => l.requirement_id === req.id)
      .map(l => l.test_case_id);
    
    const linkedCases = testCases
      .filter(tc => linkedCaseIds.includes(tc.id))
      .map(tc => tc.case_key)
      .join(', ');

    return {
      'Requirement Key': req.requirement_key,
      'Requirement Title': req.title,
      'Priority': req.priority || 'N/A',
      'Status': req.status || 'N/A',
      'Linked Test Cases': linkedCases || 'None',
      'Coverage': linkedCases ? 'Covered' : 'Not Covered',
      'Test Case Count': linkedCaseIds.length,
    };
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Traceability Matrix sheet
  const ws = XLSX.utils.json_to_sheet(matrixData);
  ws['!cols'] = [
    { wch: 15 }, // Key
    { wch: 40 }, // Title
    { wch: 10 }, // Priority
    { wch: 12 }, // Status
    { wch: 30 }, // Linked Cases
    { wch: 12 }, // Coverage
    { wch: 12 }, // Count
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Traceability Matrix');

  // Summary sheet
  const covered = matrixData.filter(r => r.Coverage === 'Covered').length;
  const coveragePercent = requirements.length > 0 
    ? Math.round((covered / requirements.length) * 100) 
    : 0;
    
  const summaryData = [
    ['Traceability Summary'],
    [''],
    ['Export Date', new Date().toLocaleDateString()],
    ['Project', projectName || 'N/A'],
    [''],
    ['Total Requirements', requirements.length],
    ['Covered', covered],
    ['Not Covered', requirements.length - covered],
    ['Coverage %', `${coveragePercent}%`],
    [''],
    ['Total Test Cases', testCases.length],
    ['Linked Test Cases', new Set(links.map(l => l.test_case_id)).size],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Save file
  const fileName = `traceability-matrix-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
};
