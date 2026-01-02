#!/usr/bin/env npx ts-node
/**
 * Parity Test Runner
 * Execute and verify all Jira parity conformance tests
 * 
 * Usage:
 *   npx playwright test --project=parity-api
 *   npx playwright test --project=parity-workflow
 *   npx playwright test --project=parity-security
 *   npx playwright test --project=parity-import
 *   npx playwright test --project=parity-ui
 *   
 * Or run all parity tests:
 *   npx playwright test tests/in-jira/parity/
 * 
 * Generate HTML report:
 *   npx playwright show-report
 */

import { ParityTestRegistry, ParityCategory, ParityTest, getUnimplementedTests, generateCoverageReport } from './in-jira/parity';

// Test category to Playwright project mapping
const CATEGORY_PROJECT_MAP: Record<ParityCategory, string> = {
  'api-contract': 'parity-api',
  'workflow-fsm': 'parity-workflow',
  'permission-security': 'parity-security',
  'import-diff': 'parity-import',
  'ui-regression': 'parity-ui',
};

// Spec file mapping
const CATEGORY_SPEC_MAP: Record<ParityCategory, string> = {
  'api-contract': 'tests/in-jira/parity/api-contract.spec.ts',
  'workflow-fsm': 'tests/in-jira/parity/workflow-fsm.spec.ts',
  'permission-security': 'tests/in-jira/parity/permission-leakage.spec.ts',
  'import-diff': 'tests/in-jira/parity/import-diff.spec.ts',
  'ui-regression': 'tests/in-jira/parity/ui-regression.spec.ts',
};

export interface TestRunResult {
  category: ParityCategory;
  project: string;
  specFile: string;
  testCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  duration: number;
  errors: string[];
}

export interface ParityVerificationReport {
  timestamp: string;
  totalTests: number;
  implemented: number;
  passing: number;
  failing: number;
  coveragePercentage: number;
  categories: Record<ParityCategory, CategoryReport>;
  unimplementedTests: ParityTest[];
  conformanceThreshold: number;
  meetsThreshold: boolean;
}

export interface CategoryReport {
  totalTests: number;
  implemented: number;
  passing: number;
  failing: number;
  specFile: string;
  testIds: string[];
}

/**
 * Get all registered parity tests grouped by category
 */
export function getTestsByCategory(): Record<ParityCategory, ParityTest[]> {
  const registry = ParityTestRegistry.getInstance();
  const tests = registry.getAllTests();
  
  const byCategory: Record<ParityCategory, ParityTest[]> = {
    'api-contract': [],
    'workflow-fsm': [],
    'permission-security': [],
    'import-diff': [],
    'ui-regression': [],
  };
  
  tests.forEach(test => {
    byCategory[test.category].push(test);
  });
  
  return byCategory;
}

/**
 * Generate verification report for parity tests
 */
export function generateVerificationReport(
  testResults?: Map<string, { passed: boolean; error?: string }>
): ParityVerificationReport {
  const registry = ParityTestRegistry.getInstance();
  const coverageReport = generateCoverageReport();
  const unimplemented = getUnimplementedTests();
  
  const categories: Record<ParityCategory, CategoryReport> = {} as any;
  const testsByCategory = getTestsByCategory();
  
  Object.entries(testsByCategory).forEach(([cat, tests]) => {
    const category = cat as ParityCategory;
    const implemented = tests.filter(t => t.implemented);
    
    let passing = 0;
    let failing = 0;
    
    if (testResults) {
      implemented.forEach(test => {
        const result = testResults.get(test.testId);
        if (result?.passed) {
          passing++;
        } else {
          failing++;
        }
      });
    }
    
    categories[category] = {
      totalTests: tests.length,
      implemented: implemented.length,
      passing,
      failing: testResults ? failing : 0,
      specFile: CATEGORY_SPEC_MAP[category],
      testIds: tests.map(t => t.testId),
    };
  });
  
  const totalTests = coverageReport.categories.reduce((sum, c) => sum + c.total, 0);
  const implemented = coverageReport.categories.reduce((sum, c) => sum + c.implemented, 0);
  
  return {
    timestamp: new Date().toISOString(),
    totalTests,
    implemented,
    passing: testResults ? [...testResults.values()].filter(r => r.passed).length : 0,
    failing: testResults ? [...testResults.values()].filter(r => !r.passed).length : 0,
    coveragePercentage: coverageReport.overallCoverage,
    categories,
    unimplementedTests: unimplemented,
    conformanceThreshold: 80,
    meetsThreshold: coverageReport.overallCoverage >= 80,
  };
}

/**
 * Print Playwright commands to run parity tests
 */
export function printRunCommands(): void {
  console.log('\n🧪 Parity Test Runner Commands\n');
  console.log('━'.repeat(50));
  
  console.log('\n📋 Run All Parity Tests:');
  console.log('  npx playwright test tests/in-jira/parity/\n');
  
  console.log('📂 Run by Category:');
  Object.entries(CATEGORY_PROJECT_MAP).forEach(([category, project]) => {
    const specFile = CATEGORY_SPEC_MAP[category as ParityCategory];
    console.log(`  ${category}:`);
    console.log(`    npx playwright test --project=${project}`);
    console.log(`    npx playwright test ${specFile}\n`);
  });
  
  console.log('📊 View Reports:');
  console.log('  npx playwright show-report');
  console.log('  cat test-results/parity-report.json\n');
  
  console.log('🔧 Debug Mode:');
  console.log('  npx playwright test --debug tests/in-jira/parity/\n');
  
  console.log('━'.repeat(50));
}

/**
 * Print coverage summary
 */
export function printCoverageSummary(): void {
  const report = generateVerificationReport();
  
  console.log('\n📊 Parity Test Coverage Summary\n');
  console.log('━'.repeat(60));
  
  console.log(`\n📈 Overall: ${report.implemented}/${report.totalTests} tests (${report.coveragePercentage.toFixed(1)}%)`);
  console.log(`   Threshold: ${report.conformanceThreshold}% ${report.meetsThreshold ? '✅' : '❌'}\n`);
  
  console.log('📂 By Category:');
  Object.entries(report.categories).forEach(([category, data]) => {
    const pct = data.totalTests > 0 
      ? ((data.implemented / data.totalTests) * 100).toFixed(0) 
      : '0';
    const status = data.implemented === data.totalTests ? '✅' : '⚠️';
    console.log(`   ${status} ${category}: ${data.implemented}/${data.totalTests} (${pct}%)`);
  });
  
  if (report.unimplementedTests.length > 0) {
    console.log(`\n⏳ Unimplemented Tests (${report.unimplementedTests.length}):`);
    report.unimplementedTests.forEach(test => {
      console.log(`   - ${test.testId}: ${test.name}`);
    });
  }
  
  console.log('\n' + '━'.repeat(60));
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Parity Test Runner - Verify Jira Parity Conformance

Usage:
  npx ts-node tests/run-parity-tests.ts [options]

Options:
  --coverage    Show test coverage summary
  --commands    Show Playwright commands to run tests
  --report      Generate full verification report
  --help, -h    Show this help message

Examples:
  npx ts-node tests/run-parity-tests.ts --coverage
  npx ts-node tests/run-parity-tests.ts --commands
    `);
    process.exit(0);
  }
  
  if (args.includes('--coverage')) {
    printCoverageSummary();
    process.exit(0);
  }
  
  if (args.includes('--commands')) {
    printRunCommands();
    process.exit(0);
  }
  
  if (args.includes('--report')) {
    const report = generateVerificationReport();
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }
  
  // Default: show both coverage and commands
  printCoverageSummary();
  printRunCommands();
}
