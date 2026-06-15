/**
 * BR subtask categories (2026-06-15): MDT subtask keys share the MDT
 * sequence (Q3). MDT Business Requests live in business_requests.request_key,
 * subtasks in catalyst_issues.issue_key, Jira items in ph_issues.issue_key.
 * nextKey must take the MAX across ALL supplied sources so a new subtask
 * never collides with an existing BR or sibling subtask.
 */
import { describe, it, expect } from 'vitest';
import { nextKey } from '../generateIssueKey';

describe('nextKey — max across multiple sources', () => {
  it('takes the global max across sources', () => {
    const phIssues = [{ issue_key: 'MDT-3' }];
    const catalystIssues = [{ issue_key: 'MDT-12' }];
    const businessRequests = [{ issue_key: 'MDT-79' }]; // request_key mapped → issue_key
    expect(nextKey('MDT', phIssues, catalystIssues, businessRequests)).toBe('MDT-80');
  });

  it('returns -1 when every source is empty', () => {
    expect(nextKey('MDT', [], [], [])).toBe('MDT-1');
  });

  it('ignores non-matching prefixes and malformed keys', () => {
    const rows = [{ issue_key: 'BAU-9999' }, { issue_key: 'MDT-x' }, { issue_key: null }, { issue_key: 'MDT-5' }];
    expect(nextKey('MDT', rows)).toBe('MDT-6');
  });
});
