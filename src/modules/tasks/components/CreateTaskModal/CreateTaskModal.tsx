/**
 * Create Task Modal — Slice 9C (CAT-TASKS-20260627-001)
 *
 * The bespoke hand-rolled task form is RETIRED. Task creation now uses the
 * single canonical create-issue modal (CreateStoryModal) defaulted to the
 * 'Task' work type: Workstream replaces Project, the form writes to the
 * `tasks` table, and on create it navigates to the task detail. The work-type
 * dropdown still lists the other issue types (Task is just the default).
 *
 * This file is a thin compatibility wrapper so every existing call site keeps
 * working unchanged — the caller contract {open, onOpenChange, defaultWorkstream,
 * onSuccess} is preserved verbatim.
 */
import { CreateStoryModal } from '@/components/workhub/create-story';

// ============================================================================
// Public API (callers' contract — DO NOT CHANGE)
// ============================================================================

export interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWorkstream?: string;
  onSuccess?: (taskKey: string) => void;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  defaultWorkstream,
  onSuccess,
}: CreateTaskModalProps) {
  return (
    <CreateStoryModal
      open={open}
      onClose={() => onOpenChange(false)}
      defaultWorkType="Task"
      defaultWorkstreamId={defaultWorkstream}
      onSuccess={onSuccess}
    />
  );
}

export default CreateTaskModal;
