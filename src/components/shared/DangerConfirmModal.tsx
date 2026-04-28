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
 * Apr 28, 2026 (jira-compare cycle / D1 RCA — Row-actions Delete no-op).
 *   Implementation switched from `@atlaskit/modal-dialog` to a bespoke
 *   `createPortal`-to-`document.body` modal because the Atlaskit Modal
 *   commits an EMPTY `.atlaskit-portal` div on this surface. Same family
 *   of bug as CLAUDE.md L1 (DropdownMenu portal mount race) and the
 *   pre-existing `addPeopleOpen` workaround at BacklogPage.atlaskit.tsx
 *   line ~2865 ("Add people modal — @atlaskit/modal-dialog rendered an
 *   empty portal on this surface (L21)"). Probe evidence:
 *     • React fiber tree commits the full Modal subtree
 *       (ModalTransition2 → ExitingPersistence → ModalWrapper →
 *        Layering2 → LevelProvider2 → Portal → InternalPortal →
 *        ThemeProvider → FadeIn2 → ModalDialog2 → section →
 *        ModalHeader2 / ModalBody2 / ModalFooter2 → ModalTitle2 → h1)
 *     • DOM `.atlaskit-portal-container` had 2 `.atlaskit-portal`
 *       children; both with `descendants: 0`, `outerHTMLLen ≈ 59`
 *       (literally empty `<div class="atlaskit-portal"></div>`).
 *     • Visible symptom: Delete menu item closes the menu but no
 *       confirm dialog appears, no fetch fires, row stays.
 *   Public API (props, behaviour) is unchanged so every consumer still
 *   compiles. Visuals mirror Atlaskit's `<Modal width="small">` +
 *   `<ModalTitle appearance="danger">` via `@atlaskit/tokens` so the
 *   look is indistinguishable from the broken implementation.
 *
 * Atlaskit primitives used:
 *   - @atlaskit/button         (Cancel + Delete buttons — no portal)
 *   - @atlaskit/textfield      (confirmation input — no portal)
 *   - @atlaskit/tokens         (color tokens for surface + text)
 *   - createPortal             (manual portal-to-body, replaces
 *                               @atlaskit/modal-dialog)
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
import { createPortal } from 'react-dom';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';

export interface DangerConfirmModalProps {
  /** Whether the modal is open. */
  isOpen: boolean;
  /** Called when the user dismisses (Cancel button, X, Esc). */
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
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset the typed phrase whenever the modal closes or reopens. Without
  // this, a re-opened modal can show "delete" already typed — a common
  // foot-gun.
  useEffect(() => {
    if (!isOpen) setTypedPhrase('');
  }, [isOpen]);

  // Focus the input on open so the user can start typing immediately.
  // Defer to next tick so the createPortal node is in the DOM first.
  useEffect(() => {
    if (isOpen && !skipPhraseGate) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen, skipPhraseGate]);

  // Esc-to-close. Backdrop click does NOT dismiss — matches the
  // pre-existing Add people modal pattern at BacklogPage.atlaskit.tsx
  // (intentional: a destructive dialog should require an explicit
  // Cancel/X dismiss).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, isLoading, onClose]);

  const phraseMatches =
    skipPhraseGate ||
    typedPhrase.trim().toLowerCase() === confirmPhrase.trim().toLowerCase();

  const handleConfirm = () => {
    if (!phraseMatches || isLoading) return;
    onConfirm();
  };

  if (!isOpen) return null;
  // SSR safety: createPortal needs a real document.
  if (typeof document === 'undefined') return null;

  // ── Visual conventions mirror @atlaskit/modal-dialog `<Modal width="small">`:
  //    - 400px content width on desktop (Atlaskit's "small" breakpoint)
  //    - 8px corner radius, layered shadow, white surface
  //    - Backdrop tint #091E4226 (rgba(9, 30, 66, 0.54))
  //    - Title appearance="danger" → red TitleIcon (left-side circle/exclamation)
  //    - Header / Body / Footer 24px horizontal padding, 20/12/24px vertical
  return createPortal(
    <div
      // Backdrop (intentionally NOT clickable to dismiss — see comment above).
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9, 30, 66, 0.54)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="danger-confirm-modal"
        style={{
          width: 400,
          maxWidth: 'calc(100vw - 48px)',
          background: token('elevation.surface.overlay', '#FFFFFF'),
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 120px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — title with danger icon (mirrors ModalTitle appearance="danger") */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '24px 24px 8px',
          }}
        >
          {/* Red exclamation icon (Atlaskit's danger TitleIcon equivalent).
              Inline SVG keeps us off the lucide dep here so this component
              stays drop-in for any consumer. 24×24, danger-bold token. */}
          <span
            aria-hidden="true"
            style={{
              flex: '0 0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              color: token('color.icon.danger', '#C9372C'),
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="currentColor" />
              <path
                d="M12 6.75v6"
                stroke={token('color.text.inverse', '#FFFFFF')}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16.25" r="1.1" fill={token('color.text.inverse', '#FFFFFF')} />
            </svg>
          </span>
          <h1
            id={titleId}
            style={{
              margin: 0,
              flex: 1,
              fontSize: 20,
              lineHeight: '24px',
              fontWeight: 600,
              letterSpacing: '-0.003em',
              color: token('color.text', '#292A2E'),
            }}
          >
            {title}
          </h1>
        </div>

        {/* Body */}
        <div style={{ padding: '0 24px 16px' }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: '20px',
              color: token('color.text', '#292A2E'),
            }}
          >
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
                  color: token('color.text', '#292A2E'),
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
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '8px 24px 20px',
          }}
        >
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
        </div>
      </div>
    </div>,
    document.body,
  );
}
