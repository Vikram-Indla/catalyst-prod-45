import * as XLSX from 'xlsx';

interface TestCase {
  id: string;
  title: string;
  status: string;
  priority: string;
  test_type: string;
  created_at: string;
}

interface TestExecution {
  id: string;
  test_case_id: string;
  status: string;
  execution_date: string;
  execution_time_seconds: number | null;
}

interface ReportData {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  notRunTests: number;
  passRate: number;
}

export const generateReportExcel = (
  reportData: ReportData,
  testCases: TestCase[],
  executions: TestExecution[]
) => {
  // Summary sheet
  const summaryData = [
    ['Test Report Summary'],
    ['Generated', new Date().toLocaleDateString()],
    [],
    ['Metric', 'Value'],
    ['Total Tests', reportData.totalTests],
    ['Passed Tests', reportData.passedTests],
    ['Failed Tests', reportData.failedTests],
    ['Not Run Tests', reportData.notRunTests],
    ['Pass Rate', `${reportData.passRate}%`],
  ];

  // Test cases sheet
  const testCasesData = [
    ['ID', 'Title', 'Status', 'Priority', 'Type', 'Created Date'],
    ...testCases.map(tc => [
      tc.id.substring(0, 8),
      tc.title,
      tc.status,
      tc.priority,
      tc.test_type,
      new Date(tc.created_at).toLocaleDateString(),
    ]),
  ];

  // Executions sheet
  const executionsData = [
    ['Execution ID', 'Test Case ID', 'Status', 'Date', 'Duration (seconds)'],
    ...executions.map(ex => [
      ex.id.substring(0, 8),
      ex.test_case_id.substring(0, 8),
      ex.status,
      new Date(ex.execution_date).toLocaleDateString(),
      ex.execution_time_seconds || 'N/A',
    ]),
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  const wsTestCases = XLSX.utils.aoa_to_sheet(testCasesData);
  const wsExecutions = XLSX.utils.aoa_to_sheet(executionsData);

  // Style summary sheet (set column widths)
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 20 }];
  wsTestCases['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  wsExecutions['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsTestCases, 'Test Cases');
  XLSX.utils.book_append_sheet(wb, wsExecutions, 'Executions');

  return wb;
};

export const downloadExcel = (wb: XLSX.WorkBook, filename: string) => {
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
