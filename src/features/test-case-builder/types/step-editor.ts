// =====================================================
// STEP EDITOR TYPES
// Types for enhanced step editor components
// =====================================================

export interface EditorStep {
  id: string;
  step_number: number;
  step_type: 'action' | 'verification' | 'setup' | 'teardown';
  action: string;
  expected_result: string;
  test_data: string;
  notes: string;
  is_optional: boolean;
  estimated_time_seconds: number | null;
  isEditing?: boolean;
  isNew?: boolean;
}

export interface StepDragItem {
  id: string;
  index: number;
  type: 'STEP';
}

export type StepEditorMode = 'classic' | 'bdd';
export type TestFormat = 'classic' | 'bdd';

export interface StepValidation {
  isValid: boolean;
  errors: {
    action?: string;
    expected_result?: string;
  };
}

export const STEP_TYPES = [
  { value: 'action', label: 'Action', icon: 'Play', color: 'blue' },
  { value: 'verification', label: 'Verification', icon: 'CheckCircle', color: 'green' },
  { value: 'setup', label: 'Setup', icon: 'Settings', color: 'purple' },
  { value: 'teardown', label: 'Teardown', icon: 'XCircle', color: 'orange' },
] as const;

export const createEmptyStep = (stepNumber: number): EditorStep => ({
  id: `temp-${Date.now()}-${stepNumber}`,
  step_number: stepNumber,
  step_type: 'action',
  action: '',
  expected_result: '',
  test_data: '',
  notes: '',
  is_optional: false,
  estimated_time_seconds: null,
  isEditing: true,
  isNew: true,
});

export const validateStep = (step: EditorStep): StepValidation => {
  const errors: StepValidation['errors'] = {};
  
  if (!step.action.trim()) {
    errors.action = 'Action is required';
  }
  
  if (step.step_type === 'verification' && !step.expected_result.trim()) {
    errors.expected_result = 'Expected result is required for verification steps';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
