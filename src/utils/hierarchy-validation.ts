/**
 * Hierarchy Validation Utilities
 * 
 * Enforces the Program-Project hierarchy rules:
 * 1. Every Project MUST have a Program
 * 2. If no Program selected → Auto-create "Default" Program
 * 3. Epics live at Program level
 * 4. Projects inherit Epics from their Program
 * 5. Features link to Epics
 * 6. Stories link to Features
 * 7. Subtasks must have parent (Story or Task)
 */

import type {
  Program,
  Project,
  Epic,
  Feature,
  Story,
  Subtask,
  ProjectCreate,
  FeatureCreate,
  SubtaskCreate,
  EpicCreate,
} from '@/types/hierarchy.types';

export class HierarchyValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message);
    this.name = 'HierarchyValidationError';
  }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Rule 1: Project must have Program
 */
export function validateProject(project: Project | ProjectCreate): boolean {
  if (!project.programId) {
    throw new HierarchyValidationError(
      'Project must be linked to a Program',
      'programId',
      'PROJECT_REQUIRES_PROGRAM'
    );
  }
  return true;
}

/**
 * Rule 2: Feature must have Epic
 */
export function validateFeature(feature: Feature | FeatureCreate): boolean {
  if (!feature.epicId) {
    throw new HierarchyValidationError(
      'Feature must be linked to an Epic',
      'epicId',
      'FEATURE_REQUIRES_EPIC'
    );
  }
  if (!feature.projectId) {
    throw new HierarchyValidationError(
      'Feature must be linked to a Project',
      'projectId',
      'FEATURE_REQUIRES_PROJECT'
    );
  }
  return true;
}

/**
 * Rule 3: Subtask must have Parent (Story or Task)
 */
export function validateSubtask(subtask: Subtask | SubtaskCreate): boolean {
  if (!subtask.parentId) {
    throw new HierarchyValidationError(
      'Subtask must have a parent Story or Task',
      'parentId',
      'SUBTASK_REQUIRES_PARENT'
    );
  }
  if (!subtask.parentType || !['story', 'task'].includes(subtask.parentType)) {
    throw new HierarchyValidationError(
      'Subtask parent type must be "story" or "task"',
      'parentType',
      'SUBTASK_INVALID_PARENT_TYPE'
    );
  }
  return true;
}

/**
 * Rule 4: Epic must be in Program
 */
export function validateEpic(epic: Epic | EpicCreate): boolean {
  if (!epic.programId) {
    throw new HierarchyValidationError(
      'Epic must be linked to a Program',
      'programId',
      'EPIC_REQUIRES_PROGRAM'
    );
  }
  return true;
}

/**
 * Rule 5: Story should have Feature (optional but recommended)
 */
export function validateStory(story: Story): boolean {
  // Stories can be standalone, but we can warn if not linked
  if (!story.projectId) {
    throw new HierarchyValidationError(
      'Story must be linked to a Project',
      'projectId',
      'STORY_REQUIRES_PROJECT'
    );
  }
  return true;
}

// ============================================
// DEFAULT PROGRAM UTILITIES
// ============================================

const DEFAULT_PROGRAM_KEY = 'DEFAULT';
const DEFAULT_PROGRAM_NAME = 'Default Program';

/**
 * Rule 5: Auto-create Default Program configuration
 */
export function getDefaultProgramConfig(): Omit<Program, 'id' | 'createdAt' | 'updatedAt' | 'projects' | 'epics' | 'lead'> {
  return {
    key: DEFAULT_PROGRAM_KEY,
    name: DEFAULT_PROGRAM_NAME,
    description: 'Default program for projects without a specific program',
    leadId: null,
    isDefault: true,
    status: 'active',
  };
}

/**
 * Check if a program is the default program
 */
export function isDefaultProgram(program: Program): boolean {
  return program.isDefault === true || program.key === DEFAULT_PROGRAM_KEY;
}

// ============================================
// HIERARCHY RELATIONSHIP VALIDATORS
// ============================================

/**
 * Validate that a Feature's Epic belongs to the same Program as the Project
 */
export function validateFeatureEpicProgram(
  feature: { projectId: string; epicId: string },
  projectProgramId: string,
  epicProgramId: string
): boolean {
  if (projectProgramId !== epicProgramId) {
    throw new HierarchyValidationError(
      'Feature\'s Epic must belong to the same Program as the Project',
      'epicId',
      'FEATURE_EPIC_PROGRAM_MISMATCH'
    );
  }
  return true;
}

/**
 * Validate parent-child relationship for subtasks
 */
export function validateSubtaskParent(
  subtaskProjectId: string,
  parentProjectId: string
): boolean {
  if (subtaskProjectId !== parentProjectId) {
    throw new HierarchyValidationError(
      'Subtask must be in the same Project as its parent',
      'projectId',
      'SUBTASK_PROJECT_MISMATCH'
    );
  }
  return true;
}

// ============================================
// BULK VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: HierarchyValidationError[];
}

/**
 * Validate multiple items and collect all errors
 */
export function validateAll<T>(
  items: T[],
  validator: (item: T) => boolean
): ValidationResult {
  const errors: HierarchyValidationError[] = [];
  
  for (const item of items) {
    try {
      validator(item);
    } catch (error) {
      if (error instanceof HierarchyValidationError) {
        errors.push(error);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// HIERARCHY HELPERS
// ============================================

/**
 * Get the full hierarchy path for an issue
 */
export function getHierarchyPath(issue: {
  type: string;
  programKey?: string;
  projectKey?: string;
  epicKey?: string;
  featureKey?: string;
  parentKey?: string;
}): string[] {
  const path: string[] = [];
  
  if (issue.programKey) path.push(issue.programKey);
  if (issue.projectKey) path.push(issue.projectKey);
  if (issue.epicKey) path.push(issue.epicKey);
  if (issue.featureKey) path.push(issue.featureKey);
  if (issue.parentKey) path.push(issue.parentKey);
  
  return path;
}

/**
 * Check if an issue type can be a child of another type
 */
export function canBeChildOf(
  childType: string,
  parentType: string
): boolean {
  const validRelationships: Record<string, string[]> = {
    feature: ['epic'],
    story: ['feature'],
    task: ['story'],
    subtask: ['story', 'task'],
  };
  
  return validRelationships[childType]?.includes(parentType) ?? false;
}

/**
 * Check if an issue type can have children
 */
export function canHaveChildren(issueType: string): boolean {
  return ['epic', 'feature', 'story', 'task'].includes(issueType);
}

/**
 * Get allowed child types for an issue type
 */
export function getAllowedChildTypes(issueType: string): string[] {
  const childTypes: Record<string, string[]> = {
    epic: ['feature'],
    feature: ['story'],
    story: ['subtask', 'task'],
    task: ['subtask'],
  };
  
  return childTypes[issueType] ?? [];
}
