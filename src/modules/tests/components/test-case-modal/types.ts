/**
 * Enterprise Test Case Modal Types
 */

// Step structure
export interface TestStep {
  id: string;
  stepOrder: number;
  action: string;
  testData: string;
  expectedResult: string;
  evidenceRequired: 'none' | 'screenshot' | 'log' | 'video';
  tags: string[];
  attachments: string[];
  isSharedStep?: boolean;
  sharedStepGroupId?: string;
}

// Variable for parameterization
export interface TestVariable {
  id: string;
  name: string;
  description: string;
}

// Dataset for parameterization
export interface TestDataset {
  id: string;
  name: string;
  values: Record<string, string>; // variableId -> value
}

// Link for traceability
export interface TestCaseLink {
  id: string;
  linkedType: 'requirement' | 'story' | 'feature' | 'defect' | 'incident' | 'test_set' | 'cycle' | 'release';
  linkedId: string;
  linkedKey: string;
  linkedTitle: string;
  relation: 'relates' | 'blocks' | 'blocked_by';
}

// Form data structure
export interface TestCaseFormData {
  // Details
  title: string;
  description: string;
  folderId: string;
  status: 'draft' | 'ready' | 'deprecated';
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'manual' | 'exploratory' | 'bdd';
  ownerId: string;
  components: string[];
  labels: string[];
  estimateMinutes: number | null;
  risk: 'critical' | 'high' | 'medium' | 'low';
  requiresApproval: boolean;
  preconditions: string;
  
  // Steps
  steps: TestStep[];
  
  // Data
  datasetsEnabled: boolean;
  variables: TestVariable[];
  datasets: TestDataset[];
  
  // Links
  links: TestCaseLink[];
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  canBeReady: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  tab: 'details' | 'steps' | 'data' | 'links' | 'review';
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// Tab definition
export type ModalTab = 'details' | 'steps' | 'data' | 'links' | 'review';

// Props for each tab
export interface TabProps {
  formData: TestCaseFormData;
  setFormData: React.Dispatch<React.SetStateAction<TestCaseFormData>>;
  projectId: string;
  validation: ValidationResult;
}
