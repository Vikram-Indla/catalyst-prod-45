/**
 * Status Mapping Layer for Project Work Hub
 * 
 * This maps board column statuses to valid database enum values:
 * - feature_status: funnel | analyzing | backlog | implementing | done
 * - story_status: todo | in_progress | done
 */

// Valid feature status enum values
export type FeatureStatusEnum = 'funnel' | 'analyzing' | 'backlog' | 'implementing' | 'done';

// Valid story status enum values
export type StoryStatusEnum = 'todo' | 'in_progress' | 'done';

// Board column to feature status mapping
export const BOARD_TO_FEATURE_STATUS: Record<string, FeatureStatusEnum> = {
  // TODO columns
  'open': 'backlog',
  'new': 'funnel',
  'backlog': 'backlog',
  'assigned': 'backlog',
  'funnel': 'funnel',
  'analyzing': 'analyzing',
  
  // IN_PROGRESS columns
  'in_development': 'implementing',
  'in_progress': 'implementing',
  'in_qa': 'implementing',
  'testing': 'implementing',
  'qa_pass': 'implementing',
  'qa_fail': 'implementing',
  'in_uat': 'implementing',
  'uat_testing': 'implementing',
  'implementing': 'implementing',
  
  // DONE columns
  'done': 'done',
  'closed': 'done',
  'resolved': 'done',
};

// Board column to story status mapping
export const BOARD_TO_STORY_STATUS: Record<string, StoryStatusEnum> = {
  // TODO columns
  'open': 'todo',
  'new': 'todo',
  'backlog': 'todo',
  'assigned': 'todo',
  'todo': 'todo',
  
  // IN_PROGRESS columns
  'in_development': 'in_progress',
  'in_progress': 'in_progress',
  'in_qa': 'in_progress',
  'testing': 'in_progress',
  'qa_pass': 'in_progress',
  'qa_fail': 'in_progress',
  'in_uat': 'in_progress',
  'uat_testing': 'in_progress',
  
  // DONE columns
  'done': 'done',
  'closed': 'done',
  'resolved': 'done',
};

/**
 * Map a board column status to a valid feature status enum
 */
export function mapToFeatureStatus(columnStatus: string): FeatureStatusEnum {
  const mapped = BOARD_TO_FEATURE_STATUS[columnStatus.toLowerCase()];
  return mapped || 'backlog'; // Default to backlog if not found
}

/**
 * Map a board column status to a valid story status enum
 */
export function mapToStoryStatus(columnStatus: string): StoryStatusEnum {
  const mapped = BOARD_TO_STORY_STATUS[columnStatus.toLowerCase()];
  return mapped || 'todo'; // Default to todo if not found
}

/**
 * Check if a status is a valid feature status enum value
 */
export function isValidFeatureStatus(status: string): status is FeatureStatusEnum {
  return ['funnel', 'analyzing', 'backlog', 'implementing', 'done'].includes(status);
}

/**
 * Check if a status is a valid story status enum value
 */
export function isValidStoryStatus(status: string): status is StoryStatusEnum {
  return ['todo', 'in_progress', 'done'].includes(status);
}
