/**
 * Parity Test Runner
 * Orchestrates test execution and generates conformance reports
 */

import { PARITY_TESTS, generateCoverageReport, getUnimplementedTests, type ParityTest } from './parity-registry';

interface TestResult {
  testId: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface ConformanceReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
  byCategory: Record<string, CategoryResult>;
  results: TestResult[];
}

interface CategoryResult {
  total: number;
  passed: number;
  failed: number;
  coverage: number;
}

/**
 * Generate a conformance report from test results
 */
export function generateConformanceReport(results: TestResult[]): ConformanceReport {
  const coverage = generateCoverageReport();
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  const byCategory: Record<string, CategoryResult> = {};
  
  // Group results by category
  results.forEach(result => {
    const test = PARITY_TESTS.find(t => t.id === result.testId);
    if (!test) return;
    
    if (!byCategory[test.category]) {
      byCategory[test.category] = { total: 0, passed: 0, failed: 0, coverage: 0 };
    }
    
    byCategory[test.category].total++;
    if (result.passed) {
      byCategory[test.category].passed++;
    } else {
      byCategory[test.category].failed++;
    }
  });
  
  // Calculate category coverage
  Object.keys(byCategory).forEach(category => {
    const cat = byCategory[category];
    cat.coverage = (cat.passed / cat.total) * 100;
  });

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed,
    skipped: PARITY_TESTS.length - results.length,
    coverage: (passed / PARITY_TESTS.length) * 100,
    byCategory,
    results,
  };
}

/**
 * Print conformance report to console
 */
export function printConformanceReport(report: ConformanceReport): void {
  console.log('\n========================================');
  console.log('  JIRA PARITY CONFORMANCE REPORT');
  console.log('========================================\n');
  
  console.log(`Generated: ${report.timestamp}`);
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`Passed: ${report.passed} ✓`);
  console.log(`Failed: ${report.failed} ✗`);
  console.log(`Skipped: ${report.skipped} ○`);
  console.log(`Coverage: ${report.coverage.toFixed(1)}%`);
  
  console.log('\n--- By Category ---\n');
  
  Object.entries(report.byCategory).forEach(([category, result]) => {
    const status = result.failed === 0 ? '✓' : '✗';
    console.log(`${category}: ${result.passed}/${result.total} (${result.coverage.toFixed(1)}%) ${status}`);
  });
  
  if (report.failed > 0) {
    console.log('\n--- Failed Tests ---\n');
    report.results
      .filter(r => !r.passed)
      .forEach(result => {
        const test = PARITY_TESTS.find(t => t.id === result.testId);
        console.log(`✗ ${result.testId}: ${test?.description || 'Unknown'}`);
        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
      });
  }
  
  console.log('\n========================================\n');
}

/**
 * Validate that all parity claims have test coverage
 */
export function validateTestCoverage(): { valid: boolean; missing: ParityTest[] } {
  const unimplemented = getUnimplementedTests();
  
  return {
    valid: unimplemented.length === 0,
    missing: unimplemented,
  };
}

/**
 * Export report as JSON for CI integration
 */
export function exportReportAsJSON(report: ConformanceReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Check if conformance threshold is met
 */
export function meetsConformanceThreshold(
  report: ConformanceReport,
  threshold: number = 80
): boolean {
  return report.coverage >= threshold;
}

// Export for use in CI
export { PARITY_TESTS, generateCoverageReport };
