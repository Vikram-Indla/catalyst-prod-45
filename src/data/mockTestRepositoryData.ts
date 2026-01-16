/**
 * Mock Data for Test Repository Module
 */

import type { Folder, TestSuite, RepositoryTestCase, TreeNode } from '@/types/test-repository';

// =====================================================
// FOLDERS
// =====================================================

export const mockFolders: Folder[] = [
  {
    id: 'folder-auth',
    name: 'Authentication Module',
    parentId: null,
    projectId: 'proj-1',
    sortOrder: 0,
    testCount: 24,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
  },
  {
    id: 'folder-auth-oauth',
    name: 'OAuth Flows',
    parentId: 'folder-auth',
    projectId: 'proj-1',
    sortOrder: 0,
    testCount: 8,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
  },
  {
    id: 'folder-auth-mfa',
    name: 'MFA',
    parentId: 'folder-auth',
    projectId: 'proj-1',
    sortOrder: 1,
    testCount: 6,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
  },
  {
    id: 'folder-payments',
    name: 'Payments Module',
    parentId: null,
    projectId: 'proj-1',
    sortOrder: 1,
    testCount: 18,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-14T00:00:00Z',
    createdBy: 'user-002',
  },
  {
    id: 'folder-user',
    name: 'User Management',
    parentId: null,
    projectId: 'proj-1',
    sortOrder: 2,
    testCount: 12,
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-13T00:00:00Z',
    createdBy: 'user-001',
  },
];

// =====================================================
// TEST SUITES
// =====================================================

export const mockSuites: TestSuite[] = [
  {
    id: 'suite-login',
    name: 'Login Tests',
    folderId: 'folder-auth',
    projectId: 'proj-1',
    ownerId: 'user-001',
    ownerName: 'Sarah Chen',
    sortOrder: 0,
    status: 'active',
    testCount: 10,
    passedCount: 8,
    failedCount: 1,
    tags: ['smoke', 'critical-path'],
    description: 'Core login functionality tests',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
  },
  {
    id: 'suite-oauth-google',
    name: 'Google OAuth',
    folderId: 'folder-auth-oauth',
    projectId: 'proj-1',
    ownerId: 'user-002',
    ownerName: 'Mike Johnson',
    sortOrder: 0,
    status: 'active',
    testCount: 5,
    passedCount: 5,
    failedCount: 0,
    tags: ['oauth', 'integration'],
    description: 'Google OAuth integration tests',
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-002',
  },
  {
    id: 'suite-oauth-github',
    name: 'GitHub OAuth',
    folderId: 'folder-auth-oauth',
    projectId: 'proj-1',
    ownerId: 'user-002',
    ownerName: 'Mike Johnson',
    sortOrder: 1,
    status: 'active',
    testCount: 3,
    passedCount: 2,
    failedCount: 1,
    tags: ['oauth', 'integration'],
    description: 'GitHub OAuth integration tests',
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-002',
  },
  {
    id: 'suite-mfa-totp',
    name: 'TOTP Authentication',
    folderId: 'folder-auth-mfa',
    projectId: 'proj-1',
    ownerId: 'user-003',
    ownerName: 'Emily Davis',
    sortOrder: 0,
    status: 'active',
    testCount: 6,
    passedCount: 4,
    failedCount: 2,
    tags: ['mfa', 'security'],
    description: 'Time-based OTP authentication tests',
    createdAt: '2026-01-06T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-003',
  },
  {
    id: 'suite-checkout',
    name: 'Checkout Flow',
    folderId: 'folder-payments',
    projectId: 'proj-1',
    ownerId: 'user-001',
    ownerName: 'Sarah Chen',
    sortOrder: 0,
    status: 'active',
    testCount: 12,
    passedCount: 10,
    failedCount: 2,
    tags: ['payments', 'critical-path'],
    description: 'End-to-end checkout flow tests',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-14T00:00:00Z',
    createdBy: 'user-001',
  },
  {
    id: 'suite-refunds',
    name: 'Refund Processing',
    folderId: 'folder-payments',
    projectId: 'proj-1',
    ownerId: 'user-004',
    ownerName: 'Alex Wilson',
    sortOrder: 1,
    status: 'active',
    testCount: 6,
    passedCount: 6,
    failedCount: 0,
    tags: ['payments', 'refunds'],
    description: 'Refund processing tests',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-14T00:00:00Z',
    createdBy: 'user-004',
  },
  {
    id: 'suite-profile',
    name: 'User Profile',
    folderId: 'folder-user',
    projectId: 'proj-1',
    ownerId: 'user-003',
    ownerName: 'Emily Davis',
    sortOrder: 0,
    status: 'active',
    testCount: 8,
    passedCount: 7,
    failedCount: 1,
    tags: ['user', 'profile'],
    description: 'User profile management tests',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-13T00:00:00Z',
    createdBy: 'user-003',
  },
  {
    id: 'suite-api-smoke',
    name: 'API Smoke Tests',
    folderId: null,
    projectId: 'proj-1',
    ownerId: 'user-001',
    ownerName: 'Sarah Chen',
    sortOrder: 0,
    status: 'active',
    testCount: 15,
    passedCount: 14,
    failedCount: 1,
    tags: ['api', 'smoke'],
    description: 'Quick API health checks',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
  },
];

// =====================================================
// TEST CASES (for Login Tests suite)
// =====================================================

export const mockTestCases: RepositoryTestCase[] = [
  {
    id: 'TC-001',
    name: 'Valid email and password login',
    suiteId: 'suite-login',
    sortOrder: 0,
    priority: 'critical',
    status: 'ready',
    preconditions: 'User account exists with verified email',
    description: 'Verify successful login with valid credentials',
    steps: [
      { order: 1, action: 'Navigate to login page', expectedResult: 'Login form is displayed' },
      { order: 2, action: 'Enter valid email', expectedResult: 'Email field accepts input' },
      { order: 3, action: 'Enter valid password', expectedResult: 'Password field shows masked input' },
      { order: 4, action: 'Click Sign In button', expectedResult: 'User is redirected to dashboard' },
    ],
    linkedRequirements: ['REQ-AUTH-001'],
    lastRunResult: 'passed',
    lastRunDate: '2026-01-15T10:30:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
    updatedBy: 'user-001',
  },
  {
    id: 'TC-002',
    name: 'Invalid password shows error',
    suiteId: 'suite-login',
    sortOrder: 1,
    priority: 'high',
    status: 'ready',
    preconditions: 'User account exists',
    description: 'Verify error message for incorrect password',
    steps: [
      { order: 1, action: 'Navigate to login page', expectedResult: 'Login form is displayed' },
      { order: 2, action: 'Enter valid email', expectedResult: 'Email field accepts input' },
      { order: 3, action: 'Enter incorrect password', expectedResult: 'Password field accepts input' },
      { order: 4, action: 'Click Sign In button', expectedResult: 'Error message displayed: Invalid credentials' },
    ],
    linkedRequirements: ['REQ-AUTH-002'],
    lastRunResult: 'passed',
    lastRunDate: '2026-01-15T10:32:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
    updatedBy: 'user-001',
  },
  {
    id: 'TC-003',
    name: 'Email format validation',
    suiteId: 'suite-login',
    sortOrder: 2,
    priority: 'medium',
    status: 'ready',
    description: 'Verify email format validation on login form',
    steps: [
      { order: 1, action: 'Navigate to login page', expectedResult: 'Login form is displayed' },
      { order: 2, action: 'Enter invalid email format', expectedResult: 'Email field shows validation error' },
      { order: 3, action: 'Click Sign In button', expectedResult: 'Form does not submit, validation error shown' },
    ],
    linkedRequirements: ['REQ-AUTH-003'],
    lastRunResult: 'passed',
    lastRunDate: '2026-01-15T10:34:00Z',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
    updatedBy: 'user-001',
  },
  {
    id: 'TC-004',
    name: 'Account lockout after failed attempts',
    suiteId: 'suite-login',
    sortOrder: 3,
    priority: 'critical',
    status: 'ready',
    preconditions: 'User account exists, not locked',
    description: 'Verify account locks after 5 failed login attempts',
    steps: [
      { order: 1, action: 'Attempt login with wrong password 5 times', expectedResult: 'Each attempt shows error message' },
      { order: 2, action: 'Attempt 6th login', expectedResult: 'Account locked message displayed' },
      { order: 3, action: 'Wait 15 minutes and retry', expectedResult: 'Account unlocked, login succeeds' },
    ],
    linkedRequirements: ['REQ-SEC-001'],
    lastRunResult: 'failed',
    lastRunDate: '2026-01-15T10:40:00Z',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-002',
    updatedBy: 'user-002',
  },
  {
    id: 'TC-005',
    name: 'Remember me functionality',
    suiteId: 'suite-login',
    sortOrder: 4,
    priority: 'medium',
    status: 'ready',
    description: 'Verify remember me checkbox extends session',
    steps: [
      { order: 1, action: 'Login with Remember Me checked', expectedResult: 'Login succeeds' },
      { order: 2, action: 'Close browser and reopen', expectedResult: 'Session persists, user still logged in' },
    ],
    linkedRequirements: ['REQ-AUTH-004'],
    lastRunResult: 'passed',
    lastRunDate: '2026-01-15T10:42:00Z',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
    updatedBy: 'user-001',
  },
  {
    id: 'TC-006',
    name: 'Password reset link request',
    suiteId: 'suite-login',
    sortOrder: 5,
    priority: 'high',
    status: 'ready',
    description: 'Verify forgot password flow sends reset email',
    steps: [
      { order: 1, action: 'Click Forgot Password link', expectedResult: 'Reset form displayed' },
      { order: 2, action: 'Enter registered email', expectedResult: 'Email field accepts input' },
      { order: 3, action: 'Click Send Reset Link', expectedResult: 'Success message and email sent' },
    ],
    linkedRequirements: ['REQ-AUTH-005'],
    lastRunResult: 'passed',
    lastRunDate: '2026-01-15T10:45:00Z',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
    updatedBy: 'user-001',
  },
  {
    id: 'TC-007',
    name: 'Session timeout redirect',
    suiteId: 'suite-login',
    sortOrder: 6,
    priority: 'medium',
    status: 'draft',
    description: 'Verify session expires and redirects to login',
    steps: [
      { order: 1, action: 'Login to application', expectedResult: 'Login succeeds' },
      { order: 2, action: 'Wait for session timeout', expectedResult: 'After timeout, user redirected to login' },
    ],
    linkedRequirements: ['REQ-SEC-002'],
    createdAt: '2026-01-04T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-002',
    updatedBy: 'user-002',
  },
  {
    id: 'TC-008',
    name: 'Login with SSO redirect',
    suiteId: 'suite-login',
    sortOrder: 7,
    priority: 'high',
    status: 'needs-update',
    description: 'Verify SSO login redirects to identity provider',
    steps: [
      { order: 1, action: 'Click SSO Login button', expectedResult: 'Redirected to IdP' },
      { order: 2, action: 'Authenticate with IdP', expectedResult: 'Redirected back to app' },
      { order: 3, action: 'Verify session created', expectedResult: 'User logged in with SSO identity' },
    ],
    linkedRequirements: ['REQ-AUTH-006'],
    lastRunResult: 'blocked',
    lastRunDate: '2026-01-14T16:00:00Z',
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-003',
    updatedBy: 'user-003',
  },
  {
    id: 'TC-009',
    name: 'Case-insensitive email login',
    suiteId: 'suite-login',
    sortOrder: 8,
    priority: 'low',
    status: 'ready',
    description: 'Verify email is case-insensitive during login',
    steps: [
      { order: 1, action: 'Enter email in uppercase', expectedResult: 'Email accepted' },
      { order: 2, action: 'Enter correct password', expectedResult: 'Login succeeds' },
    ],
    linkedRequirements: ['REQ-AUTH-007'],
    lastRunResult: 'passed',
    lastRunDate: '2026-01-15T10:50:00Z',
    createdAt: '2026-01-06T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-001',
    updatedBy: 'user-001',
  },
  {
    id: 'TC-010',
    name: 'Login rate limiting',
    suiteId: 'suite-login',
    sortOrder: 9,
    priority: 'high',
    status: 'ready',
    description: 'Verify rate limiting on login endpoint',
    steps: [
      { order: 1, action: 'Make 100 login requests rapidly', expectedResult: 'After threshold, 429 error returned' },
      { order: 2, action: 'Wait for rate limit window', expectedResult: 'Requests allowed again' },
    ],
    linkedRequirements: ['REQ-SEC-003'],
    lastRunResult: 'passed',
    lastRunDate: '2026-01-15T11:00:00Z',
    createdAt: '2026-01-07T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    createdBy: 'user-002',
    updatedBy: 'user-002',
  },
];

// =====================================================
// TREE STRUCTURE (computed)
// =====================================================

export function buildTreeFromData(): TreeNode[] {
  const folderMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // Create folder nodes
  mockFolders.forEach(folder => {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      type: 'folder',
      parentId: folder.parentId,
      sortOrder: folder.sortOrder,
      testCount: folder.testCount,
      children: [],
    });
  });

  // Create suite nodes and attach to folders
  mockSuites.forEach(suite => {
    const suiteNode: TreeNode = {
      id: suite.id,
      name: suite.name,
      type: 'suite',
      parentId: suite.folderId,
      sortOrder: suite.sortOrder,
      testCount: suite.testCount,
      status: suite.status,
      passedCount: suite.passedCount,
      failedCount: suite.failedCount,
    };

    if (suite.folderId && folderMap.has(suite.folderId)) {
      folderMap.get(suite.folderId)!.children!.push(suiteNode);
    } else if (!suite.folderId) {
      rootNodes.push(suiteNode);
    }
  });

  // Nest folders
  mockFolders.forEach(folder => {
    const node = folderMap.get(folder.id)!;
    if (folder.parentId && folderMap.has(folder.parentId)) {
      folderMap.get(folder.parentId)!.children!.push(node);
    } else if (!folder.parentId) {
      rootNodes.push(node);
    }
  });

  // Sort children
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      // Folders first, then suites
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
    nodes.forEach(n => n.children && sortNodes(n.children));
  };

  sortNodes(rootNodes);
  return rootNodes;
}

export const mockTreeData = buildTreeFromData();
