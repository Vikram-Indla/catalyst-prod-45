/**
 * TEST SCOPE ENFORCEMENT HOOK
 * 
 * Enforces that Test Management is ONLY available at Project scope.
 * Program and Enterprise scopes get READ-ONLY aggregated views only.
 * 
 * This hook provides:
 * - isProjectScope: boolean - true if current scope is project
 * - isReadOnlyScope: boolean - true if scope is program/enterprise (read-only)
 * - canCreateTestCase: boolean
 * - canCreateTestCycle: boolean  
 * - canExecuteTests: boolean
 * - scopeType: 'project' | 'program' | 'enterprise'
 * - requiresProjectDrillDown: boolean
 */

import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

export type TestScopeType = 'project' | 'program' | 'enterprise';

export interface TestScopeEnforcement {
  scopeType: TestScopeType;
  scopeId: string | null;
  isProjectScope: boolean;
  isReadOnlyScope: boolean;
  canCreateTestCase: boolean;
  canCreateTestCycle: boolean;
  canExecuteTests: boolean;
  canAccessTestLibrary: boolean;
  requiresProjectDrillDown: boolean;
  drillDownMessage: string | null;
}

export function useTestScopeEnforcement(): TestScopeEnforcement {
  const [searchParams] = useSearchParams();
  
  return useMemo(() => {
    const scopeTypeParam = searchParams.get('scopeType') as TestScopeType | null;
    const scopeId = searchParams.get('scopeId');
    
    // Default to project scope if not specified
    const scopeType: TestScopeType = scopeTypeParam || 'project';
    
    const isProjectScope = scopeType === 'project';
    const isReadOnlyScope = scopeType === 'program' || scopeType === 'enterprise';
    
    // Operations are ONLY allowed at project level
    const canCreateTestCase = isProjectScope && !!scopeId;
    const canCreateTestCycle = isProjectScope && !!scopeId;
    const canExecuteTests = isProjectScope && !!scopeId;
    const canAccessTestLibrary = isProjectScope;
    
    const requiresProjectDrillDown = isReadOnlyScope;
    
    let drillDownMessage: string | null = null;
    if (scopeType === 'enterprise') {
      drillDownMessage = 'Test management is only available at project level. Select a program, then a project to manage tests.';
    } else if (scopeType === 'program') {
      drillDownMessage = 'Test management is only available at project level. Select a project to create or execute tests.';
    }
    
    return {
      scopeType,
      scopeId,
      isProjectScope,
      isReadOnlyScope,
      canCreateTestCase,
      canCreateTestCycle,
      canExecuteTests,
      canAccessTestLibrary,
      requiresProjectDrillDown,
      drillDownMessage,
    };
  }, [searchParams]);
}

/**
 * Assertion function for build-time/runtime validation
 * Call this before any test creation/execution operation
 */
export function assertProjectScope(scopeType: TestScopeType): void {
  if (scopeType !== 'project') {
    throw new Error(
      `SCOPE VIOLATION: Attempted test operation at ${scopeType} scope. ` +
      `Test creation and execution is ONLY permitted at project scope.`
    );
  }
}
