/**
 * Parity Tests Index
 * Entry point for all Jira parity conformance tests
 * 
 * Usage:
 *   # Run all parity tests
 *   npx playwright test tests/in-jira/parity/
 * 
 *   # Run specific category
 *   npx playwright test --project=parity-api
 *   npx playwright test --project=parity-workflow
 *   npx playwright test --project=parity-security
 *   npx playwright test --project=parity-import
 *   npx playwright test --project=parity-ui
 * 
 *   # Verify parity coverage
 *   npx ts-node tests/run-parity-tests.ts --coverage
 *   npx ts-node tests/in-jira/parity/verify-parity.ts
 */

export * from './parity-registry';
export * from './test-runner';
export * from './verify-parity';
