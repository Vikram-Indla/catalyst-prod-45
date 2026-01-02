/**
 * Parity Verification Utilities
 * Tools to validate test implementation against registered parity requirements
 */

import { ParityTestRegistry, ParityCategory, ParityTest, generateCoverageReport, validateTestCoverage } from './parity-registry';

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRegistered: number;
    totalImplemented: number;
    coveragePercentage: number;
    missingTests: string[];
    orphanedTests: string[];
  };
}

/**
 * Test IDs that should exist in spec files (derived from describe blocks)
 */
const EXPECTED_TEST_IDS: Record<ParityCategory, string[]> = {
  'api-contract': [
    'PARITY-API-001',
    'PARITY-API-002', 
    'PARITY-API-003',
    'PARITY-API-004',
    'PARITY-API-005',
    'PARITY-API-006',
    'PARITY-API-007',
    'PARITY-API-008',
  ],
  'workflow-fsm': [
    'PARITY-WF-001',
    'PARITY-WF-002',
    'PARITY-WF-003',
    'PARITY-WF-004',
    'PARITY-WF-005',
    'PARITY-WF-006',
  ],
  'permission-security': [
    'PARITY-SEC-001',
    'PARITY-SEC-002',
    'PARITY-SEC-003',
    'PARITY-SEC-004',
    'PARITY-SEC-005',
    'PARITY-SEC-006',
    'PARITY-SEC-007',
    'PARITY-SEC-008',
  ],
  'import-diff': [
    'PARITY-IMP-001',
    'PARITY-IMP-002',
    'PARITY-IMP-003',
    'PARITY-IMP-004',
    'PARITY-IMP-005',
    'PARITY-IMP-006',
    'PARITY-IMP-007',
  ],
  'ui-regression': [
    'PARITY-UI-001',
    'PARITY-UI-002',
    'PARITY-UI-003',
    'PARITY-UI-004',
    'PARITY-UI-005',
    'PARITY-UI-006',
    'PARITY-UI-007',
  ],
};

/**
 * Verify that all registered parity tests have corresponding spec implementations
 */
export function verifyParityImplementation(): VerificationResult {
  const registry = ParityTestRegistry.getInstance();
  const registeredTests = registry.getAllTests();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Get all expected test IDs from spec files
  const allExpectedIds = Object.values(EXPECTED_TEST_IDS).flat();
  const registeredIds = registeredTests.map(t => t.testId);
  
  // Find tests that are in specs but not registered
  const orphanedTests = allExpectedIds.filter(id => !registeredIds.includes(id));
  
  // Find tests that are registered but not in specs
  const missingTests = registeredIds.filter(id => !allExpectedIds.includes(id));
  
  if (orphanedTests.length > 0) {
    warnings.push(`Tests in spec files but not registered: ${orphanedTests.join(', ')}`);
  }
  
  if (missingTests.length > 0) {
    errors.push(`Registered tests without spec implementation: ${missingTests.join(', ')}`);
  }
  
  // Validate coverage
  const coverage = generateCoverageReport();
  const validation = validateTestCoverage();
  
  if (!validation.isValid) {
    errors.push(...validation.missingTests.map(t => `Missing implementation: ${t}`));
  }
  
  // Check for implemented tests that are marked as not implemented
  registeredTests.forEach(test => {
    if (allExpectedIds.includes(test.testId) && !test.implemented) {
      warnings.push(`${test.testId} exists in spec but marked as not implemented in registry`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRegistered: registeredTests.length,
      totalImplemented: registeredTests.filter(t => t.implemented).length,
      coveragePercentage: coverage.overallCoverage,
      missingTests,
      orphanedTests,
    },
  };
}

/**
 * Sync registry with spec files - updates implemented flag based on spec presence
 */
export function syncRegistryWithSpecs(): void {
  const registry = ParityTestRegistry.getInstance();
  const allExpectedIds = new Set(Object.values(EXPECTED_TEST_IDS).flat());
  
  registry.getAllTests().forEach(test => {
    if (allExpectedIds.has(test.testId)) {
      registry.markImplemented(test.testId);
    }
  });
}

/**
 * Print verification report to console
 */
export function printVerificationReport(): void {
  const result = verifyParityImplementation();
  
  console.log('\n🔍 Parity Test Verification Report\n');
  console.log('═'.repeat(60));
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total Registered: ${result.summary.totalRegistered}`);
  console.log(`   Implemented: ${result.summary.totalImplemented}`);
  console.log(`   Coverage: ${result.summary.coveragePercentage.toFixed(1)}%`);
  
  // Status
  console.log(`\n   Status: ${result.isValid ? '✅ VALID' : '❌ ISSUES FOUND'}`);
  
  // Errors
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(e => console.log(`   - ${e}`));
  }
  
  // Warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(w => console.log(`   - ${w}`));
  }
  
  // Category breakdown
  console.log('\n📂 By Category:');
  Object.entries(EXPECTED_TEST_IDS).forEach(([category, ids]) => {
    const registry = ParityTestRegistry.getInstance();
    const implemented = ids.filter(id => 
      registry.getAllTests().some(t => t.testId === id && t.implemented)
    ).length;
    const pct = ((implemented / ids.length) * 100).toFixed(0);
    const status = implemented === ids.length ? '✅' : '⏳';
    console.log(`   ${status} ${category}: ${implemented}/${ids.length} (${pct}%)`);
  });
  
  console.log('\n' + '═'.repeat(60));
}

// CLI execution
if (require.main === module) {
  printVerificationReport();
}
