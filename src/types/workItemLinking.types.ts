/**
 * CATALYST TESTS - Work Item Linking Types
 * Bidirectional integration between test management and work items
 */

import type { TestCase, TestCycle } from './test-management';

export type WorkItemType = 'story' | 'feature' | 'defect' | 'epic' | 'task';
export type LinkType = 'covers' | 'tests' | 'validates' | 'reproduces';

export interface WorkItemTestLink {
  id: string;
  test_case_id: string;
  work_item_id: string;
  work_item_type: WorkItemType;
  link_type: LinkType;
  created_by: string;
  created_at: string;
  test_case?: TestCase;
}

export interface WorkItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  assignee?: string;
  project_id?: string;
  type: WorkItemType;
  priority?: string;
  severity?: string;
}

export interface CreateTestFromWorkItemRequest {
  work_item_id: string;
  work_item_type: WorkItemType;
  title: string;
  description?: string;
  test_type: 'manual' | 'automated' | 'bdd';
  priority: 'critical' | 'high' | 'medium' | 'low';
  folder_id?: string;
  auto_link: boolean;
}

export interface LinkTestToWorkItemRequest {
  work_item_id: string;
  work_item_type: WorkItemType;
  test_case_ids: string[];
  link_type: LinkType;
}

export interface AITestSuggestion {
  title: string;
  description: string;
  steps: Array<{
    action: string;
    expected_result?: string;
  }>;
  expected_result: string;
  test_type: 'manual' | 'automated' | 'bdd';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface WorkItemTestSummary {
  work_item_id: string;
  work_item_type: WorkItemType;
  total_tests: number;
  test_cases: WorkItemTestLink[];
  test_cycles: TestCycle[];
  passed_count: number;
  failed_count: number;
  draft_count: number;
}
