/**
 * Mock data for Test Execution page
 */

export interface ExecutionStep {
  id: string;
  action: string;
  expectedResult: string;
}

export interface StepResult {
  status?: 'passed' | 'failed' | 'skipped';
  actualResult?: string;
  comment?: string;
  attachments?: { id: string; name: string; type: string }[];
}

export interface CycleTestCase {
  id: string;
  title: string;
  status: 'passed' | 'failed' | 'in_progress' | 'not_run';
  progress?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  // Canonical assignee fields (matching TMCycleScope/TMDefect pattern)
  assigned_to?: string | null;
  assignee?: { id: string; full_name: string; avatar_url?: string } | null;
}

export interface ExecutionTestCase {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  cycleId: string;
  cycleName: string;
  executor: string;
  startedAt: string;
}

export const mockExecutionTestCase: ExecutionTestCase = {
  id: 'TC-001',
  title: 'User login with valid credentials',
  description: 'Verify that a registered user can successfully log in to the application using valid credentials.',
  type: 'Functional',
  priority: 'critical',
  cycleId: 'CY-26.01.01-02',
  cycleName: 'Regression Suite',
  executor: 'Vikram S.',
  startedAt: 'Jan 11, 2026 10:34 AM',
};

export const mockExecutionSteps: ExecutionStep[] = [
  {
    id: "step-1",
    action: "Navigate to the login page at https://app.catalyst.gov.sa/login",
    expectedResult: "Login page loads with email and password fields visible, along with 'Forgot Password' and 'Register' links"
  },
  {
    id: "step-2",
    action: "Enter valid email address 'testuser@ministry.gov.sa' in the email field",
    expectedResult: "Email is accepted without validation errors, field shows green checkmark"
  },
  {
    id: "step-3",
    action: "Enter valid password 'SecurePass123!' in the password field",
    expectedResult: "Password is masked with dots, show/hide toggle is visible"
  },
  {
    id: "step-4",
    action: "Click the 'Sign In' button",
    expectedResult: "Button shows loading spinner, form fields are disabled during submission"
  },
  {
    id: "step-5",
    action: "Wait for authentication to complete",
    expectedResult: "System validates credentials against the authentication service within 3 seconds"
  },
  {
    id: "step-6",
    action: "Observe the redirect behavior",
    expectedResult: "User is redirected to the Dashboard page (/dashboard)"
  },
  {
    id: "step-7",
    action: "Verify user session is created",
    expectedResult: "User avatar and name appear in the top-right header, session token is stored"
  },
  {
    id: "step-8",
    action: "Check browser console for errors",
    expectedResult: "No JavaScript errors or failed network requests in the console"
  }
];

export const mockInitialStepResults: Record<string, StepResult> = {
  'step-1': { status: 'passed', comment: '' },
  'step-2': { status: 'passed', comment: '' },
  'step-3': { status: 'failed', actualResult: 'Password field did not show the show/hide toggle icon', comment: 'UI regression from last release' },
};

export const mockCycleTestCases: CycleTestCase[] = [
  { id: 'TC-001', title: 'User login with valid credentials', status: 'in_progress', progress: '3/8', priority: 'critical' },
  { id: 'TC-002', title: 'User login with invalid password', status: 'passed', priority: 'high' },
  { id: 'TC-003', title: 'Password reset email sent', status: 'failed', priority: 'high' },
  { id: 'TC-004', title: 'Session timeout after inactivity', status: 'passed', priority: 'medium' },
  { id: 'TC-005', title: 'Multi-factor authentication flow', status: 'not_run', priority: 'critical' },
  { id: 'TC-010', title: 'API rate limiting', status: 'not_run', priority: 'high' },
  { id: 'TC-011', title: 'SQL injection prevention', status: 'not_run', priority: 'critical' },
  { id: 'TC-012', title: 'XSS attack prevention', status: 'not_run', priority: 'critical' },
  { id: 'TC-013', title: 'Dashboard widgets load time', status: 'not_run', priority: 'medium' },
  { id: 'TC-015', title: 'User permissions update', status: 'not_run', priority: 'high' },
];
