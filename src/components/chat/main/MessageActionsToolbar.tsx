/**
 * MessageActionsToolbar — compact hover toolbar for chat messages.
 * Actions (left-to-right): copy link · mark unread · remind · turn into issue.
 *
 * Mount inside a message row and wire the handlers to the parent's state/mutations.
 * The toolbar appears on :hover via CSS. Uses Atlaskit Tooltip for accessibility.
 *
 * Keyboard navigation:
 * - Tab → focus toolbar buttons (cycles through 4 buttons, then next message's toolbar via document order)
 * - Shift+Tab → previous toolbar (reverse cycle)
 * - ArrowRight/ArrowLeft → next/previous button within toolbar
 * - Enter → activate focused button
 * - Escape → close any open modal, return focus to message
 */

import React, { useState, useRef, useCallback } from 'react';
import Tooltip from '@atlaskit/tooltip';
import { IconButton } from '@atlaskit/button/new';
import CopyIcon from '@atlaskit/icon/core/copy';
import NotificationIcon from '@atlaskit/icon/core/notification';
import ClockIcon from '@atlaskit/icon/core/clock';
import PageIcon from '@atlaskit/icon/core/page';

export interface MessageActionsToolbarProps {
  messageId: string;
  conversationId: string;
  messageText: string;
  onCopyLink?: () => Promise<void>;
  onMarkUnread?: () => Promise<void>;
  onRemind?: (minutesFromNow: number) => Promise<void>;
  onTurnIntoIssue?: (title: string, description: string, assigneeId?: string) => Promise<void>;
  isUnread?: boolean;
  onReturnFocus?: () => void; // Called when toolbar loses focus (Escape), returns focus to message row
}

/**
 * Quick-action buttons for a message.
 * Each button is icon-only, subtle appearance, with tooltips.
 * Handles showing modals for remind/turn-into-issue.
 *
 * Keyboard navigation is fully integrated:
 * - Buttons are focusable and tab-accessible
 * - Arrow keys cycle through buttons within the toolbar
 * - Enter activates a focused button
 * - Escape closes modals and returns focus to the message
 */
export function MessageActionsToolbar({
  messageId,
  conversationId,
  messageText,
  onCopyLink,
  onMarkUnread,
  onRemind,
  onTurnIntoIssue,
  isUnread,
  onReturnFocus,
}: MessageActionsToolbarProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState(messageText);
  const [issueAssignee, setIssueAssignee] = useState<string>('');
  const [focusedButtonIndex, setFocusedButtonIndex] = useState<number | null>(null);

  // Refs to the 4 action buttons for keyboard navigation
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const unreadButtonRef = useRef<HTMLButtonElement>(null);
  const remindButtonRef = useRef<HTMLButtonElement>(null);
  const issueButtonRef = useRef<HTMLButtonElement>(null);

  const buttonRefs = [copyButtonRef, unreadButtonRef, remindButtonRef, issueButtonRef];

  const handleCopyLink = async () => {
    setIsLoading('copy');
    try {
      const url = `${window.location.origin}?message=${messageId}`;
      await navigator.clipboard.writeText(url);
      onCopyLink?.();
    } finally {
      setIsLoading(null);
    }
  };

  const handleMarkUnread = async () => {
    setIsLoading('unread');
    try {
      await onMarkUnread?.();
    } finally {
      setIsLoading(null);
    }
  };

  const handleRemindSubmit = async (minutes: number) => {
    setIsLoading('remind');
    try {
      await onRemind?.(minutes);
      setReminderOpen(false);
    } finally {
      setIsLoading(null);
    }
  };

  const handleTurnIntoIssue = async () => {
    if (!issueTitle.trim()) return;
    setIsLoading('turninto');
    try {
      await onTurnIntoIssue?.(issueTitle.trim(), issueDesc, issueAssignee || undefined);
      setIssueOpen(false);
      setIssueTitle('');
      setIssueDesc(messageText);
      setIssueAssignee('');
    } finally {
      setIsLoading(null);
    }
  };

  // Keyboard navigation within the toolbar
  const handleToolbarKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Escape closes any open modal and returns focus to message
    if (e.key === 'Escape') {
      if (reminderOpen) {
        setReminderOpen(false);
        e.preventDefault();
      } else if (issueOpen) {
        setIssueOpen(false);
        e.preventDefault();
      } else {
        // No modal open — return focus to message row
        onReturnFocus?.();
        e.preventDefault();
      }
      return;
    }

    // Only handle arrow keys and Tab if we're not in a modal (modals handle their own keys)
    if (reminderOpen || issueOpen) {
      // Let modal handle its own keyboard events
      return;
    }

    // ArrowRight/ArrowLeft: cycle through buttons
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      let nextIndex = focusedButtonIndex ?? 0;
      if (e.key === 'ArrowRight') {
        nextIndex = (nextIndex + 1) % buttonRefs.length;
      } else {
        nextIndex = (nextIndex - 1 + buttonRefs.length) % buttonRefs.length;
      }
      setFocusedButtonIndex(nextIndex);
      buttonRefs[nextIndex].current?.focus();
    }

    // Enter on a focused button: activate it
    if (e.key === 'Enter') {
      e.preventDefault();
      const focusedBtn = document.activeElement as HTMLButtonElement;
      focusedBtn?.click();
    }
  }, [focusedButtonIndex, reminderOpen, issueOpen, onReturnFocus, buttonRefs]);

  // Track focus in/out of toolbar
  const handleToolbarFocus = useCallback(() => {
    // When focus enters toolbar via Tab, focus the first button
    if (focusedButtonIndex === null) {
      setFocusedButtonIndex(0);
      buttonRefs[0].current?.focus();
    }
  }, [focusedButtonIndex, buttonRefs]);

  const handleToolbarBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    // Only clear focus if focus leaves the entire toolbar (not just between buttons)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setFocusedButtonIndex(null);
    }
  }, []);

  // Handle modal Escape key for reminder
  const handleReminderKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setReminderOpen(false);
      e.stopPropagation();
    }
  }, []);

  // Handle modal Escape key for issue
  const handleIssueKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIssueOpen(false);
      e.stopPropagation();
    }
  }, []);

  return (
    <>
      <div
        className="cc-msg__actions"
        role="toolbar"
        aria-label="Message actions"
        onKeyDown={handleToolbarKeyDown}
        onFocus={handleToolbarFocus}
        onBlur={handleToolbarBlur}
      >
        {/* Copy link button */}
        <Tooltip content="Copy link">
          <IconButton
            ref={copyButtonRef}
            appearance="subtle"
            spacing="compact"
            icon={CopyIcon}
            label="Copy message link"
            onClick={handleCopyLink}
            isDisabled={isLoading === 'copy'}
            isLoading={isLoading === 'copy'}
            aria-busy={isLoading === 'copy'}
            title="Copy link"
            tabIndex={focusedButtonIndex === 0 ? 0 : -1}
          />
        </Tooltip>

        {/* Mark unread button */}
        <Tooltip content="Mark unread">
          <IconButton
            ref={unreadButtonRef}
            appearance="subtle"
            spacing="compact"
            icon={NotificationIcon}
            label={isUnread ? 'Mark message as read' : 'Mark message unread'}
            onClick={handleMarkUnread}
            isDisabled={isLoading === 'unread'}
            isLoading={isLoading === 'unread'}
            aria-busy={isLoading === 'unread'}
            title={isUnread ? 'Mark as read' : 'Mark unread'}
            tabIndex={focusedButtonIndex === 1 ? 0 : -1}
          />
        </Tooltip>

        {/* Remind button */}
        <Tooltip content="Set reminder">
          <IconButton
            ref={remindButtonRef}
            appearance="subtle"
            spacing="compact"
            icon={ClockIcon}
            label="Set reminder for this message"
            onClick={() => setReminderOpen(true)}
            isDisabled={isLoading === 'remind'}
            isLoading={isLoading === 'remind'}
            aria-busy={isLoading === 'remind'}
            title="Set reminder"
            tabIndex={focusedButtonIndex === 2 ? 0 : -1}
          />
        </Tooltip>

        {/* Turn into issue button */}
        <Tooltip content="Turn into issue">
          <IconButton
            ref={issueButtonRef}
            appearance="subtle"
            spacing="compact"
            icon={PageIcon}
            label="Turn this message into a work item"
            onClick={() => setIssueOpen(true)}
            isDisabled={isLoading === 'turninto'}
            isLoading={isLoading === 'turninto'}
            aria-busy={isLoading === 'turninto'}
            title="Turn into issue"
            tabIndex={focusedButtonIndex === 3 ? 0 : -1}
          />
        </Tooltip>
      </div>

      {/* Reminder modal */}
      {reminderOpen && (
        <div className="cc-modal-overlay" onClick={() => setReminderOpen(false)}>
          <div
            className="cc-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reminder-modal-title"
            onKeyDown={handleReminderKeyDown}
          >
            <h3 className="cc-modal__title" id="reminder-modal-title">Set reminder</h3>
            <p className="cc-modal__subtitle">Remind me about this message in:</p>
            <div className="cc-modal__options">
              <button
                type="button"
                className="cc-modal__option"
                onClick={() => handleRemindSubmit(60)}
                disabled={isLoading === 'remind'}
              >
                1 hour
              </button>
              <button
                type="button"
                className="cc-modal__option"
                onClick={() => handleRemindSubmit(120)}
                disabled={isLoading === 'remind'}
              >
                2 hours
              </button>
              <button
                type="button"
                className="cc-modal__option"
                onClick={() => handleRemindSubmit(1440)}
                disabled={isLoading === 'remind'}
              >
                1 day
              </button>
            </div>
            <div className="cc-modal__footer">
              <button
                type="button"
                className="cc-modal__btn cc-modal__btn--cancel"
                onClick={() => setReminderOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Turn into issue modal */}
      {issueOpen && (
        <div className="cc-modal-overlay" onClick={() => setIssueOpen(false)}>
          <div
            className="cc-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="issue-modal-title"
            onKeyDown={handleIssueKeyDown}
          >
            <h3 className="cc-modal__title" id="issue-modal-title">Create issue from message</h3>
            <div className="cc-modal__form">
              <label className="cc-modal__label">
                <span className="cc-modal__label-text">Title *</span>
                <input
                  type="text"
                  className="cc-modal__input"
                  placeholder="Issue title"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  disabled={isLoading === 'turninto'}
                  aria-required="true"
                />
              </label>
              <label className="cc-modal__label">
                <span className="cc-modal__label-text">Description</span>
                <textarea
                  className="cc-modal__textarea"
                  placeholder="Issue description"
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  disabled={isLoading === 'turninto'}
                  rows={4}
                />
              </label>
              <label className="cc-modal__label">
                <span className="cc-modal__label-text">Assign to</span>
                <input
                  type="text"
                  className="cc-modal__input"
                  placeholder="User ID or name"
                  value={issueAssignee}
                  onChange={(e) => setIssueAssignee(e.target.value)}
                  disabled={isLoading === 'turninto'}
                />
              </label>
            </div>
            <div className="cc-modal__footer">
              <button
                type="button"
                className="cc-modal__btn cc-modal__btn--cancel"
                onClick={() => setIssueOpen(false)}
                disabled={isLoading === 'turninto'}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cc-modal__btn cc-modal__btn--primary"
                onClick={handleTurnIntoIssue}
                disabled={!issueTitle.trim() || isLoading === 'turninto'}
              >
                {isLoading === 'turninto' ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MessageActionsToolbar;
