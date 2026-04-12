/**
 * CANONICAL — Parent linking rules per work item type.
 *
 * Defines which issue types can be parents, and whether the relationship
 * is single-parent (like Jira's parent_key) or multi-link (stored in
 * ph_issue_links).
 *
 * Rules (from Vikram):
 *   Story     → parent: Epic or Feature (single)
 *   Epic      → parent: none currently (TBD)
 *   Feature   → parent: Epic (single)
 *   Defect    → linked to: Incident, Story, Feature (multi)
 *   Incident  → linked to: Story, Feature (multi)
 *   Task      → parent: Story (single)
 *   Subtask   → parent: Story (single, like Jira)
 *   Business Request → parent: TBD (none for now)
 */
import type { CatalystItemType } from './types';

export interface ParentLinkRule {
  /** Issue type strings (Jira-format) allowed as parents in the picker */
  allowedParentTypes: string[];
  /** 'single' = one parent via parent_key. 'multi' = multiple links via ph_issue_links. */
  mode: 'single' | 'multi';
  /** Label shown in the picker header */
  pickerLabel: string;
}

export const PARENT_LINK_RULES: Record<CatalystItemType, ParentLinkRule> = {
  story: {
    allowedParentTypes: ['Epic', 'epic', 'Feature', 'feature', 'New Feature', 'new feature'],
    mode: 'single',
    pickerLabel: 'Parent (Epic / Feature)',
  },
  epic: {
    allowedParentTypes: [],
    mode: 'single',
    pickerLabel: 'Parent',
  },
  feature: {
    allowedParentTypes: ['Epic', 'epic'],
    mode: 'single',
    pickerLabel: 'Parent (Epic)',
  },
  defect: {
    allowedParentTypes: ['Incident', 'incident', 'Production Incident', 'production incident', 'Story', 'story', 'Feature', 'feature', 'New Feature', 'new feature'],
    mode: 'multi',
    pickerLabel: 'Linked to (Incident / Story / Feature)',
  },
  incident: {
    allowedParentTypes: ['Story', 'story', 'Feature', 'feature', 'New Feature', 'new feature'],
    mode: 'multi',
    pickerLabel: 'Linked to (Story / Feature)',
  },
  task: {
    allowedParentTypes: ['Story', 'story'],
    mode: 'single',
    pickerLabel: 'Parent (Story)',
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
