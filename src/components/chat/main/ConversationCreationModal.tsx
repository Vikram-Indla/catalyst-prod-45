/**
 * ConversationCreationModal — stub for starting a new 1-on-1 or group conversation.
 *
 * Spec (2026-06-10):
 * - Modal overlay with two options: "1-on-1 conversation" and "Group conversation"
 * - Each option has an icon + description
 * - Close button (X or Escape)
 * - Fires onSelectKind('dm' | 'group') on selection
 *
 * Full implementation scope: people picker for DMs, group name + member picker for groups.
 * Current: modal shell with stub handlers.
 */
import React from 'react';

export interface ConversationCreationModalProps {
  onSelectKind: (kind: 'dm' | 'group') => void;
  onClose: () => void;
}

export function ConversationCreationModal({
  onSelectKind,
  onClose,
}: ConversationCreationModalProps) {
  return (
    <div className="cc-modal-overlay" onClick={onClose}>
      <div className="cc-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal-header">
          <h2 className="cc-modal-title">Start a conversation</h2>
          <button
            type="button"
            className="cc-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="cc-modal-body">
          {/* Option 1: Direct Message */}
          <button
            type="button"
            className="cc-modal-option"
            onClick={() => onSelectKind('dm')}
          >
            <div className="cc-modal-option__icon">
              <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="cc-modal-option__content">
              <div className="cc-modal-option__title">1-on-1 conversation</div>
              <div className="cc-modal-option__desc">Chat with a single person</div>
            </div>
            <div className="cc-modal-option__arrow">→</div>
          </button>

          {/* Option 2: Group Conversation */}
          <button
            type="button"
            className="cc-modal-option"
            onClick={() => onSelectKind('group')}
          >
            <div className="cc-modal-option__icon">
              <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="cc-modal-option__content">
              <div className="cc-modal-option__title">Group conversation</div>
              <div className="cc-modal-option__desc">Chat with multiple people</div>
            </div>
            <div className="cc-modal-option__arrow">→</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConversationCreationModal;
