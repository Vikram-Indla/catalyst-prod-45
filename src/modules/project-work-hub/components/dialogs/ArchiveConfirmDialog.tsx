/**
 * ArchiveConfirmDialog — Atlaskit modal for archive / un-archive of a ph_issues row.
 *
 * BATCH-B Feature 3.
 *
 * Behavior:
 *   - Atlaskit-only UI (Modal, Button). No shadcn.
 *   - Archive    sets archived_at = now(), archived_by = auth.uid().
 *   - Un-archive sets archived_at = null,  archived_by = null.
 *   - RLS policy `archived_at_update_admin_owner` enforces admin/owner.
 *     A non-admin caller will receive a permission error from PostgREST;
 *     we surface it via toast.
 *   - Enqueues a write-back row (field_name = 'archive' | 'unarchive')
 *     via the canonical helper (no inline jira_write_back_queue insert).
 *   - Invalidates the lists that use archived_at on completion.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';

import { supabase } from '@/integrations/supabase/client';
import { enqueueWriteBack } from '@/lib/jira-writeback';
import { useAuth } from '@/hooks/useAuth';

export interface ArchiveConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  issue: {
    id: string;
    issue_key: string;
    summary: string;
  };
  /**
   * 'archive'   → set archived_at = now()
   * 'unarchive' → set archived_at = null
   */
  mode: 'archive' | 'unarchive';
  /** Called after a successful archive/un-archive. Use to close parent panels, etc. */
  onSuccess?: () => void;
}

export function ArchiveConfirmDialog({
  open,
  onClose,
  issue,
  mode,
  onSuccess,
}: ArchiveConfirmDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isArchive = mode === 'archive';
  const titleText = isArchive ? `Archive ${issue.issue_key}?` : `Restore ${issue.issue_key}?`;
  const ctaText = isArchive ? 'Archive' : 'Restore';
  const bodyText = isArchive
    ? 'This issue will be hidden from the board, backlog, and other default views. It can be restored later from the Archived filter.'
    : 'This issue will be restored to default views (board, backlog, panels).';

  const mutation = useMutation({
    mutationFn: async () => {
      const updates = isArchive
        ? { archived_at: new Date().toISOString(), archived_by: user?.id ?? null }
        : { archived_at: null, archived_by: null };

      const { error } = await (supabase
        .from('ph_issues') as any)
        .update(updates)
        .eq('id', issue.id);

      if (error) {
        // RLS rejection (non-admin/owner) lands here as a permission error.
        throw error;
      }

      // Best-effort write-back enqueue (field_name signals the operation).
      await enqueueWriteBack({
        phIssueId: issue.id,
        fieldName: isArchive ? 'archive' : 'unarchive',
        newValue: JSON.stringify({
          archived_at: isArchive ? new Date().toISOString() : null,
          actor: user?.id ?? null,
        }),
      });
    },
    onSuccess: () => {
      toast.success(isArchive ? `Archived ${issue.issue_key}` : `Restored ${issue.issue_key}`);

      // Invalidate every list/family that reads archived_at IS NULL.
      queryClient.invalidateQueries({ queryKey: ['kanban-issues'] });
      queryClient.invalidateQueries({ queryKey: ['board-cards'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-data'] });
      queryClient.invalidateQueries({ queryKey: ['requests-backlog'] });
      queryClient.invalidateQueries({ queryKey: ['for-you'] });
      queryClient.invalidateQueries({ queryKey: ['incident-hub'] });
      queryClient.invalidateQueries({ queryKey: ['defect-table'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      queryClient.invalidateQueries({ queryKey: ['resource360'] });
      queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', issue.id] });
      queryClient.invalidateQueries({ queryKey: ['ph-archived-issues'] });

      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg = err?.message ?? 'Operation failed';
      // PostgREST RLS denial typically returns code 42501 / "row-level security".
      if (
        msg.toLowerCase().includes('row-level security') ||
        err?.code === '42501' ||
        err?.code === 'PGRST301'
      ) {
        toast.error('You need admin or owner access on this project to archive or restore issues.');
      } else {
        toast.error(`Could not ${isArchive ? 'archive' : 'restore'}: ${msg}`);
      }
    },
    onSettled: () => setIsSubmitting(false),
  });

  return (
    <ModalTransition>
      {open && (
        <Modal onClose={onClose} width="small">
          <ModalHeader>
            <ModalTitle appearance={isArchive ? 'warning' : undefined}>{titleText}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.5 }}>
              <div style={{ marginBottom: 8, color: '#42526E' }}>
                <strong>{issue.issue_key}</strong> — {issue.summary}
              </div>
              {bodyText}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              appearance={isArchive ? 'warning' : 'primary'}
              isLoading={isSubmitting || mutation.isPending}
              onClick={() => {
                setIsSubmitting(true);
                mutation.mutate();
              }}
            >
              {ctaText}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default ArchiveConfirmDialog;
