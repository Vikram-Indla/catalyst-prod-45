/**
 * WorkflowViewerModal — thin wrapper over CatalystWorkflowModal.
 *
 * Formerly used the legacy WorkflowProvider; now delegates to CatalystWorkflowModal
 * which reads directly from ph_workflow_* (the same tables /admin/workflows manages).
 */
import React from 'react';
import { CatalystWorkflowModal } from '../workflow/CatalystWorkflowModal';
import type { WorkItemType } from '@/hooks/useTypeWorkflow';

interface WorkflowViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueType?: string | null;
  currentStatus?: string | null;
}

export function WorkflowViewerModal({
  isOpen, onClose, issueType, currentStatus,
}: WorkflowViewerModalProps) {
  if (!isOpen || !issueType) return null;

  return (
    <CatalystWorkflowModal
      issueTypeName={issueType as WorkItemType}
      currentStatusName={currentStatus ?? undefined}
      onClose={onClose}
    />
  );
}
