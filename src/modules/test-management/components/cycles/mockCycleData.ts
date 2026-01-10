/**
 * Mock Data for Test Cycles - Phase 5 Ruthless Rebuild
 * THIS DATA MUST BE VISIBLE ON FIRST LOAD
 */

// Use a different name to avoid conflict with api/types.ts CycleStatus
export type MockCycleStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

export interface CycleProgress {
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  notRun: number;
  total: number;
}

export interface CycleOwner {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
}

export interface MockCycle {
  id: string;
  key: string;
  name: string;
  description: string;
  folder: string;
  folderId: string;
  status: MockCycleStatus;
  progress: CycleProgress;
  startDate: string;
  endDate: string;
  owner: CycleOwner;
  environment: string;
  buildVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockFolder {
  id: string;
  name: string;
  parentId: string | null;
  cycleCount: number;
  children: MockFolder[];
}

// Mock Owners
export const mockOwners: CycleOwner[] = [
  { id: 'user-1', name: 'Vikram Singh', initials: 'VS' },
  { id: 'user-2', name: 'Ahmed Al-Rashid', initials: 'AA' },
  { id: 'user-3', name: 'Sara Khan', initials: 'SK' },
  { id: 'user-4', name: 'Mohammed Rahman', initials: 'MR' },
];

// Mock Environments
export const mockEnvironments = ['Development', 'Staging', 'UAT', 'Production'];

// THESE CYCLES MUST BE VISIBLE IN THE TABLE IMMEDIATELY
export const initialMockCycles: MockCycle[] = [
  {
    id: 'cyc-001',
    key: 'CYC-001',
    name: 'Sprint 24 Regression',
    description: 'Full regression suite for Sprint 24 release',
    folder: 'Sprint Cycles / Q1 2026',
    folderId: 'folder-sprint-q1',
    status: 'in_progress',
    progress: {
      passed: 45,
      failed: 8,
      blocked: 3,
      skipped: 2,
      notRun: 42,
      total: 100
    },
    startDate: '2026-01-08',
    endDate: '2026-01-15',
    owner: mockOwners[0],
    environment: 'Staging',
    buildVersion: '2.4.0-rc1',
    createdAt: '2026-01-08T09:00:00Z',
    updatedAt: '2026-01-10T14:30:00Z',
  },
  {
    id: 'cyc-002',
    key: 'CYC-002',
    name: 'Security Audit Q1',
    description: 'Quarterly security testing cycle',
    folder: 'Security Testing',
    folderId: 'folder-security',
    status: 'in_progress',
    progress: {
      passed: 12,
      failed: 2,
      blocked: 1,
      skipped: 0,
      notRun: 25,
      total: 40
    },
    startDate: '2026-01-06',
    endDate: '2026-01-20',
    owner: mockOwners[1],
    environment: 'Production',
    buildVersion: '2.3.5',
    createdAt: '2026-01-06T08:00:00Z',
    updatedAt: '2026-01-10T11:00:00Z',
  },
  {
    id: 'cyc-003',
    key: 'CYC-003',
    name: 'Sprint 23 Regression',
    description: 'Completed regression for Sprint 23',
    folder: 'Sprint Cycles / Q1 2026',
    folderId: 'folder-sprint-q1',
    status: 'completed',
    progress: {
      passed: 85,
      failed: 10,
      blocked: 0,
      skipped: 5,
      notRun: 0,
      total: 100
    },
    startDate: '2026-01-01',
    endDate: '2026-01-07',
    owner: mockOwners[0],
    environment: 'Staging',
    buildVersion: '2.3.0',
    createdAt: '2026-01-01T09:00:00Z',
    updatedAt: '2026-01-07T18:00:00Z',
  },
  {
    id: 'cyc-004',
    key: 'CYC-004',
    name: 'API Integration Tests',
    description: 'Testing external API integrations',
    folder: 'Integration Testing',
    folderId: 'folder-integration',
    status: 'blocked',
    progress: {
      passed: 15,
      failed: 0,
      blocked: 8,
      skipped: 0,
      notRun: 27,
      total: 50
    },
    startDate: '2026-01-05',
    endDate: '2026-01-12',
    owner: mockOwners[2],
    environment: 'Development',
    buildVersion: '2.4.0-alpha',
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-01-09T16:00:00Z',
  },
  {
    id: 'cyc-005',
    key: 'CYC-005',
    name: 'Sprint 25 Regression',
    description: 'Upcoming regression for Sprint 25',
    folder: 'Sprint Cycles / Q1 2026',
    folderId: 'folder-sprint-q1',
    status: 'not_started',
    progress: {
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      notRun: 80,
      total: 80
    },
    startDate: '2026-01-15',
    endDate: '2026-01-22',
    owner: mockOwners[1],
    environment: 'Staging',
    buildVersion: '2.5.0-rc1',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-01-10T09:00:00Z',
  },
];

// Initial folder structure
export const initialMockFolders: MockFolder[] = [
  {
    id: 'folder-sprint',
    name: 'Sprint Cycles',
    parentId: null,
    cycleCount: 12,
    children: [
      { id: 'folder-sprint-q1', name: 'Q1 2026', parentId: 'folder-sprint', cycleCount: 8, children: [] },
      { id: 'folder-sprint-q4', name: 'Q4 2025', parentId: 'folder-sprint', cycleCount: 4, children: [] },
    ],
  },
  {
    id: 'folder-security',
    name: 'Security Testing',
    parentId: null,
    cycleCount: 3,
    children: [],
  },
  {
    id: 'folder-integration',
    name: 'Integration Testing',
    parentId: null,
    cycleCount: 5,
    children: [],
  },
  {
    id: 'folder-regression',
    name: 'Regression Suites',
    parentId: null,
    cycleCount: 4,
    children: [],
  },
];

// Helper to generate new cycle key
export function generateCycleKey(existingCycles: MockCycle[]): string {
  const maxNum = existingCycles.reduce((max, c) => {
    const match = c.key.match(/CYC-(\d+)/);
    const num = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, num);
  }, 0);
  return `CYC-${String(maxNum + 1).padStart(3, '0')}`;
}

// Helper to generate new cycle ID
export function generateCycleId(): string {
  return `cyc-${Date.now()}`;
}

// Helper to generate new folder ID
export function generateFolderId(): string {
  return `folder-${Date.now()}`;
}
