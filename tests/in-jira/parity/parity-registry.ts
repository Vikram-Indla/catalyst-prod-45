/**
 * Parity Test Registry
 * Every conformance claim MUST have a unique test ID registered here
 * 
 * Format: PARITY-{CATEGORY}-{NUMBER}
 * Categories:
 *   API - API contract tests
 *   WF  - Workflow FSM tests
 *   SEC - Permission/security leakage tests
 *   IMP - Import diff tests
 *   UI  - UI regression tests
 */

export interface ParityTest {
  id: string;
  category: 'API' | 'WF' | 'SEC' | 'IMP' | 'UI';
  description: string;
  jiraReference?: string; // Link to Jira documentation
  priority: 'critical' | 'high' | 'medium' | 'low';
  implemented: boolean;
}

export const PARITY_TESTS: ParityTest[] = [
  // API Contract Tests
  {
    id: 'PARITY-API-001',
    category: 'API',
    description: 'Issue CRUD operations match Jira REST API v3 contract',
    jiraReference: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/',
    priority: 'critical',
    implemented: true,
  },
  {
    id: 'PARITY-API-002',
    category: 'API',
    description: 'Issue fields schema matches Jira field definitions',
    priority: 'critical',
    implemented: true,
  },
  {
    id: 'PARITY-API-003',
    category: 'API',
    description: 'Project endpoints return consistent structure',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-API-004',
    category: 'API',
    description: 'Comment operations support Jira Document Format',
    priority: 'medium',
    implemented: true,
  },
  {
    id: 'PARITY-API-005',
    category: 'API',
    description: 'Attachment metadata conforms to Jira attachment schema',
    priority: 'medium',
    implemented: true,
  },
  {
    id: 'PARITY-API-006',
    category: 'API',
    description: 'Version/Release endpoints match Jira version API',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-API-007',
    category: 'API',
    description: 'Sprint endpoints match Jira Agile API',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-API-008',
    category: 'API',
    description: 'Board configuration endpoints match Jira board API',
    priority: 'medium',
    implemented: true,
  },

  // Workflow FSM Tests
  {
    id: 'PARITY-WF-001',
    category: 'WF',
    description: 'Status transitions follow configured workflow rules',
    priority: 'critical',
    implemented: true,
  },
  {
    id: 'PARITY-WF-002',
    category: 'WF',
    description: 'Invalid transitions are rejected with proper error',
    priority: 'critical',
    implemented: true,
  },
  {
    id: 'PARITY-WF-003',
    category: 'WF',
    description: 'Transition conditions are evaluated correctly',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-WF-004',
    category: 'WF',
    description: 'Post-functions execute after successful transition',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-WF-005',
    category: 'WF',
    description: 'Workflow schemes correctly map issue types to workflows',
    priority: 'medium',
    implemented: true,
  },
  {
    id: 'PARITY-WF-006',
    category: 'WF',
    description: 'Resolution field behavior matches Jira (required on Done)',
    priority: 'medium',
    implemented: true,
  },

  // Permission/Security Leakage Tests
  {
    id: 'PARITY-SEC-001',
    category: 'SEC',
    description: 'Project-level permissions prevent unauthorized access',
    priority: 'critical',
    implemented: true,
  },
  {
    id: 'PARITY-SEC-002',
    category: 'SEC',
    description: 'Issue-level security schemes are enforced',
    priority: 'critical',
    implemented: true,
  },
  {
    id: 'PARITY-SEC-003',
    category: 'SEC',
    description: 'Field-level permissions hide restricted fields',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-SEC-004',
    category: 'SEC',
    description: 'Anonymous users cannot access private projects',
    priority: 'critical',
    implemented: true,
  },
  {
    id: 'PARITY-SEC-005',
    category: 'SEC',
    description: 'Cross-project data leakage prevented in search',
    priority: 'critical',
    implemented: true,
  },
  {
    id: 'PARITY-SEC-006',
    category: 'SEC',
    description: 'Attachment access respects issue permissions',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-SEC-007',
    category: 'SEC',
    description: 'Comment visibility (internal vs public) enforced',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-SEC-008',
    category: 'SEC',
    description: 'RLS policies prevent tenant data leakage',
    priority: 'critical',
    implemented: true,
  },

  // Import Diff Tests
  {
    id: 'PARITY-IMP-001',
    category: 'IMP',
    description: 'Issue import is idempotent (re-import produces same result)',
    priority: 'critical',
    implemented: true,
  },
  {
    id: 'PARITY-IMP-002',
    category: 'IMP',
    description: 'User matching by email is accurate',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-IMP-003',
    category: 'IMP',
    description: 'Status mapping preserves workflow state',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-IMP-004',
    category: 'IMP',
    description: 'Comment history is preserved with correct timestamps',
    priority: 'medium',
    implemented: true,
  },
  {
    id: 'PARITY-IMP-005',
    category: 'IMP',
    description: 'Attachment metadata is imported correctly',
    priority: 'medium',
    implemented: true,
  },
  {
    id: 'PARITY-IMP-006',
    category: 'IMP',
    description: 'Epic hierarchy is preserved during import',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-IMP-007',
    category: 'IMP',
    description: 'Diff report accurately identifies discrepancies',
    priority: 'high',
    implemented: true,
  },

  // UI Regression Tests
  {
    id: 'PARITY-UI-001',
    category: 'UI',
    description: 'Issue drawer layout matches Jira design patterns',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-UI-002',
    category: 'UI',
    description: 'Kanban board drag-and-drop behavior matches Jira',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-UI-003',
    category: 'UI',
    description: 'Backlog view with sprint planning matches Jira',
    priority: 'high',
    implemented: true,
  },
  {
    id: 'PARITY-UI-004',
    category: 'UI',
    description: 'Quick filters behavior matches Jira board filters',
    priority: 'medium',
    implemented: true,
  },
  {
    id: 'PARITY-UI-005',
    category: 'UI',
    description: 'Inline editing behavior matches Jira UX',
    priority: 'medium',
    implemented: true,
  },
  {
    id: 'PARITY-UI-006',
    category: 'UI',
    description: 'Status transitions UI matches Jira dropdown behavior',
    priority: 'medium',
    implemented: true,
  },
  {
    id: 'PARITY-UI-007',
    category: 'UI',
    description: 'Search/filter panel matches Jira JQL-style filtering',
    priority: 'medium',
    implemented: true,
  },
];

// Helper to get test by ID
export function getParityTest(id: string): ParityTest | undefined {
  return PARITY_TESTS.find(t => t.id === id);
}

// Helper to get all tests by category
export function getParityTestsByCategory(category: ParityTest['category']): ParityTest[] {
  return PARITY_TESTS.filter(t => t.category === category);
}

// Verify all tests are implemented
export function getUnimplementedTests(): ParityTest[] {
  return PARITY_TESTS.filter(t => !t.implemented);
}

// Generate test coverage report
export function generateCoverageReport(): {
  total: number;
  implemented: number;
  coverage: number;
  byCategory: Record<string, { total: number; implemented: number }>;
} {
  const byCategory: Record<string, { total: number; implemented: number }> = {};
  
  PARITY_TESTS.forEach(test => {
    if (!byCategory[test.category]) {
      byCategory[test.category] = { total: 0, implemented: 0 };
    }
    byCategory[test.category].total++;
    if (test.implemented) {
      byCategory[test.category].implemented++;
    }
  });

  const total = PARITY_TESTS.length;
  const implemented = PARITY_TESTS.filter(t => t.implemented).length;

  return {
    total,
    implemented,
    coverage: (implemented / total) * 100,
    byCategory,
  };
}
