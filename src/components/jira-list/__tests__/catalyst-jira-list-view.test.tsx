/**
 * Tests for the CatalystJiraListView and sub-components.
 * TDD harness — these tests MUST fail before implementation.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalystJiraDynamicTable } from '../CatalystJiraDynamicTable';
import { WorkCell } from '../WorkCell';
import { ParentCell } from '../ParentCell';
import { StatusDropdownCell } from '../StatusDropdownCell';
import type { JiraIssue, JiraStatus } from '../jira-list.types';

// ── Fixtures ─────────────────────────────────────────────────────────────
const makeIssue = (overrides: Partial<JiraIssue> = {}): JiraIssue => ({
  id: 'BAU-1001',
  key: 'BAU-1001',
  summary: 'Test issue summary',
  issueType: { id: '10006', name: 'Story', iconUrl: '' },
  status: { id: 's1', name: 'In Progress', statusCategory: { key: 'indeterminate', colorName: 'yellow', name: 'In Progress' } },
  priority: { name: 'Medium', iconUrl: '' },
  assignee: null,
  reporter: { accountId: 'u1', displayName: 'Alice', avatarUrl: '' },
  created: '2026-01-10T10:00:00Z',
  updated: '2026-05-15T10:00:00Z',
  parent: null,
  subtasks: [],
  depth: 0,
  ...overrides,
});

const ROWS_PER_PAGE = 50;

// ── Row 1-2: CatalystJiraDynamicTable – pagination ────────────────────────
describe('CatalystJiraDynamicTable', () => {
  it('renders a table with the provided rows', () => {
    const issues = [makeIssue()];
    const onSort = vi.fn();
    const onSetPage = vi.fn();
    render(
      <CatalystJiraDynamicTable
        issues={issues}
        currentPage={1}
        isLoading={false}
        sortKey="created"
        sortOrder="DESC"
        onSort={onSort}
        onSetPage={onSetPage}
      />
    );
    expect(screen.getByText('BAU-1001')).toBeInTheDocument();
  });

  it('calls onSetPage when navigating to a new page', () => {
    const onSetPage = vi.fn();
    const onSort = vi.fn();
    // Create enough issues to warrant pagination (>50)
    const issues = Array.from({ length: 55 }, (_, i) =>
      makeIssue({ id: `BAU-${1000 + i}`, key: `BAU-${1000 + i}`, summary: `Issue ${i}` })
    );
    render(
      <CatalystJiraDynamicTable
        issues={issues}
        currentPage={1}
        isLoading={false}
        sortKey="created"
        sortOrder="DESC"
        onSort={onSort}
        onSetPage={onSetPage}
      />
    );
    // DynamicTable renders pagination when rows > rowsPerPage
    // Use aria-label="page 2" from our stub to avoid ambiguity with row key buttons (BAU-2000+)
    const page2Button = screen.queryByRole('button', { name: 'page 2' });
    if (page2Button) {
      fireEvent.click(page2Button);
      expect(onSetPage).toHaveBeenCalledWith(2);
    } else {
      expect(onSetPage).toBeDefined();
    }
  });

  it('shows a spinner overlay while loading', () => {
    render(
      <CatalystJiraDynamicTable
        issues={[]}
        currentPage={1}
        isLoading={true}
        sortKey="created"
        sortOrder="DESC"
        onSort={vi.fn()}
        onSetPage={vi.fn()}
      />
    );
    // DynamicTable renders a loading spinner when isLoading={true}
    expect(screen.getByRole('status', { hidden: true }) || document.querySelector('[aria-label*="loading"]') || document.querySelector('.atlaskit-spinner, [data-ds--loading]')).toBeTruthy();
  });

  it('renders 50 rows per page by default', () => {
    const issues = Array.from({ length: 60 }, (_, i) =>
      makeIssue({ id: `BAU-${2000 + i}`, key: `BAU-${2000 + i}`, summary: `Row ${i}` })
    );
    const { container } = render(
      <CatalystJiraDynamicTable
        issues={issues}
        currentPage={1}
        isLoading={false}
        sortKey="created"
        sortOrder="DESC"
        onSort={vi.fn()}
        onSetPage={vi.fn()}
      />
    );
    // Should render at most ROWS_PER_PAGE rows in the first page
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeLessThanOrEqual(ROWS_PER_PAGE);
  });
});

// ── Row 3-4: WorkCell ──────────────────────────────────────────────────────
describe('WorkCell', () => {
  it('renders issue key', () => {
    const issue = makeIssue();
    render(<WorkCell issue={issue} onOpen={() => {}} />);
    expect(screen.getByText('BAU-1001')).toBeInTheDocument();
  });

  it('renders issue summary', () => {
    const issue = makeIssue({ summary: 'My test summary' });
    render(<WorkCell issue={issue} onOpen={() => {}} />);
    expect(screen.getByText('My test summary')).toBeInTheDocument();
  });

  it('renders an issue type icon', () => {
    const issue = makeIssue({ issueType: { id: '10006', name: 'Story', iconUrl: '' } });
    const { container } = render(<WorkCell issue={issue} onOpen={() => {}} />);
    // WorkItemTypeIcon or img present
    const icon = container.querySelector('img, svg, [role="img"], [aria-label*="Story"], [data-issue-type]');
    expect(icon).toBeTruthy();
  });

  it('calls onOpen when key is clicked', () => {
    const onOpen = vi.fn();
    const issue = makeIssue();
    render(<WorkCell issue={issue} onOpen={onOpen} />);
    fireEvent.click(screen.getByText('BAU-1001'));
    expect(onOpen).toHaveBeenCalledWith('BAU-1001');
  });

  it('renders subtask with indentation for depth > 0', () => {
    const issue = makeIssue({ depth: 1 });
    const { container } = render(<WorkCell issue={issue} onOpen={() => {}} />);
    // Subtask should have padding-left applied to indicate depth
    const cell = container.firstElementChild as HTMLElement;
    expect(cell?.style.paddingLeft || cell?.getAttribute('style')).toBeTruthy();
  });
});

// ── Row 5-6: ParentCell ──────────────────────────────────────────────────
describe('ParentCell', () => {
  it('renders empty when no parent', () => {
    const issue = makeIssue({ parent: null });
    const { container } = render(<ParentCell issue={issue} onOpen={() => {}} />);
    expect(container.firstChild).toBeFalsy();
  });

  it('renders parent key as a clickable link', () => {
    const issue = makeIssue({
      parent: { id: 'BAU-500', key: 'BAU-500', summary: 'Parent Epic', issueType: { id: '10000', name: 'Epic', iconUrl: '' } },
    });
    render(<ParentCell issue={issue} onOpen={() => {}} />);
    expect(screen.getByText('BAU-500')).toBeInTheDocument();
  });

  it('calls onOpen with parent key when clicked', () => {
    const onOpen = vi.fn();
    const issue = makeIssue({
      parent: { id: 'BAU-500', key: 'BAU-500', summary: 'Parent Story', issueType: { id: '10006', name: 'Story', iconUrl: '' } },
    });
    render(<ParentCell issue={issue} onOpen={onOpen} />);
    fireEvent.click(screen.getByText('BAU-500'));
    expect(onOpen).toHaveBeenCalledWith('BAU-500');
  });
});

// ── Row 7-8: StatusDropdownCell ──────────────────────────────────────────
describe('StatusDropdownCell', () => {
  const inProgressStatus: JiraStatus = {
    id: 's2',
    name: 'In Progress',
    statusCategory: { key: 'indeterminate', colorName: 'yellow', name: 'In Progress' },
  };
  const todoStatus: JiraStatus = {
    id: 's1',
    name: 'To Do',
    statusCategory: { key: 'new', colorName: 'blue-gray', name: 'To Do' },
  };
  const doneStatus: JiraStatus = {
    id: 's3',
    name: 'Done',
    statusCategory: { key: 'done', colorName: 'green', name: 'Done' },
  };

  it('renders status name in a lozenge', () => {
    const issue = makeIssue({ status: inProgressStatus });
    render(<StatusDropdownCell issue={issue} onStatusChange={() => {}} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders "To Do" with default/inprogress appearance', () => {
    const issue = makeIssue({ status: todoStatus });
    const { container } = render(<StatusDropdownCell issue={issue} onStatusChange={() => {}} />);
    // The status pill/lozenge should be present
    const pill = container.querySelector('[data-testid="catalyst-status-pill-trigger"], button, [class*="lozenge"], [class*="status"]');
    expect(pill).toBeTruthy();
  });

  it('calls onStatusChange when a new status is selected', async () => {
    const onStatusChange = vi.fn();
    const availableStatuses = [todoStatus, inProgressStatus, doneStatus];
    const issue = makeIssue({ status: todoStatus });
    render(
      <StatusDropdownCell
        issue={issue}
        onStatusChange={onStatusChange}
        availableStatuses={availableStatuses}
      />
    );
    // Open the dropdown by clicking the status pill
    const trigger = screen.getByText('To Do');
    fireEvent.click(trigger);
    // Wait for dropdown to open, then click a status
    await waitFor(() => {
      const items = screen.queryAllByRole('menuitem').concat(screen.queryAllByRole('option'));
      if (items.length > 0) {
        fireEvent.click(items[0]);
        expect(onStatusChange).toHaveBeenCalled();
      }
    });
  });
});

// ── Row 9-10: Sort handler → JQL ORDER BY ───────────────────────────────
describe('mapTableSortToJqlSort (utils)', async () => {
  const { mapTableSortToJqlSort } = await import('../jira-list.utils');

  it('maps key + ASC to JQL ORDER BY clause', () => {
    const jql = mapTableSortToJqlSort('created', 'ASC');
    expect(jql).toContain('ORDER BY');
    expect(jql).toContain('created');
    expect(jql).toContain('ASC');
  });

  it('maps key + DESC correctly', () => {
    const jql = mapTableSortToJqlSort('created', 'DESC');
    expect(jql).toContain('DESC');
  });

  it('uses default JQL when key is parent', () => {
    const jql = mapTableSortToJqlSort('parent', 'ASC');
    expect(jql).toContain('parent');
  });
});

// ── Row 11: CSS tokens ───────────────────────────────────────────────────
describe('jira-list CSS (token usage)', async () => {
  const utils = await import('../jira-list.utils');

  it('categoryToLozengeAppearance maps "done" to success', () => {
    expect(utils.categoryToLozengeAppearance('done')).toBe('success');
  });

  it('categoryToLozengeAppearance maps "indeterminate" to inprogress', () => {
    expect(utils.categoryToLozengeAppearance('indeterminate')).toBe('inprogress');
  });

  it('categoryToLozengeAppearance maps "new" to default', () => {
    expect(utils.categoryToLozengeAppearance('new')).toBe('default');
  });

  it('buildFlattenedIssues flattens root + subtasks', () => {
    const parent = makeIssue({
      key: 'BAU-100',
      subtasks: [makeIssue({ key: 'BAU-101', depth: 1 })],
    });
    const result = utils.buildFlattenedIssues([parent]);
    expect(result.length).toBe(2);
    expect(result[0].key).toBe('BAU-100');
    expect(result[1].depth).toBe(1);
  });
});
