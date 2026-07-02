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

/**
 * BUSINESS REQUEST SUBTASK CATEGORIES (2026-06-15, Vikram).
 *
 * The 5 subtask categories a Business Request can contain. These are
 * Catalyst-native (NOT in Jira) and persist to catalyst_issues with
 * parent_key = the BR request_key. Scoped to the Product-Hub BR detail
 * view via SubtasksPanel.childTypeOverride — they do NOT alter the
 * canonical ALLOWED_CHILD_TYPES['Business Request'] = ['Epic'] mapping
 * used by the ph_issues hierarchy (Q1, scoped to MDT BRs only).
 */
export const BUSINESS_REQUEST_SUBTASK_TYPES = [
  'BRD Task',
  'Business Gap',
  'Change Request',
  'UAT Finding',
  'Figma',
] as const;

/** Returns true if the given type string is in the subtask family. */
export function isSubtaskFamily(issueType: string): boolean {
  const t = (issueType || '').toLowerCase().trim();
  return SUBTASK_FAMILY_TYPES.some(f => f.toLowerCase() === t);
}

/**
 * Canonical Jira type names for the subtask family (no lowercase variants).
 * Used in ALLOWED_CHILD_TYPES and type pickers.
 */
export const SUBTASK_FAMILY_CANONICAL_TYPES = [
  'Sub-task',
  'Backend',
  'Frontend',
  'Figma',
  'Integration',
  'API Requirement',
] as const;

/**
 * ALLOWED_CHILD_TYPES — Inverse of parent link rules.
 *
 * Given a parent issue type, returns the canonical set of child types that
 * can be created under it. Used by SubtasksPanel, inline create, and Kanban
 * child pickers. Every surface that controls "what can I create under X"
 * MUST derive from this map — never hardcode type lists.
 *
 * Canonical rule summary (confirmed Vikram 2026-06-12):
 *   Business Request → [Epic]
 *   Epic → [Feature, Story, Task, QA Bug, Change Request, Production Incident,
 *           Business Gap, + subtask family]
 *   Feature → [Story]
 *   Story / Task / QA Bug / Change Request / Production Incident → [subtask family]
 *   Business Gap / subtask family / Idea → []  (leaf — no children)
 */
export const ALLOWED_CHILD_TYPES: Record<string, string[]> = {
  'Business Request': ['Epic'],

  // Grandparent — Epic spawns child work items only (Story, Task, Bug,
  // etc.), never subtasks directly. Subtasks live under fathers
  // (Story/Task/QA Bug/…), NOT under grandparents. Vikram 2026-07-02.
  'Epic': [
    'Feature',
    'Story',
    'Task',
    'QA Bug',
    'Change Request',
    'Production Incident',
    'Business Gap',
  ],

  // Feature is a mini-Epic; its children are Stories only.
  'Feature': ['Story'],
  'New Feature': ['Story'],

  // Story-level types → subtask family
  'Story': [...SUBTASK_FAMILY_CANONICAL_TYPES],
  'Improvement': [...SUBTASK_FAMILY_CANONICAL_TYPES],
  'Task': [...SUBTASK_FAMILY_CANONICAL_TYPES],
  'QA Bug': [...SUBTASK_FAMILY_CANONICAL_TYPES],
  'Change Request': [...SUBTASK_FAMILY_CANONICAL_TYPES],
  'Production Incident': [...SUBTASK_FAMILY_CANONICAL_TYPES],

  // Leaf types — no children allowed
  'Business Gap': [],
  'Sub-task': [],
  'Backend': [],
  'Frontend': [],
  'Figma': [],
  'Integration': [],
  'API Requirement': [],
  'BRD Task': [],
  'Idea': [],
};

/**
 * getAllowedChildTypes — case-insensitive lookup into ALLOWED_CHILD_TYPES.
 * Returns [] for unknown types (safe default — no creation permitted).
 */
export function getAllowedChildTypes(parentType: string | null | undefined): string[] {
  if (!parentType) return [];
  const key = Object.keys(ALLOWED_CHILD_TYPES).find(
    k => k.toLowerCase() === parentType.trim().toLowerCase(),
  );
  return key ? ALLOWED_CHILD_TYPES[key] : [];
}

/**
 * CANONICAL ParentSource VALUES — used by AddParentPicker and CatalystViewBase.
 *
 * Each variant controls which issue types appear in the parent picker:
 *   'epic'               → Epic only (Feature, Story parents)
 *   'business_request'   → Business Request only (Epic parents)
 *   'story'              → Story only (subtask-family parents)
 *   'story_epic_feature' → Story / Epic / Feature (Task, QA Bug parents)
 *   'br_epic_feature'    → Business Request / Epic / Feature
 *                          (Production Incident, Business Gap parents — NOT Story)
 *   'story_epic_br'      → Story / Epic / Business Request
 *                          (Change Request parents — NOT Feature)
 *   'story_epic_feature_br' → Story / Epic / Feature / Business Request (legacy)
 */
export type ParentSource =
  | 'epic'
  | 'business_request'
  | 'story'
  | 'story_epic_feature'
  | 'br_epic_feature'
  | 'story_epic_br'
  | 'story_epic_feature_br';

/**
 * getParentSourceForType — maps a Jira issue_type string to the correct
 * ParentSource for AddParentPicker. Use when the caller only knows the type.
 */
export function getParentSourceForType(issueType: string | undefined): ParentSource {
  switch ((issueType ?? '').toLowerCase().trim()) {
    case 'epic':
      return 'business_request';
    case 'feature':
    case 'new feature':
      return 'epic';
    case 'story':
    case 'improvement':
      return 'epic';
    case 'task':
    case 'qa bug':
    case 'bug':
    case 'defect':
      return 'story_epic_feature';
    case 'production incident':
    case 'business gap':
      return 'br_epic_feature';
    case 'change request':
      return 'story_epic_br';
    case 'sub-task':
    case 'subtask':
    case 'backend':
    case 'frontend':
    case 'figma':
    case 'integration':
    case 'api requirement':
    case 'brd task':
      return 'story';
    default:
      return 'epic';
  }
}
