/**
 * Test Case Detail Data — Sample data for TC-001
 */

export interface TestStep {
  id: string;
  action: string;
  expectedResult: string;
  attachments: { id: string; name: string }[];
}

export interface TestCaseDetail {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  type: 'functional' | 'regression' | 'smoke' | 'integration' | 'e2e';
  priority: 'critical' | 'high' | 'medium' | 'low';
  lastRun: 'passed' | 'failed' | 'not_run';
  release: string;
  folder: string;
  assignee: {
    name: string;
    avatar: string;
    color: string;
  };
  estimatedTime: string;
  preconditions: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ExecutionHistoryItem {
  id: number;
  cycleId: string;
  cycleName: string;
  status: 'passed' | 'failed' | 'blocked' | 'not_run';
  executor: string;
  duration: string;
  timestamp: string;
}

export const testCaseDetailData: TestCaseDetail = {
  id: "TC-001",
  title: "User login with valid credentials",
  description: "Verify that a registered user can successfully log in to the application using valid credentials. The system should authenticate the user, create a session, and redirect to the dashboard.",
  status: "approved",
  type: "functional",
  priority: "critical",
  lastRun: "passed",
  release: "REL-26.01.01",
  folder: "Authentication / Login",
  assignee: {
    name: "Vikram S.",
    avatar: "VS",
    color: "blue"
  },
  estimatedTime: "5 min",
  preconditions: "User must have a registered account with verified email address.",
  tags: ["login", "authentication", "security"],
  createdBy: "Vikram S.",
  createdAt: "Jan 3, 2026",
  updatedAt: "2 hours ago",
  version: 3
};

export const testCaseSteps: TestStep[] = [
  {
    id: "step-1",
    action: "Navigate to the login page at https://app.catalyst.gov.sa/login",
    expectedResult: "Login page loads with email and password fields visible, along with 'Forgot Password' and 'Register' links",
    attachments: []
  },
  {
    id: "step-2",
    action: "Enter valid email address 'testuser@ministry.gov.sa' in the email field",
    expectedResult: "Email is accepted without validation errors, field shows green checkmark",
    attachments: []
  },
  {
    id: "step-3",
    action: "Enter valid password 'SecurePass123!' in the password field",
    expectedResult: "Password is masked with dots, show/hide toggle is visible",
    attachments: []
  },
  {
    id: "step-4",
    action: "Click the 'Sign In' button",
    expectedResult: "Button shows loading spinner, form fields are disabled during submission",
    attachments: []
  },
  {
    id: "step-5",
    action: "Wait for authentication to complete",
    expectedResult: "System validates credentials against the authentication service within 3 seconds",
    attachments: []
  },
  {
    id: "step-6",
    action: "Observe the redirect behavior",
    expectedResult: "User is redirected to the Dashboard page (/dashboard)",
    attachments: [{ id: "att-1", name: "dashboard-redirect.png" }]
  },
  {
    id: "step-7",
    action: "Verify user session is created",
    expectedResult: "User avatar and name appear in the top-right header, session token is stored",
    attachments: []
  },
  {
    id: "step-8",
    action: "Check browser console for errors",
    expectedResult: "No JavaScript errors or failed network requests in the console",
    attachments: []
  }
];

export const executionHistory: ExecutionHistoryItem[] = [
  { 
    id: 1, 
    cycleId: "CY-26.01.01-02", 
    cycleName: "Regression Suite", 
    status: "passed", 
    executor: "Ahmed A.", 
    duration: "4m 23s", 
    timestamp: "2 hours ago" 
  },
  { 
    id: 2, 
    cycleId: "CY-26.01.01-01", 
    cycleName: "Smoke Testing", 
    status: "passed", 
    executor: "Vikram S.", 
    duration: "3m 58s", 
    timestamp: "1 day ago" 
  },
  { 
    id: 3, 
    cycleId: "CY-25.12.01-03", 
    cycleName: "UAT Sign-off", 
    status: "failed", 
    executor: "Sara K.", 
    duration: "5m 12s", 
    timestamp: "3 days ago" 
  },
  { 
    id: 4, 
    cycleId: "CY-25.12.01-02", 
    cycleName: "Integration Tests", 
    status: "passed", 
    executor: "Mohammed R.", 
    duration: "4m 01s", 
    timestamp: "5 days ago" 
  },
  { 
    id: 5, 
    cycleId: "CY-25.12.01-01", 
    cycleName: "Smoke Testing", 
    status: "passed", 
    executor: "Vikram S.", 
    duration: "3m 45s", 
    timestamp: "1 week ago" 
  },
];

export const linkedItems = [
  { type: 'requirement', id: 'REQ-042', title: 'User Authentication Requirements', status: null },
  { type: 'defect', id: 'DEF-023', title: 'Login button unresponsive on mobile', status: 'closed' },
  { type: 'story', id: 'US-156', title: 'As a user, I want to login securely', status: null },
];

export const attachments = [
  { id: 'att-1', name: 'login-mockup.png', size: '245 KB', type: 'image' },
  { id: 'att-2', name: 'test-data.xlsx', size: '12 KB', type: 'excel' },
];

export const comments = [
  {
    id: 1,
    author: { name: 'Vikram S.', avatar: 'VS', color: 'blue' },
    content: 'Updated the expected result for step 4 to include loading spinner verification.',
    timestamp: '2 hours ago',
  },
  {
    id: 2,
    author: { name: 'Ahmed A.', avatar: 'AA', color: 'green' },
    content: 'This test case should also cover the "Remember me" checkbox functionality.',
    timestamp: '1 day ago',
  },
  {
    id: 3,
    author: { name: 'Sara K.', avatar: 'SK', color: 'purple' },
    content: 'Added attachment for the dashboard redirect screenshot.',
    timestamp: '2 days ago',
  },
  {
    id: 4,
    author: { name: 'Mohammed R.', avatar: 'MR', color: 'orange' },
    content: 'Approved for regression testing in REL-26.01.01.',
    timestamp: '3 days ago',
  },
  {
    id: 5,
    author: { name: 'Vikram S.', avatar: 'VS', color: 'blue' },
    content: 'Initial version created based on user story US-156.',
    timestamp: '1 week ago',
  },
];
