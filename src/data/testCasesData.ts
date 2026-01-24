/**
 * Mock data for Test Cases
 */

import type { TestCaseType } from '@/types/test-cases';

export interface TestCaseStep {
  id: string;
  step: number;
  action: string;
  expectedResult: string;
  testData?: string;
}

export interface TestCase {
  id: string;  // Actual database UUID
  key?: string; // Display key like "INV-0001" or "TC-001"
  title: string;
  release: string;
  type: TestCaseType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  steps: number;
  lastRun: 'passed' | 'failed' | 'not_run';
  assignee: {
    name: string;
    avatar: string;
    color: 'blue' | 'teal' | 'gray';
  };
  updated: string;
  // Folder information
  folderId?: string | null;
  folderName?: string | null;
  folderPath?: string | null; // Full path like "Authentication / Login"
  // Extended fields (optional for backward compatibility)
  description?: string;
  preconditions?: string;
  postconditions?: string;
  tags?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  automationStatus?: 'automated' | 'manual' | 'in_progress';
  testSteps?: TestCaseStep[];
}

export const testCasesData: TestCase[] = [
  {
    id: "TC-001",
    title: "User login with valid credentials",
    release: "REL-26.01.01",
    type: "functional",
    priority: "critical",
    status: "approved",
    steps: 8,
    lastRun: "passed",
    assignee: { name: "Vikram S.", avatar: "VS", color: "blue" },
    updated: "2 hours ago"
  },
  {
    id: "TC-002",
    title: "User login with invalid password shows error message",
    release: "REL-26.01.01",
    type: "functional",
    priority: "high",
    status: "approved",
    steps: 6,
    lastRun: "passed",
    assignee: { name: "Ahmed A.", avatar: "AA", color: "teal" },
    updated: "3 hours ago"
  },
  {
    id: "TC-003",
    title: "Password reset email is sent within 30 seconds",
    release: "REL-26.01.01",
    type: "functional",
    priority: "high",
    status: "ready",
    steps: 5,
    lastRun: "failed",
    assignee: { name: "Sara K.", avatar: "SK", color: "gray" },
    updated: "5 hours ago"
  },
  {
    id: "TC-004",
    title: "Session timeout after 30 minutes of inactivity",
    release: "REL-26.01.01",
    type: "regression",
    priority: "medium",
    status: "approved",
    steps: 4,
    lastRun: "passed",
    assignee: { name: "Mohammed R.", avatar: "MR", color: "blue" },
    updated: "1 day ago"
  },
  {
    id: "TC-005",
    title: "Multi-factor authentication flow completes successfully",
    release: "REL-26.01.01",
    type: "e2e",
    priority: "critical",
    status: "approved",
    steps: 12,
    lastRun: "passed",
    assignee: { name: "Vikram S.", avatar: "VS", color: "blue" },
    updated: "1 day ago"
  },
  {
    id: "TC-006",
    title: "Payment processing with valid credit card",
    release: "REL-26.01.02",
    type: "functional",
    priority: "critical",
    status: "ready",
    steps: 10,
    lastRun: "not_run",
    assignee: { name: "Ahmed A.", avatar: "AA", color: "teal" },
    updated: "2 days ago"
  },
  {
    id: "TC-007",
    title: "Payment fails gracefully with expired card",
    release: "REL-26.01.02",
    type: "functional",
    priority: "high",
    status: "draft",
    steps: 8,
    lastRun: "not_run",
    assignee: { name: "Sara K.", avatar: "SK", color: "gray" },
    updated: "2 days ago"
  },
  {
    id: "TC-008",
    title: "Invoice PDF generation matches template",
    release: "REL-26.01.02",
    type: "regression",
    priority: "medium",
    status: "approved",
    steps: 6,
    lastRun: "passed",
    assignee: { name: "Mohammed R.", avatar: "MR", color: "blue" },
    updated: "3 days ago"
  },
  {
    id: "TC-009",
    title: "Bulk export of transaction history to CSV",
    release: "REL-26.01.02",
    type: "functional",
    priority: "medium",
    status: "ready",
    steps: 5,
    lastRun: "failed",
    assignee: { name: "Vikram S.", avatar: "VS", color: "blue" },
    updated: "3 days ago"
  },
  {
    id: "TC-010",
    title: "API rate limiting returns 429 after threshold",
    release: "REL-25.12.01",
    type: "integration",
    priority: "high",
    status: "approved",
    steps: 7,
    lastRun: "passed",
    assignee: { name: "Ahmed A.", avatar: "AA", color: "teal" },
    updated: "4 days ago"
  },
  {
    id: "TC-011",
    title: "SQL injection prevention on search fields",
    release: "REL-25.12.01",
    type: "smoke",
    priority: "critical",
    status: "approved",
    steps: 4,
    lastRun: "passed",
    assignee: { name: "Sara K.", avatar: "SK", color: "gray" },
    updated: "5 days ago"
  },
  {
    id: "TC-012",
    title: "XSS attack vectors blocked on user inputs",
    release: "REL-25.12.01",
    type: "smoke",
    priority: "critical",
    status: "approved",
    steps: 6,
    lastRun: "passed",
    assignee: { name: "Mohammed R.", avatar: "MR", color: "blue" },
    updated: "5 days ago"
  },
  {
    id: "TC-013",
    title: "Dashboard widgets load within 2 seconds",
    release: "REL-26.01.01",
    type: "regression",
    priority: "medium",
    status: "ready",
    steps: 3,
    lastRun: "passed",
    assignee: { name: "Vikram S.", avatar: "VS", color: "blue" },
    updated: "1 week ago"
  },
  {
    id: "TC-014",
    title: "Report filters persist across page navigation",
    release: "REL-26.01.01",
    type: "functional",
    priority: "low",
    status: "draft",
    steps: 5,
    lastRun: "not_run",
    assignee: { name: "Ahmed A.", avatar: "AA", color: "teal" },
    updated: "1 week ago"
  },
  {
    id: "TC-015",
    title: "User permissions update reflects immediately",
    release: "REL-26.01.01",
    type: "e2e",
    priority: "high",
    status: "approved",
    steps: 9,
    lastRun: "passed",
    assignee: { name: "Sara K.", avatar: "SK", color: "gray" },
    updated: "1 week ago"
  },
];
