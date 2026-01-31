/**
 * Caty AI V7 — Message Component
 */

import React from 'react';
import { CatyMessage } from './types';
import { HubIcon } from './constants';

interface CatyMessageProps {
  message: CatyMessage;
  userInitials?: string;
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return `Today, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const CatyMessageComponent: React.FC<CatyMessageProps> = ({ message, userInitials = 'VK' }) => (
  <div className={`caty-message ${message.type}`}>
    <div className={`caty-avatar ${message.type}`}>
      {message.type === 'assistant' ? <HubIcon /> : userInitials}
    </div>
    <div className="caty-msg-body">
      {message.isHtml ? (
        <div dangerouslySetInnerHTML={{ __html: message.content }} />
      ) : (
        <div className="caty-bubble">
          <p>{message.content}</p>
        </div>
      )}
      <span className="caty-msg-time">{formatTime(message.timestamp)}</span>
    </div>
  </div>
);
