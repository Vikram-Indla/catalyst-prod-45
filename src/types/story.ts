/**
 * Story Types for Create Story Modal
 */

export interface CreateStoryInput {
  title: string;
  description: string | null;
  feature_id: string;
  release_id: string | null;
  change_number_id: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner_id: string | null;
  acceptance_criteria: string[];
  subtasks: SubtaskInput[];
}

export interface SubtaskInput {
  title: string;
  type: 'frontend' | 'backend' | 'integration' | 'figma';
  assignee_id?: string;
  release_id?: string;
}

export interface AcceptanceCriterion {
  id: string;
  story_id: string;
  content: string;
  is_met: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type StoryPriority = 'critical' | 'high' | 'medium' | 'low';
export type SubtaskType = 'frontend' | 'backend' | 'integration' | 'figma';

export const SUBTASK_TYPES = [
  { type: 'frontend' as const, label: 'Frontend', icon: 'Palette', color: 'var(--ds-background-information-bold, #3b82f6)', bgColor: 'var(--ds-background-information-bold, rgba(59, 130, 246, 0.1))' },
  { type: 'backend' as const, label: 'Backend', icon: 'Server', color: 'var(--ds-chart-teal-bold, #0d9488)', bgColor: 'var(--ds-background-success, rgba(13, 148, 136, 0.15))' },
  { type: 'integration' as const, label: 'Integration', icon: 'Plug', color: 'var(--ds-background-warning-bold, #f59e0b)', bgColor: 'var(--ds-background-warning-bold, rgba(245, 158, 11, 0.1))' },
  { type: 'figma' as const, label: 'Figma', icon: 'Figma', color: '#a259ff', bgColor: 'rgba(162, 89, 255, 0.12)' },
] as const;

/** @deprecated Use CATALYST_PRIORITY_OPTIONS from '@/lib/catalyst-priority' instead. */
export { CATALYST_PRIORITY_OPTIONS as PRIORITY_OPTIONS } from '@/lib/catalyst-priority';
