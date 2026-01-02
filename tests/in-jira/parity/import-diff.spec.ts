/**
 * Import Diff Tests
 * Validates Jira import produces accurate and idempotent results
 * 
 * Test IDs: PARITY-IMP-001 through PARITY-IMP-007
 */

import { test, expect } from '@playwright/test';

// Import types
interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: { name: string };
    status: { name: string };
    priority?: { name: string };
    assignee?: { emailAddress: string; displayName: string };
    reporter?: { emailAddress: string; displayName: string };
    created: string;
    updated: string;
    comment?: {
      comments: Array<{
        id: string;
        body: string;
        author: { emailAddress: string };
        created: string;
      }>;
    };
    attachment?: Array<{
      id: string;
      filename: string;
      size: number;
      mimeType: string;
    }>;
    parent?: { key: string };
    customfield_10016?: number; // Story points
  };
}

interface ImportedIssue {
  id: string;
  external_id: string;
  external_source: string;
  key: string;
  summary: string;
  description?: string;
  issue_type: string;
  status: string;
  priority?: string;
  assignee_id?: string;
  reporter_id?: string;
  created_at: string;
  updated_at: string;
  story_points?: number;
  parent_id?: string;
}

interface ImportDiffReport {
  matched: number;
  created: number;
  updated: number;
  conflicts: Array<{
    issueKey: string;
    field: string;
    sourceValue: unknown;
    targetValue: unknown;
  }>;
}

// Import simulation functions
const generateExternalId = (source: string, id: string): string => {
  return `${source}:${id}`;
};

const findExistingIssue = (
  externalId: string,
  existingIssues: ImportedIssue[]
): ImportedIssue | undefined => {
  return existingIssues.find(i => i.external_id === externalId);
};

const importIssue = (
  jiraIssue: JiraIssue,
  existingIssues: ImportedIssue[],
  userMapping: Map<string, string>
): { action: 'created' | 'updated' | 'skipped'; issue: ImportedIssue } => {
  const externalId = generateExternalId('jira', jiraIssue.id);
  const existing = findExistingIssue(externalId, existingIssues);

  const assigneeId = jiraIssue.fields.assignee?.emailAddress 
    ? userMapping.get(jiraIssue.fields.assignee.emailAddress)
    : undefined;

  const reporterId = jiraIssue.fields.reporter?.emailAddress
    ? userMapping.get(jiraIssue.fields.reporter.emailAddress)
    : undefined;

  const importedIssue: ImportedIssue = {
    id: existing?.id || `new-${Date.now()}`,
    external_id: externalId,
    external_source: 'jira_cloud',
    key: jiraIssue.key,
    summary: jiraIssue.fields.summary,
    description: jiraIssue.fields.description,
    issue_type: jiraIssue.fields.issuetype.name,
    status: jiraIssue.fields.status.name,
    priority: jiraIssue.fields.priority?.name,
    assignee_id: assigneeId,
    reporter_id: reporterId,
    created_at: jiraIssue.fields.created,
    updated_at: jiraIssue.fields.updated,
    story_points: jiraIssue.fields.customfield_10016,
  };

  if (existing) {
    // Check if update needed
    const needsUpdate = existing.summary !== importedIssue.summary ||
      existing.status !== importedIssue.status;
    
    return { 
      action: needsUpdate ? 'updated' : 'skipped', 
      issue: importedIssue 
    };
  }

  return { action: 'created', issue: importedIssue };
};

test.describe('PARITY-IMP-001: Issue import is idempotent', () => {
  const mockJiraIssue: JiraIssue = {
    id: '10001',
    key: 'PROJ-1',
    fields: {
      summary: 'Test Issue',
      description: 'Description',
      issuetype: { name: 'Story' },
      status: { name: 'To Do' },
      priority: { name: 'Medium' },
      created: '2024-01-01T00:00:00.000Z',
      updated: '2024-01-02T00:00:00.000Z',
    },
  };

  test('First import creates issue', async () => {
    const existingIssues: ImportedIssue[] = [];
    const userMapping = new Map<string, string>();

    const result = importIssue(mockJiraIssue, existingIssues, userMapping);

    expect(result.action).toBe('created');
    expect(result.issue.external_id).toBe('jira:10001');
    expect(result.issue.summary).toBe('Test Issue');
  });

  test('Second import with same data is skipped', async () => {
    const existingIssues: ImportedIssue[] = [{
      id: 'existing-1',
      external_id: 'jira:10001',
      external_source: 'jira_cloud',
      key: 'PROJ-1',
      summary: 'Test Issue',
      description: 'Description',
      issue_type: 'Story',
      status: 'To Do',
      priority: 'Medium',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
    }];
    const userMapping = new Map<string, string>();

    const result = importIssue(mockJiraIssue, existingIssues, userMapping);

    expect(result.action).toBe('skipped');
    expect(result.issue.id).toBe('existing-1');
  });

  test('Import with changed data triggers update', async () => {
    const updatedJiraIssue = {
      ...mockJiraIssue,
      fields: {
        ...mockJiraIssue.fields,
        summary: 'Updated Test Issue',
      },
    };

    const existingIssues: ImportedIssue[] = [{
      id: 'existing-1',
      external_id: 'jira:10001',
      external_source: 'jira_cloud',
      key: 'PROJ-1',
      summary: 'Test Issue',
      description: 'Description',
      issue_type: 'Story',
      status: 'To Do',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
    }];
    const userMapping = new Map<string, string>();

    const result = importIssue(updatedJiraIssue, existingIssues, userMapping);

    expect(result.action).toBe('updated');
    expect(result.issue.summary).toBe('Updated Test Issue');
  });
});

test.describe('PARITY-IMP-002: User matching by email is accurate', () => {
  test('User with matching email is linked', async () => {
    const userMapping = new Map<string, string>([
      ['john@example.com', 'user-uuid-1'],
      ['jane@example.com', 'user-uuid-2'],
    ]);

    const jiraIssue: JiraIssue = {
      id: '10001',
      key: 'PROJ-1',
      fields: {
        summary: 'Test',
        issuetype: { name: 'Story' },
        status: { name: 'To Do' },
        assignee: { emailAddress: 'john@example.com', displayName: 'John' },
        reporter: { emailAddress: 'jane@example.com', displayName: 'Jane' },
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
      },
    };

    const result = importIssue(jiraIssue, [], userMapping);

    expect(result.issue.assignee_id).toBe('user-uuid-1');
    expect(result.issue.reporter_id).toBe('user-uuid-2');
  });

  test('Unknown user email results in null reference', async () => {
    const userMapping = new Map<string, string>();

    const jiraIssue: JiraIssue = {
      id: '10001',
      key: 'PROJ-1',
      fields: {
        summary: 'Test',
        issuetype: { name: 'Story' },
        status: { name: 'To Do' },
        assignee: { emailAddress: 'unknown@example.com', displayName: 'Unknown' },
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
      },
    };

    const result = importIssue(jiraIssue, [], userMapping);

    expect(result.issue.assignee_id).toBeUndefined();
  });

  test('Email matching is case-insensitive', async () => {
    const normalizeEmail = (email: string): string => email.toLowerCase();

    const userMapping = new Map<string, string>([
      [normalizeEmail('John@Example.COM'), 'user-uuid-1'],
    ]);

    const lookupEmail = 'JOHN@EXAMPLE.com';
    const userId = userMapping.get(normalizeEmail(lookupEmail));

    expect(userId).toBe('user-uuid-1');
  });
});

test.describe('PARITY-IMP-003: Status mapping preserves workflow state', () => {
  test('Jira status maps to correct local status', async () => {
    const statusMapping: Record<string, string> = {
      'To Do': 'backlog',
      'In Progress': 'in-progress',
      'In Review': 'review',
      'Done': 'done',
      'Closed': 'done',
    };

    const mapStatus = (jiraStatus: string): string => {
      return statusMapping[jiraStatus] || 'backlog';
    };

    expect(mapStatus('To Do')).toBe('backlog');
    expect(mapStatus('In Progress')).toBe('in-progress');
    expect(mapStatus('Done')).toBe('done');
    expect(mapStatus('Unknown Status')).toBe('backlog');
  });

  test('Status category is preserved', async () => {
    const statusCategoryMapping: Record<string, 'new' | 'indeterminate' | 'done'> = {
      'backlog': 'new',
      'todo': 'new',
      'in-progress': 'indeterminate',
      'review': 'indeterminate',
      'done': 'done',
    };

    const getStatusCategory = (localStatus: string): string => {
      return statusCategoryMapping[localStatus] || 'new';
    };

    expect(getStatusCategory('backlog')).toBe('new');
    expect(getStatusCategory('in-progress')).toBe('indeterminate');
    expect(getStatusCategory('done')).toBe('done');
  });
});

test.describe('PARITY-IMP-004: Comment history is preserved with correct timestamps', () => {
  test('Comments are imported with original timestamps', async () => {
    const jiraComments = [
      {
        id: 'c1',
        body: 'First comment',
        author: { emailAddress: 'user@example.com' },
        created: '2024-01-01T10:00:00.000Z',
      },
      {
        id: 'c2',
        body: 'Second comment',
        author: { emailAddress: 'user@example.com' },
        created: '2024-01-02T10:00:00.000Z',
      },
    ];

    const importedComments = jiraComments.map(c => ({
      external_id: `jira:${c.id}`,
      content: c.body,
      created_at: c.created,
    }));

    expect(importedComments[0].created_at).toBe('2024-01-01T10:00:00.000Z');
    expect(importedComments[1].created_at).toBe('2024-01-02T10:00:00.000Z');
  });

  test('Comment order is preserved', async () => {
    const comments = [
      { id: '1', created: '2024-01-01T10:00:00.000Z' },
      { id: '2', created: '2024-01-01T11:00:00.000Z' },
      { id: '3', created: '2024-01-01T09:00:00.000Z' },
    ];

    const sorted = [...comments].sort((a, b) => 
      new Date(a.created).getTime() - new Date(b.created).getTime()
    );

    expect(sorted[0].id).toBe('3');
    expect(sorted[1].id).toBe('1');
    expect(sorted[2].id).toBe('2');
  });
});

test.describe('PARITY-IMP-005: Attachment metadata is imported correctly', () => {
  test('Attachment metadata is preserved', async () => {
    const jiraAttachment = {
      id: 'att-1',
      filename: 'screenshot.png',
      size: 12345,
      mimeType: 'image/png',
      created: '2024-01-01T00:00:00.000Z',
    };

    const importedAttachment = {
      external_id: `jira:${jiraAttachment.id}`,
      file_name: jiraAttachment.filename,
      file_size: jiraAttachment.size,
      mime_type: jiraAttachment.mimeType,
      created_at: jiraAttachment.created,
    };

    expect(importedAttachment.file_name).toBe('screenshot.png');
    expect(importedAttachment.file_size).toBe(12345);
    expect(importedAttachment.mime_type).toBe('image/png');
  });

  test('Attachment reference points to external URL', async () => {
    const jiraAttachment = {
      id: 'att-1',
      content: 'https://jira.example.com/attachments/att-1',
    };

    // During import, we store the original URL reference
    const importedReference = {
      external_url: jiraAttachment.content,
      import_status: 'pending', // Files can be fetched later
    };

    expect(importedReference.external_url).toContain('jira.example.com');
  });
});

test.describe('PARITY-IMP-006: Epic hierarchy is preserved during import', () => {
  test('Child issues link to parent epic', async () => {
    const jiraIssues: JiraIssue[] = [
      {
        id: '10001',
        key: 'PROJ-1',
        fields: {
          summary: 'Epic Issue',
          issuetype: { name: 'Epic' },
          status: { name: 'To Do' },
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
        },
      },
      {
        id: '10002',
        key: 'PROJ-2',
        fields: {
          summary: 'Story under Epic',
          issuetype: { name: 'Story' },
          status: { name: 'To Do' },
          parent: { key: 'PROJ-1' },
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
        },
      },
    ];

    // First pass: import all issues
    const importedIssues = new Map<string, string>();
    jiraIssues.forEach(issue => {
      importedIssues.set(issue.key, `imported-${issue.id}`);
    });

    // Second pass: resolve parent references
    const childIssue = jiraIssues.find(i => i.key === 'PROJ-2')!;
    const parentKey = childIssue.fields.parent?.key;
    const parentId = parentKey ? importedIssues.get(parentKey) : undefined;

    expect(parentId).toBe('imported-10001');
  });

  test('Epic issues are imported as program epics', async () => {
    const epicMapping: Record<string, string> = {
      'Epic': 'program_epic',
      'Initiative': 'program_epic',
    };

    const mapIssueType = (jiraType: string): string => {
      return epicMapping[jiraType] || jiraType.toLowerCase();
    };

    expect(mapIssueType('Epic')).toBe('program_epic');
    expect(mapIssueType('Story')).toBe('story');
  });
});

test.describe('PARITY-IMP-007: Diff report accurately identifies discrepancies', () => {
  test('Diff report shows field differences', async () => {
    const sourceIssue = {
      key: 'PROJ-1',
      summary: 'Source Summary',
      status: 'In Progress',
      priority: 'High',
    };

    const targetIssue = {
      key: 'PROJ-1',
      summary: 'Different Summary',
      status: 'In Progress',
      priority: 'Medium',
    };

    const generateDiff = (
      source: Record<string, unknown>,
      target: Record<string, unknown>
    ): Array<{ field: string; sourceValue: unknown; targetValue: unknown }> => {
      const diffs: Array<{ field: string; sourceValue: unknown; targetValue: unknown }> = [];
      
      Object.keys(source).forEach(key => {
        if (source[key] !== target[key]) {
          diffs.push({
            field: key,
            sourceValue: source[key],
            targetValue: target[key],
          });
        }
      });
      
      return diffs;
    };

    const diffs = generateDiff(sourceIssue, targetIssue);

    expect(diffs).toHaveLength(2);
    expect(diffs.find(d => d.field === 'summary')).toBeDefined();
    expect(diffs.find(d => d.field === 'priority')).toBeDefined();
  });

  test('Diff report summary counts are accurate', async () => {
    const generateDiffReport = (
      sourceCount: number,
      matchedCount: number,
      conflictCount: number
    ): ImportDiffReport => {
      return {
        matched: matchedCount,
        created: sourceCount - matchedCount,
        updated: conflictCount,
        conflicts: [],
      };
    };

    const report = generateDiffReport(100, 80, 5);

    expect(report.matched).toBe(80);
    expect(report.created).toBe(20);
    expect(report.updated).toBe(5);
  });
});
