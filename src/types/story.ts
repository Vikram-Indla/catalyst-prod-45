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
  type: 'frontend' | 'backend' | 'integration' | 'technical';
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
export type SubtaskType = 'frontend' | 'backend' | 'integration' | 'technical';

export const SUBTASK_TYPES = [
  { type: 'frontend' as const, label: 'Frontend', icon: 'Palette', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  { type: 'backend' as const, label: 'Backend', icon: 'Server', color: '#5c7c5c', bgColor: 'rgba(92, 124, 92, 0.15)' },
  { type: 'integration' as const, label: 'Integration', icon: 'Plug', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  { type: 'technical' as const, label: 'Technical', icon: 'Cog', color: '#8b7355', bgColor: 'rgba(139, 115, 85, 0.15)' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: '#ef4444' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'medium', label: 'Medium', color: '#3b82f6' },
  { value: 'low', label: 'Low', color: '#737373' },
] as const;
