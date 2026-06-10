/**
 * ConversationEmptyState — displayed when conversation opened but zero messages.
 *
 * Content: icon + heading + subtext + CTA button
 * CTA focuses the MessageComposer textarea so user can start typing immediately.
 *
 * Not shown when: messages exist (even if paginated load, > 50 items).
 */
import React from 'react';
import Button from '@atlaskit/button/new';
import CommentIcon from '@atlaskit/icon/glyph/comment';

export interface ConversationEmptyStateProps {
  onStartConversation?: () => void;
}

export function ConversationEmptyState({ onStartConversation }: ConversationEmptyStateProps) {
  return (
    <div className="cc-empty-state">
      <div className="cc-empty-state__icon">
        <CommentIcon label="No messages" size="large" />
      </div>
      <h2 className="cc-empty-state__heading">No messages yet</h2>
      <p className="cc-empty-state__subtext">Be the first to message</p>
      <Button appearance="primary" onClick={onStartConversation}>
        Send first message
      </Button>
    </div>
  );
}

export default ConversationEmptyState;
