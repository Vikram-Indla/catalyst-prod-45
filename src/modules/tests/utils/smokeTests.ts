/**
 * SMOKE TESTS UTILITY
 * Runtime assertions for Tests module functionality
 */

import { supabase } from '@/integrations/supabase/client';

export interface SmokeTestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface SmokeTestSuite {
  name: string;
  tests: SmokeTestResult[];
  totalPassed: number;
  totalFailed: number;
  duration: number;
}

/**
 * Run all smoke tests for the Tests module
 */
export async function runTestsModuleSmokeTests(projectId: string): Promise<SmokeTestSuite> {
  const startTime = Date.now();
  const tests: SmokeTestResult[] = [];

  // Test 1: Test Cases Query
  tests.push(await runTest('test-cases-query', 'Test Cases Query', async () => {
    const { data, error } = await supabase
      .from('test_cases')
      .select('id, title')
      .eq('project_id', projectId)
      .limit(1);
    if (error) throw error;
    return true;
  }));

  // Test 2: Test Cycles Query
  tests.push(await runTest('test-cycles-query', 'Test Cycles Query', async () => {
    const { data, error } = await supabase
      .from('test_cycles')
      .select('id, name, key')
      .eq('project_id', projectId)
      .limit(1);
    if (error) throw error;
    return true;
  }));

  // Test 3: Test Executions Query
  tests.push(await runTest('test-executions-query', 'Test Executions Query', async () => {
    const { data, error } = await supabase
      .from('test_cycle_executions')
      .select('id, status')
      .limit(1);
    if (error) throw error;
    return true;
  }));

  // Test 4: Test Sets Query
  tests.push(await runTest('test-sets-query', 'Test Sets Query', async () => {
    const { data, error } = await supabase
      .from('test_sets')
      .select('id, name')
      .eq('project_id', projectId)
      .limit(1);
    if (error) throw error;
    return true;
  }));

  // Test 5: Step Results Query
  tests.push(await runTest('step-results-query', 'Step Results Query', async () => {
    const { data, error } = await supabase
      .from('test_execution_step_results')
      .select('id, status')
      .limit(1);
    if (error) throw error;
    return true;
  }));

  // Test 6: Activity Log Insert (dry run check)
  tests.push(await runTest('activity-log-schema', 'Activity Log Schema Valid', async () => {
    const { error } = await supabase
      .from('test_activity_log')
      .select('id, activity_type, entity_type')
      .limit(1);
    if (error) throw error;
    return true;
  }));

  // Test 7: Defects Table Access
  tests.push(await runTest('defects-query', 'Defects Query', async () => {
    const { data, error } = await supabase
      .from('defects')
      .select('id, title')
      .eq('project_id', projectId)
      .limit(1);
    if (error) throw error;
    return true;
  }));

  // Test 8: Test Reports Table Access
  tests.push(await runTest('reports-query', 'Test Reports Query', async () => {
    const { data, error } = await supabase
      .from('test_reports')
      .select('id, report_type')
      .limit(1);
    if (error) throw error;
    return true;
  }));

  // Test 9: Cycle Sets Junction Table
  tests.push(await runTest('cycle-sets-query', 'Cycle Sets Junction Query', async () => {
    const { data, error } = await supabase
      .from('test_cycle_sets')
      .select('id, cycle_id, set_id')
      .limit(1);
    if (error) throw error;
    return true;
  }));

  // Test 10: Execution Defects Junction Table
  tests.push(await runTest('execution-defects-query', 'Execution Defects Junction Query', async () => {
    const { data, error } = await supabase
      .from('test_execution_defects')
      .select('id, execution_id, defect_work_item_id')
      .limit(1);
    if (error) throw error;
    return true;
  }));

  const totalPassed = tests.filter(t => t.passed).length;
  const totalFailed = tests.filter(t => !t.passed).length;

  return {
    name: 'Tests Module Smoke Tests',
    tests,
    totalPassed,
    totalFailed,
    duration: Date.now() - startTime,
  };
}

/**
 * Run a single test with timing and error handling
 */
async function runTest(
  id: string,
  name: string,
  testFn: () => Promise<boolean>
): Promise<SmokeTestResult> {
  const startTime = Date.now();
  try {
    await testFn();
    return {
      id,
      name,
      passed: true,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      id,
      name,
      passed: false,
      error: error.message || 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Validate that a handler is defined (not undefined/null)
 */
export function validateHandler(handler: unknown, handlerName: string): boolean {
  if (handler === undefined || handler === null) {
    console.warn(`[CTA Warning] Handler "${handlerName}" is not defined`);
    return false;
  }
  if (typeof handler !== 'function') {
    console.warn(`[CTA Warning] Handler "${handlerName}" is not a function`);
    return false;
  }
  return true;
}

/**
 * Create a wrapped handler that logs if missing
 */
export function safeHandler<T extends (...args: any[]) => any>(
  handler: T | undefined,
  fallbackMessage: string
): T {
  if (!handler) {
    return ((...args: any[]) => {
      console.warn(`[Missing Handler] ${fallbackMessage}`);
    }) as T;
  }
  return handler;
}
