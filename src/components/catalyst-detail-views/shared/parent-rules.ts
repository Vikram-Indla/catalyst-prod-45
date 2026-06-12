/**
 * CANONICAL PARENT LINK RULES — Catalyst Work Item Hierarchy
 *
 * Source of truth for which issue types can be parents. Verified by Vikram
 * 2026-06-12. These are BUSINESS RULES — not implementation preferences.
 * Every surface that shows a parent picker, renders a parent icon, or validates
 * a parent relationship MUST derive from this file.
 *
 * Hierarchy summary:
 *
 *   Business Request  ← root (ProductHub, business_requests table, NOT ph_issues)
 *     └─ Epic  (parent → Business Request OR standalone)
 *          ├─ Feature  (parent → Epic only; children: Stories)
 *          │    └─ Story  (parent → Epic OR Feature)
 *          │         └─ [subtask-family]  (parent → Epic / Story / Task)
 *          ├─ Story  (parent → Epic OR Feature)
 *          ├─ Task  (parent → Story / Epic / Feature)
 *          ├─ QA Bug / Defect  (parent → Story / Epic / Feature)
 *          ├─ Change Request  (parent → Story / Epic / Business Request)
 *          ├─ Production Incident  (parent → Business Request / Epic / Feature)
 *          └─ Business Gap  (parent → Business Request / Epic / Feature)
 *
 * Subtask family (sit under Epic / Story / Task — NOT Feature):
 *   Sub-task, Backend, Frontend, Integration, API Requirement
 *
 * No-parent types (root or standalone):
 *   Business Request, Idea
 *
 * Relationships via ph_issue_links (many-to-many cross-references) are separate
 * from parent_key (single structural parent). This file governs parent_key only.
 */
import type { CatalystItemType } from './types';

export interface ParentLinkRule {
  /** Issue type strings (Jira-format) allowed as parents in the picker */
  allowedParentTypes: string[];
  /** 'single' = one parent via parent_key. 'multi' = multiple links via ph_issue_links. */
  mode: 'single' | 'multi';
  /** Label shown in the picker header */
  pickerLabel: string;
  /** If true, query business_requests table instead of ph_issues for BR parents */
  useBusinessRequests?: boolean;
}

export const PARENT_LINK_RULES: Record<CatalystItemType, ParentLinkRule> = {
  // ── Epic: parent is Business Request (cross-project) OR standalone ──
  epic: {
    allowedParentTypes: ['Business Request', 'business request', 'Business_Request', 'business_request'],
    mode: 'single',
    pickerLabel: 'Parent (Business Request)',
    useBusinessRequests: true,
  },

  // ── Feature: Epic only. Feature acts like a mini-Epic; its children are Stories. ──
  feature: {
    allowedParentTypes: ['Epic', 'epic'],
    mode: 'single',
    pickerLabel: 'Parent (Epic)',
  },

  // ── Story: Epic or Feature ──
  story: {
    allowedParentTypes: ['Epic', 'epic', 'Feature', 'feature', 'New Feature', 'new feature'],
    mode: 'single',
    pickerLabel: 'Parent (Epic / Feature)',
  },

  // ── Task: Story, Epic, or Feature ──
  task: {
    allowedParentTypes: [
      'Story', 'story', 'Improvement', 'improvement',
      'Epic', 'epic',
      'Feature', 'feature', 'New Feature', 'new feature',
    ],
    mode: 'single',
    pickerLabel: 'Parent (Story / Epic / Feature)',
  },

  // ── Defect (QA Bug): Story, Epic, or Feature ──
  defect: {
    allowedParentTypes: [
      'Story', 'story', 'Improvement', 'improvement',
      'Epic', 'epic',
      'Feature', 'feature', 'New Feature', 'new feature',
    ],
    mode: 'single',
    pickerLabel: 'Parent (Story / Epic / Feature)',
  },

  // ── Production Incident: Business Request, Epic, or Feature (NOT Story) ──
  incident: {
    allowedParentTypes: [
      'Business Request', 'business request',
      'Epic', 'epic',
      'Feature', 'feature', 'New Feature', 'new feature',
    ],
    mode: 'single',
    pickerLabel: 'Parent (Business Request / Epic / Feature)',
    useBusinessRequests: true,
  },

  // ── Subtask: Story only ──
  subtask: {
    allowedParentTypes: ['Story', 'story'],
    mode: 'single',
    pickerLabel: 'Parent (Story)',
  },

  // ── Business Request: root — no parent ──
  business_request: {
    allowedParentTypes: [],
    mode: 'single',
    pickerLabel: 'Parent',
  },

  // ── Idea: no structural parent ──
  idea: {
    allowedParentTypes: [],
    mode: 'single',
    pickerLabel: 'Parent',
  },
};

/**
 * SUBTASK-FAMILY types — sit under Epic, Story, or Task (NOT Feature).
 * These are implementation-level work items: Backend, Frontend, Integration,
 * API Requirement, Sub-task. They do NOT have the hierarchy weight of a Story.
 */
export const SUBTASK_FAMILY_TYPES = [
  'Sub-task',
  'sub-task',
  'subtask',
  'Backend',
  'backend',
  'Frontend',
  'frontend',
  'Integration',
  'integration',
  'API Requirement',
  'api requirement',
  'BRD Task',
  'brd task',
  'Figma',
  'figma',
] as const;

export type SubtaskFamilyType = typeof SUBTASK_FAMILY_TYPES[number];

/** Allowed parents for any subtask-family type. */
export const SUBTASK_FAMILY_PARENT_TYPES = [
  'Epic', 'epic',
  'Story', 'story', 'Improvement', 'improvement',
  'Task', 'task',
] as const;

/**
 * CHANGE REQUEST parent rules (separate from CatalystItemType because
 * Change Request is not modelled as its own CatalystItemType key yet).
 * Parent can be: Story, Epic, OR Business Request.
 */
export const CHANGE_REQUEST_PARENT_RULE: ParentLinkRule = {
  allowedParentTypes: [
    'Story', 'story', 'Improvement', 'improvement',
    'Epic', 'epic',
    'Business Request', 'business request',
  ],
  mode: 'single',
  pickerLabel: 'Parent (Story / Epic / Business Request)',
  useBusinessRequests: true,
};

/**
 * BUSINESS GAP parent rules.
 * Parent can be: Business Request, Epic, OR Feature.
 */
export const BUSINESS_GAP_PARENT_RULE: ParentLinkRule = {
  allowedParentTypes: [
    'Business Request', 'business request',
    'Epic', 'epic',
    'Feature', 'feature', 'New Feature', 'new feature',
  ],
  mode: 'single',
  pickerLabel: 'Parent (Business Request / Epic / Feature)',
  useBusinessRequests: true,
};

/** Returns true if the given type string is in the subtask family. */
export function isSubtaskFamily(issueType: string): boolean {
  const t = (issueType || '').toLowerCase().trim();
  return SUBTASK_FAMILY_TYPES.some(f => f.toLowerCase() === t);
}
