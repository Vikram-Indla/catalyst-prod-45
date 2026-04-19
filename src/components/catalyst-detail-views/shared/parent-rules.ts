/**
 * CANONICAL — Parent linking rules per work item type.
 *
 * Defines which issue types can be parents in the AddParentPicker. All
 * relationships here are SINGLE-PARENT via ph_issues.parent_key (Jira
 * parity). Additional many-to-many relationships (e.g. Defect linked to
 * multiple Incidents) live in ph_issue_links and are outside this file.
 *
 * Rules (from Vikram, Apr 2026 — matches AddParentPicker parentSource):
 *   Story             → parent: Epic only             (parentSource='epic')
 *   Feature           → parent: Epic only             (parentSource='epic')
 *   Epic              → parent: Business Request      (parentSource='business_request')
 *   Defect (Bug)      → parent: Story / Epic / Feature
 *                                                       (parentSource='story_epic_feature')
 *   Task              → parent: Story / Epic / Feature (same as Defect)
 *                                                       (parentSource='story_epic_feature')
 *   Production Incident → parent: Story / Epic / Feature / Business Request
 *                                                       (parentSource='story_epic_feature_br')
 *   Subtask           → parent: Story only            (parentSource='story')
 *   Business Request  → parent: none (root of hierarchy)
 *
 * Only Production Incident and Epic can parent directly to a Business
 * Request — the BR itself lives in the MDT (ProductHub backlog) project
 * and is cross-project for all other callers.
 */
import type { CatalystItemType } from './types';

export interface ParentLinkRule {
  /** Issue type strings (Jira-format) allowed as parents in the picker */
  allowedParentTypes: string[];
  /** 'single' = one parent via parent_key. 'multi' = multiple links via ph_issue_links. */
  mode: 'single' | 'multi';
  /** Label shown in the picker header */
  pickerLabel: string;
  /** If true, query business_requests table instead of ph_issues */
  useBusinessRequests?: boolean;
}

export const PARENT_LINK_RULES: Record<CatalystItemType, ParentLinkRule> = {
  story: {
    allowedParentTypes: ['Epic', 'epic'],
    mode: 'single',
    pickerLabel: 'Parent (Epic)',
  },
  epic: {
    allowedParentTypes: ['Business Request', 'business request', 'Business_Request', 'business_request'],
    mode: 'single',
    pickerLabel: 'Parent (Business Request)',
    useBusinessRequests: true,
  },
  feature: {
    allowedParentTypes: ['Epic', 'epic'],
    mode: 'single',
    pickerLabel: 'Parent (Epic)',
  },
  defect: {
    allowedParentTypes: [
      'Story', 'story', 'Improvement', 'improvement',
      'Epic', 'epic',
      'Feature', 'feature', 'New Feature', 'new feature',
    ],
    mode: 'single',
    pickerLabel: 'Parent (Story / Epic / Feature)',
  },
  incident: {
    allowedParentTypes: [
      'Story', 'story', 'Improvement', 'improvement',
      'Epic', 'epic',
      'Feature', 'feature', 'New Feature', 'new feature',
      'Business Request', 'business request',
    ],
    mode: 'single',
    pickerLabel: 'Parent (Story / Epic / Feature / Business Request)',
  },
  task: {
    allowedParentTypes: [
      'Story', 'story', 'Improvement', 'improvement',
      'Epic', 'epic',
      'Feature', 'feature', 'New Feature', 'new feature',
    ],
    mode: 'single',
    pickerLabel: 'Parent (Story / Epic / Feature)',
  },
  subtask: {
    allowedParentTypes: ['Story', 'story'],
    mode: 'single',
    pickerLabel: 'Parent (Story)',
  },
  business_request: {
    allowedParentTypes: [],
    mode: 'single',
    pickerLabel: 'Parent',
  },
};
