/**
 * Caty AI V7 — History Panel
 */

import React from 'react';
import { CatySession } from './types';

interface CatyHistoryPanelProps {
  isOpen: boolean;
  sessions: CatySession[];
  onClose: () => void;
  onLoad: (sessionId: string) => void;
  onClear: () => void;
}

const getPreview = (session: CatySession) => {
  const lastUserMsg = session.messages.filter(m => m.type === 'user').pop();
  const text = lastUserMsg?.content.replace(/<[^>]*>/g, '') || 'No messages';
  return text.substring(0, 50) + (text.length > 50 ? '...' : '');
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const CatyHistoryPanel: React.FC<CatyHistoryPanelProps> = ({
  isOpen,
  sessions,
  onClose,
  onLoad,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="caty-history">
      <div className="caty-history-header">
        <h2>Conversation History</h2>
        <button className="caty-close-btn" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>
      <div className="caty-history-list">
        {sessions.length === 0 ? (
          <div className="caty-history-empty">No previous conversations</div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              className="caty-history-item"
              onClick={() => onLoad(session.id)}
              tabIndex={0}
              role="button"
            >
              <div className="caty-history-title">{session.context.department}</div>
              <div className="caty-history-preview">{getPreview(session)}</div>
              <div className="caty-history-date">{formatDate(session.updated)}</div>
            </div>
          ))
        )}
      </div>
      <div className="caty-history-actions">
        <button onClick={onClear}>Clear All History</button>
      </div>
    </div>
  );
};
