/**
 * Create Task Modal - Catalyst Planner V9
 * Enterprise-grade modal with searchable dropdowns, team filtering
 * 
 * LEGACY WRAPPER: This file wraps the new V4 CreateTaskModal
 * for backward compatibility with existing consumers.
 */

import { CreateTaskModal as NewCreateTaskModal } from './CreateTaskModal/CreateTaskModal';
import type { TaskPriority, TaskStatus, PlannerUser, PlannerTeam } from '../types';

interface CreateTaskData {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  reporterId?: string;
  teamId?: string;
  linkedWorkItemId?: string;
  linkedWorkItemType?: string;
  startDate?: string;
  dueDate?: string;
  checklistItems?: Array<{ id: string; text: string; completed: boolean }>;
}

interface PlannerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateTaskData) => void;
  defaultStatus?: TaskStatus;
  defaultTeamId?: string;
  users?: PlannerUser[];
  teams?: PlannerTeam[];
  currentUserId?: string;
}

export function PlannerCreateModal({
  isOpen,
  onClose,
  onCreate,
  defaultStatus = 'backlog',
  defaultTeamId,
}: PlannerCreateModalProps) {
  return (
    <NewCreateTaskModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      defaultWorkstream={defaultTeamId}
      onSuccess={() => {
        // Note: The new modal handles its own create mutation
        // This callback is for any post-creation logic in the parent
      }}
    />
  );
}
