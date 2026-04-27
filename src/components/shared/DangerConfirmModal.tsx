/**
 * DangerConfirmModal — canonical destructive-confirmation dialog.
 *
 * ═════════════════════════════════════════════════════════════════════
 * Apr 27, 2026 (L53). One source of truth for "Are you sure you want to
 * permanently delete this thing?" prompts across Catalyst — modeled on
 * Jira's exact list-view delete pattern (probed via /jira-compare on
 * https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list):
 *
 *   ┌─────────────────────────────────────────────┐
 *   │  ⓘ  Delete N work items?            ✕      │
 *   ├─────────────────────────────────────────────┤
 *   │  You're about to permanently delete this N  │
 *   │  work item, its comments and attachments,   │
 *   │  and all of its data. This is irreversible. │
 *   │                                             │
 *   │  If you're not sure, you can resolve or     │
 *   │  close this issue instead.                  │
 *   │                                             │
 *   │  Type **delete** to continue                │
 *   │  ┌─────────────────────────────────────┐    │
 *   │  │ delete                              │    │
 *   │  └─────────────────────────────────────┘    │
 *   ├─────────────────────────────────────────────┤
 *   │                  [ Cancel ]  [ Delete ]     │
 *   └─────────────────────────────────────────────┘
 *
 * The phrase-typing gate is THE thing that makes Jira's pattern feel
 * intentional — without it the Delete button is a single misclick away
 * from data loss. Confirm phrase defaults to "delete"; pass any other
 * phrase via the `confirmPhrase` prop (e.g., the project key for nuking
 * an entire project).
 *
 * Usage:
 *   <DangerConfirmModal
 *     isOpen={isOpen}
 *     onClose={() => setOpen(false)}
 *     title="Delete 3 work items?"
 *     description="You're about to permanently delete..."
 *     hint="If you're not sure, you can close instead."
 *     confirmPhrase="delete"
 *     confirmLabel="Delete"
 *     onConfirm={() => deleteMutation.mutate()}
 *     isLoading={deleteMutation.isPending}
 *   />
 *
 * Atlaskit primitives only:
 *   - @atlaskit/modal-dialog   (Modal + Header + Body + Footer)
 *   - @atlaskit/button         (Cancel + Delete buttons)
 *   - @atlaskit/textfield      (confirmation input)
 *   - @atlaskit/tokens         (color tokens for hint copy)
 *
 * Replaces:
 *   - shadcn AlertDialog usages (banned by jira-compare skill mandate)
 *   - bespoke `<Modal>...</Modal>` blocks that re-implement this UX
 *     ad-hoc per page (BacklogPage had two — single-item + bulk).
 *
 * Sweep targets (other delete sites that should adopt this — see
 * /jira-compare lessons L53):
 *   - StoryDetailModal.tsx     (single-issue delete in detail rail)
 *   - InitiativeDetailPanel    (initiative delete)
 *   - SubtasksPanel            (subtask delete)
 *   - AllProjectsTable         (project delete)
 *   - PlanLibrary              (plan delete)
 *   - SavedReportsList         (report delete)
 *   - KeyResultsTabV2          (key-result delete)
 *   - MilestonesViewTab        (milestone delete)
 *   - ColumnsSetupTab          (kanban column delete)
 * ═════════════════════════════════════════════════════════════════════
 */

import { useEffect, useId, useRef, useState } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';

export interface DangerConfirmModalProps {
  /** Whether the modal is open. */
  isOpen: boolean;
  /** Called when the user dismisses (Cancel button, X, Esc, backdrop). */
  onClose: () => void;
  /** Called when the user confirms. Wire your delete mutation here. */
  onConfirm: () => void;
  /** Title of the modal — e.g., "Delete 3 work items?". */
  title: string;
  /**
   * Primary description copy. Shown as the first paragraph.
   * Default mirrors Jira:
   *   "You're about to permanently delete this work item, its comments
   *    and attachments, and all of its data. This is irreversible."
   */
  description?: string;
  /**
   * Optional secondary hint — Jira's pattern shows a softer alternative:
   *   "If you're not sure, you can resolve or close this issue instead."
   */
  hint?: string;
  /**
   * Phrase the user must type to enable the danger button. Defaults to
   * "delete" (case-insensitive). Override for higher-risk actions:
   * project deletes might require typing the project key.
   */
  confirmPhrase?: string;
  /** Label on the danger button. Default: "Delete". */
  confirmLabel?: string;
  /** Spinner on the danger button while the mutation is in-flight. */
  isLoading?: boolean;
  /**
   * If true, the user can confirm without typing the phrase
   * (low-risk actions). Default false — gating ON is the safe default.
   */
  skipPhraseGate?: boolean;
}

const DEFAULT_DESCRIPTION =
  "You're about to permanently delete this work item, its comments and attachments, and all of its data. This is irreversible.";

const DEFAULT_HINT =
  "If you're not sure, you can resolve or close this issue instead.";

export function DangerConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description = DEFAULT_DESCRIPTION,
  hint = DEFAULT_HINT,
  confirmPhrase = 'delete',
  confirmLabel = 'Delete',
  isLoading = false,
  skipPhraseGate = false,
}: DangerConfirmModalProps) {
  const [typedPhrase, setTypedPhrase] = useState('');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset the typed phrase whenever the modal closes or reopens. Without
  // this, a re-opened modal can show "delete" already typed — a common
  // foot-gun.
  useEffect(() => {
    if (!isOpen) setTypedPhrase('');
  }, [isOpen]);

  // Focus the input on open so the user can start typing immediately.
  useEffect(() => {
    if (isOpen && !skipPhraseGate) {
      // Atlaskit's Modal mounts via portal — defer focus until next tick.
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen, skipPhraseGate]);

  const phraseMatches =
    skipPhraseGate ||
    typedPhrase.trim().toLowerCase() === confirmPhrase.trim().toLowerCase();

  const handleConfirm = () => {
    if (!phraseMatches || isLoading) return;
    onConfirm();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} shouldScrollInViewport width="small">
          <ModalHeader>
            <ModalTitle appearance="danger">{title}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: token('color.text', '#172B4D') }}>
              {description}
            </p>
            {hint ? (
              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  fontSize: 13,
                  lineHeight: '18px',
                  color: token('color.text.subtle', '#42526E'),
                }}
              >
                {hint}
              </p>
            ) : null}
            {!skipPhraseGate && (
              <div style={{ marginTop: 16 }}>
                <label
                  htmlFor={inputId}
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: token('color.text', '#172B4D'),
                    marginBottom: 6,
                  }}
                >
                  Type <strong>{confirmPhrase}</strong> to continue
                </label>
                <Textfield
                  id={inputId}
                  ref={inputRef}
                  value={typedPhrase}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTypedPhrase(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter' && phraseMatches && !isLoading) {
                      e.preventDefault();
                      handleConfirm();
                    }
                  }}
                  isCompact
                  autoComplete="off"
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose} isDisabled={isLoading}>
              Cancel
            </Button>
            <Button
              appearance="danger"
              onClick={handleConfirm}
              isDisabled={!phraseMatches || isLoading}
              isLoading={isLoading}
            >
              {confirmLabel}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
