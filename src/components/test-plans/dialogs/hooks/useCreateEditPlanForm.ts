/**
 * useCreateEditPlanForm - Form State & Validation Hook
 * GOD-TIER 9.8 Implementation
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  TestPlanFormState, 
  TestPlanFormErrors, 
  initialFormState,
  CoverageStats 
} from '../CreateEditTestPlanDialog.types';
import { TMTestPlan } from '@/types/test-management';

interface UseCreateEditPlanFormOptions {
  existingPlan?: TMTestPlan | null;
}

export function useCreateEditPlanForm({ existingPlan }: UseCreateEditPlanFormOptions = {}) {
  const [formState, setFormState] = useState<TestPlanFormState>(initialFormState);
  const [errors, setErrors] = useState<TestPlanFormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Initialize from existing plan if editing
  useEffect(() => {
    if (existingPlan) {
      setFormState({
        name: existingPlan.name || '',
        description: existingPlan.description || '',
        status: existingPlan.status || 'draft',
        release_id: existingPlan.release_id || null,
        start_date: existingPlan.start_date ? new Date(existingPlan.start_date) : null,
        end_date: existingPlan.end_date ? new Date(existingPlan.end_date) : null,
        objectives: existingPlan.objectives || '',
        in_scope_ids: [],
        out_of_scope: existingPlan.out_of_scope || '',
        test_strategy: existingPlan.test_strategy || '',
        environment_requirements: existingPlan.environment_requirements || '',
        entry_criteria: '',
        exit_criteria: '',
        assumptions: '',
        risks: '',
        owner_id: existingPlan.owner_id || null,
        team_members: existingPlan.team_members || [],
      });
    }
  }, [existingPlan]);

  // Set single field value
  const setField = useCallback(<K extends keyof TestPlanFormState>(
    field: K, 
    value: TestPlanFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setTouchedFields(prev => new Set(prev).add(field));
    
    // Clear error for this field when user types
    setErrors(prev => {
      if (prev[field as keyof TestPlanFormErrors]) {
        const { [field as keyof TestPlanFormErrors]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  // Set multiple fields at once (for release auto-fill)
  const setFields = useCallback((updates: Partial<TestPlanFormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: TestPlanFormErrors = {};

    // Name validation
    if (!formState.name.trim()) {
      newErrors.name = 'Plan name is required';
    } else if (formState.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formState.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    // Description validation (optional but max length)
    if (formState.description && formState.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Date validation
    if (formState.start_date && formState.end_date) {
      if (formState.end_date < formState.start_date) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    // Owner validation (required for non-draft plans)
    if (formState.status !== 'draft' && !formState.owner_id) {
      newErrors.owner_id = 'Owner is required for non-draft plans';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState]);

  // Validate single field (for real-time validation)
  const validateField = useCallback((field: keyof TestPlanFormState) => {
    const value = formState[field];
    let error: string | undefined;

    switch (field) {
      case 'name':
        if (typeof value === 'string') {
          if (!value.trim()) error = 'Plan name is required';
          else if (value.length < 3) error = 'Name must be at least 3 characters';
          else if (value.length > 100) error = 'Name must be less than 100 characters';
        }
        break;
      case 'description':
        if (typeof value === 'string' && value.length > 500) {
          error = 'Description must be less than 500 characters';
        }
        break;
      case 'objectives':
        if (typeof value === 'string' && value.length > 1000) {
          error = 'Objectives must be less than 1000 characters';
        }
        break;
    }

    setErrors(prev => {
      if (error) {
        return { ...prev, [field]: error };
      } else {
        const { [field as keyof TestPlanFormErrors]: _, ...rest } = prev;
        return rest;
      }
    });

    return !error;
  }, [formState]);

  // Check if field is valid (has been touched and has no errors)
  const isFieldValid = useCallback((field: keyof TestPlanFormState): boolean => {
    return touchedFields.has(field) && !errors[field as keyof TestPlanFormErrors];
  }, [touchedFields, errors]);

  // Calculate coverage stats
  const coverageStats = useMemo((): CoverageStats => {
    const inScopeCount = formState.in_scope_ids.length;
    // Mock calculation - in real implementation, this would be computed from actual test case counts
    const existingTestsCount = Math.floor(inScopeCount * 0.7);
    const gapCount = inScopeCount - existingTestsCount;
    const coveragePercent = inScopeCount > 0 ? Math.round((existingTestsCount / inScopeCount) * 100) : 0;
    
    return {
      inScopeCount,
      existingTestsCount,
      gapCount,
      coveragePercent,
    };
  }, [formState.in_scope_ids]);

  // Reset form
  const reset = useCallback(() => {
    setFormState(initialFormState);
    setErrors({});
    setIsDirty(false);
    setTouchedFields(new Set());
  }, []);

  // Get tab error counts
  const getTabErrors = useCallback(() => ({
    basic: !!(errors.name || errors.description || errors.start_date || errors.end_date),
    scope: false,
    strategy: false,
    team: !!errors.owner_id,
  }), [errors]);

  return {
    formState,
    errors,
    isDirty,
    touchedFields,
    setField,
    setFields,
    validate,
    validateField,
    isFieldValid,
    coverageStats,
    reset,
    getTabErrors,
  };
}
